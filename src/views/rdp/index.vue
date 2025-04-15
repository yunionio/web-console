<template>
  <div class="rdp-container">
    <div>
      <div class="header p-2 text-center" :class="socketTips.type" style="position: relative;">
        <span class="secret-level" v-if="secretText">{{ secretText }}</span>{{ instanceName }}{{ socketTips.message }}
        <a-button @click="doClickHandle()" class="ctrl-alt-delete-btn">Ctrl-Alt-Delete</a-button>
      </div>
    </div>
    <div id="display-wrapper" class="rdp-wrapper">
      <div ref="viewport" class="viewport">
        <!-- tabindex allows for div to be focused -->
        <div ref="display" class="display" tabindex="0" />
      </div>
    </div>
  </div>
</template>

<!-- eslint-disable camelcase -->
<script>
import Guacamole from 'guacamole-common-js'
import GuacMouse from './libs/GuacMouse'
import states from './libs/states'
import clipboard from './libs/clipboard'
import { addWaterMark } from '../../utils/watermark'
import { debounce } from '../../utils/base'
import { getConnectParams } from '@utils/auth'

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
      arguments: {},
      socketTips: {
        type: 'info',
        message: this.$t('connection.ing')
      },
      connectParams: {}
    }
  },
  computed: {
    instanceName () {
      let name = ''
      const { instance_name: instanceName, ips } = this.connectParams
      if (instanceName) {
        name += instanceName
      }
      if (ips) {
        name += ` (${ips}) `
      }
      return name
    },
    secretText () {
      const { secret_level } = this.connectParams
      if (secret_level) {
        const str = 'secret_level.' + secret_level
        return this.$te(str) ? this.$t(str) : null
      }
      return null
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
      const query = getConnectParams(this)
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
    resize () {
      const elm = this.$refs.viewport
      if (!elm || !elm.offsetWidth) {
        // resize is being called on the hidden window
        return
      }

      const width = window.innerWidth
      const height = window.innerHeight - 37
      const heightScale = height / this.display.getHeight()
      const widthScale = width / this.display.getWidth()
      const minScale = widthScale < heightScale ? widthScale : heightScale

      this.client.sendSize(width, height)
      this.display.scale(minScale)
    },
    startGuacamole () {
      const url = `wss://${this.host}:${this.port}/connect/`
      const tunnel = new Guacamole.WebSocketTunnel(url)

      const resize = debounce(() => {
        this.resize()
      }, 500)

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
        // const key = 'message'
        switch (clientState) {
          case 0:
            this.connectionState = states.IDLE
            // message.destroy(key)
            // message.loading({ content: '正在初始化中...', duration: 0, key: key })
            break
          case 1:
            // message.destroy(key)
            // message.loading({ content: '正在努力连接中...', duration: 0, key: key })
            break
          case 2:
            this.connectionState = states.WAITING
            // message.destroy(key)
            // message.loading({ content: '正在等待服务器响应...', duration: 0, key: key })
            break
          case 3:
            this.connectionState = states.CONNECTED
            // message.destroy(key)
            // message.success({ content: '连接成功', duration: 3, key: key })
            this.socketTips.type = 'success'
            this.socketTips.message = this.$t('connection.success')
            window.addEventListener('resize', resize)
            this.$refs.viewport.addEventListener('mouseenter', resize)

            clipboard.setRemoteClipboard(this.client)
            this.initWaterMark()
            this.changeTitle(this.connectParams.ips)
            // eslint-disable-next-line no-fallthrough
          case 4:
            break
          case 5:
            // disconnected, disconnecting
            // message.info({ content: '连接已关闭', duration: 3, key: key })
            this.socketTips.type = 'error'
            this.socketTips.message = this.$t('connection.disconnect')
            window.onbeforeunload = null
            break
        }
      }

      this.client.onerror = error => {
        this.client.disconnect()
        // eslint-disable-next-line no-console
        // message.error(`Client error ${JSON.stringify(error)}`)
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
        resize()
        displayElm.focus()
      }, 1500) // $nextTick wasn't enough
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
    },
    initWaterMark () {
      if (this.connectParams.water_mark) {
        addWaterMark({
          targetDom: document.getElementById('display-wrapper'),
          text: this.connectParams.water_mark,
          wrapperStyle: {
            top: '40px'
          }
        })
      }
    },
    changeTitle: function (title) {
      if (!title) return
      document.title = title
    },
    doClickHandle () {
      this.client.sendKeyEvent(1, 0xFFE3) // Ctrl
      this.client.sendKeyEvent(1, 0xFFE9) // Alt
      this.client.sendKeyEvent(1, 0xFFFF) // Delete
    }
  }
}
</script>

<style lang="scss" scoped>
.rdp-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
}
.header {
  color: #fff;
  &.info {
    background-color: #909399;
    color: #000;
    .secret-level {
      color: red;
    }
  }
  &.success {
    background-color: #67C23A;
    color: #fff;
    .secret-level {
      color: red;
    }
  }
  &.error {
    background-color: #F56C6C;
    color: #fff;
    .secret-level {
      color: #6cf5dc;
    }
  }
}
.rdp-wrapper {
  margin: 0 auto;
}
.viewport {
  width: 100%;
  height: 100%;
}
.display {
  overflow: hidden;
  width: 100vw;
  height: 100vh;
}
.ctrl-alt-delete-btn {
  position: absolute;
  right: 10px;
  top: 2px;
}
.secret-level {
  position: absolute;
  left: 10px;
}
</style>
