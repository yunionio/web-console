<template>
  <div ref="viewport" class="viewport">
    <!-- tabindex allows for div to be focused -->
    <div ref="display" class="display" tabindex="0" />
  </div>
</template>

<!-- eslint-disable camelcase -->
<script>
import { Base64 } from 'js-base64'
import qs from 'qs'
import Guacamole from 'guacamole-common-js'
import GuacMouse from './libs/GuacMouse'
import states from './libs/states'
import clipboard from './libs/clipboard'
import { message } from 'ant-design-vue'

Guacamole.Mouse = GuacMouse.mouse

const debug = require('debug')('app:ssh')

function serialize (obj) {
  const str = []
  for (const p in obj) {
    if (obj[p]) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
    }
  }
  return str.join('&')
}

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

export default {
  name: 'RdpConnect',
  data () {
    return {
      loading: false,
      connected: false,
      display: null,
      currentAdjustedHeight: null,
      client: null,
      keyboard: null,
      mouse: null,
      lastEvent: null,
      connectionState: states.IDLE,
      errorMessage: '',
      arguments: {}
    }
  },
  watch: {
    connectionState (state) {
      console.log('success!!!')
    }
  },
  created () {
    this.getWebConsoleInfo()
  },
  beforeDestroy () {
    this._socketClose(true)()
  },
  methods: {
    getWebConsoleInfo () {
      let query = this.$route.query
      if (query.data) {
        query = {
          ...qs.parse(Base64.decode(query.data)),
          ...query
        }
      }
      console.log(query)
      this.connectParams = query
      if (query.api_server.includes('//')) {
        this.host = query.api_server.slice(query.api_server.indexOf('//') + 2) // 去掉双划线
      } else {
        this.host = query.api_server
      }
      if (hadPort(this.host)) {
        this.port = this.host.slice(this.host.indexOf(':') + 1) // 去掉:
        this.host = this.host.slice(0, this.host.indexOf(':'))
      } else {
        this.port = query.api_server.indexOf('https') === 0 ? 443 : 80
      }
      this.$nextTick(() => {
        this.doGuacdConnect()
      })
    },
    doGuacdConnect () {
      this._setScreenSize()
      this.startGuacamole()
    },
    send (cmd) {
      if (!this.client) {
        return
      }
      for (const c of cmd.data) {
        this.client.sendKeyEvent(1, c.charCodeAt(0))
      }
    },
    copy (cmd) {
      if (!this.client) {
        return
      }
      clipboard.cache = {
        type: 'text/plain',
        data: cmd.data
      }
      clipboard.setRemoteClipboard(this.client)
    },
    handleMouseState (mouseState) {
      const scaledMouseState = Object.assign({}, mouseState, {
        x: mouseState.x / this.display.getScale(),
        y: mouseState.y / this.display.getScale()
      })
      this.client.sendMouseState(scaledMouseState)
    },
    _setScreenSize () {
      const elm = this.$refs.viewport
      if (!elm || !elm.offsetWidth) {
        // resize is being called on the hidden window
        return
      }
      const pixelDensity = window.devicePixelRatio || 1
      const width = elm.clientWidth * pixelDensity
      const height = elm.clientHeight * pixelDensity
      this.query.screen_height = height
      this.query.screen_width = width
    },
    resize () {
      const elm = this.$refs.viewport
      if (!elm || !elm.offsetWidth) {
        // resize is being called on the hidden window
        return
      }

      const pixelDensity = window.devicePixelRatio || 1
      const width = elm.clientWidth * pixelDensity
      const height = elm.clientHeight * pixelDensity
      if (this.display.getWidth() !== width || this.display.getHeight() !== height) {
        this.client.sendSize(width, height)
      }
      // setting timeout so display has time to get the correct size
      setTimeout(() => {
        const scale = Math.min(
          elm.clientWidth / Math.max(this.display.getWidth(), 1),
          elm.clientHeight / Math.max(this.display.getHeight(), 1)
        )
        this.display.scale(scale)
      }, 100)
    },
    startGuacamole () {
      const url = `wss://${this.host}:${this.port}/connect/`
      const tunnel = new Guacamole.WebSocketTunnel(url)

      if (this.client) {
        this.display.scale(0)
        this.uninstallKeyboard()
      }

      this.client = new Guacamole.Client(tunnel)
      clipboard.install(this.client)

      tunnel.onerror = status => {
        // eslint-disable-next-line no-console
        console.error(`Tunnel failed ${JSON.stringify(status)}`)
        this.connectionState = states.TUNNEL_ERROR
      }

      tunnel.onstatechange = state => {
        switch (state) {
          // Connection is being established
          case Guacamole.Tunnel.State.CONNECTING:
            this.connectionState = states.CONNECTING
            break

            // Connection is established / no longer unstable
          case Guacamole.Tunnel.State.OPEN:
            this.connectionState = states.CONNECTED
            break

            // Connection is established but misbehaving
          case Guacamole.Tunnel.State.UNSTABLE:
            // TODO
            debug('不稳定')
            break

            // Connection has closed
          case Guacamole.Tunnel.State.CLOSED:
            this.connectionState = states.DISCONNECTED
            break
        }
      }

      this.client.onstatechange = clientState => {
        switch (clientState) {
          case 0:
            this.connectionState = states.IDLE
            break
          case 1:
            // connecting ignored for some reason?
            break
          case 2:
            this.connectionState = states.WAITING
            break
          case 3:
            this.connectionState = states.CONNECTED
            window.addEventListener('resize', this.resize)
            this.$refs.viewport.addEventListener('mouseenter', this.resize)

            clipboard.setRemoteClipboard(this.client)

            // eslint-disable-next-line no-fallthrough
          case 4:
          case 5:
            // disconnected, disconnecting
            break
        }
      }

      this.client.onerror = error => {
        this.client.disconnect()
        // eslint-disable-next-line no-console
        message.error(`Client error ${JSON.stringify(error)}`)
        this.errorMessage = error.message
        this.connectionState = states.CLIENT_ERROR
      }

      this.client.onsync = () => {
      }

      // Test for argument mutability whenever an argument value is received
      this.client.onargv = (stream, mimetype, name) => {
        if (mimetype !== 'text/plain') { return }

        const reader = new Guacamole.StringReader(stream)

        // Assemble received data into a single string
        let value = ''
        reader.ontext = text => {
          value += text
        }

        // Test mutability once stream is finished, storing the current value for the argument only if it is mutable
        reader.onend = () => {
          const stream = this.client.createArgumentValueStream('text/plain', name)
          stream.onack = status => {
            if (status.isError()) {
              // ignore reject
              return
            }
            this.arguments[name] = value
          }
        }
      }

      this.client.onclipboard = clipboard.onClipboard
      this.display = this.client.getDisplay()
      const displayElm = this.$refs.display
      displayElm.appendChild(this.display.getElement())
      displayElm.addEventListener('contextmenu', e => {
        e.stopPropagation()
        if (e.preventDefault) {
          e.preventDefault()
        }
        e.returnValue = false
      })
      const query = {
        access_token: this.connectParams.access_token
      }
      const param = serialize(query)
      this.client.connect(param)
      window.onunload = () => this.client.disconnect()

      this.mouse = new Guacamole.Mouse(displayElm)
      // Hide software cursor when mouse leaves display
      this.mouse.onmouseout = () => {
        if (!this.display) return
        this.display.showCursor(false)
      }

      // allows focusing on the display div so that keyboard doesn't always go to session
      displayElm.onclick = () => {
        displayElm.focus()
      }
      displayElm.onfocus = () => {
        displayElm.className = 'focus'
      }
      displayElm.onblur = () => {
        displayElm.className = ''
      }

      this.keyboard = new Guacamole.Keyboard(displayElm)
      this.installKeyboard()
      this.mouse.onmousedown = this.mouse.onmouseup = this.mouse.onmousemove = this.handleMouseState
      setTimeout(() => {
        this.resize()
        displayElm.focus()
      }, 1000) // $nextTick wasn't enough
    },
    installKeyboard () {
      this.keyboard.onkeydown = keysym => {
        this.client.sendKeyEvent(1, keysym)
      }
      this.keyboard.onkeyup = keysym => {
        this.client.sendKeyEvent(0, keysym)
      }
    },
    uninstallKeyboard () {
      this.keyboard.onkeydown = this.keyboard.onkeyup = () => {
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.viewport {
  width: 100vw;
  height: 100vh;
}
.content {
  height: 100%;
  background-color: #000;
  color: #fff;
}
.header {
  color: #fff;
  &.info {
    background-color: #909399;
    color: #000;
  }
  &.success {
    background-color: #67C23A;
    color: #fff;
  }
  &.error {
    background-color: #F56C6C;
    color: #fff;
  }
}
</style>
