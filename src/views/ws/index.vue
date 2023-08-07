<template>
  <div class="content d-flex flex-column">
    <div class="header p-2 text-center" :class="socketTips.type">
      {{ instanceName }}{{ socketTips.message }}
    </div>
    <div id="xterm-wrapper" class="xterm flex-fill" ref="xterm"></div>
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'
import { Terminal } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'
import 'xterm/src/xterm.css'
import { addWaterMark } from '../../utils/watermark'

const debug = require('debug')('app:ssh')

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

export default {
  name: 'WebConsole',
  data () {
    return {
      loading: false,
      socketTips: {
        type: 'info',
        message: this.$t('connection.ing')
      },
      host: '',
      port: '',
      connectParams: {},
      socket: {}
    }
  },
  computed: {
    instanceName () {
      let name = ''
      const { instanceName, ips } = this.$route.query
      if (instanceName) {
        name += instanceName
      }
      if (ips) {
        name += ` (${ips}) `
      }
      return name
    }
  },
  created () {
    this.getWebConsoleInfo()
  },
  beforeDestroy () {
    this._socketClose(true)()
  },
  methods: {
    async initTerminal () {
      Terminal.applyAddon(fit)
      const url = `wss://${this.host}:${this.port}/connect/?access_token=${this.connectParams.access_token}&EIO=3&transport=websocket`
      this.socket = new WebSocket(url)
      const term = new Terminal({
        cols: 80,
        rows: 24,
        ScrollBar: true
      })
      const terminalDom = this.$refs.xterm
      term.open(terminalDom)
      term.focus()
      term.on('resize', size => {
        if (this.socket.readyState !== 1 && this.socket.readyState !== 2) return
        this.socket.send(JSON.stringify({
          type: 'resize',
          data: {
            cols: size.cols,
            rows: size.rows
          }
        }))
      })
      term.on('data', data => {
        this.socket.send(JSON.stringify({
          type: 'input',
          data: {
            data
          }
        }))
      })
      term.on('keypress', (val, e) => {
        e.preventDefault()
      })
      term.on('title', (val) => {
        if (val) {
          document.title = val
        }
      })
      this.socket.onmessage = (ev) => {
        const blob = ev.data
        const reader = new FileReader()
        reader.onload = function () {
          term.write(this.result)
        }
        reader.readAsText(blob)
      }
      this._registerSocketEvents(term)
      window.addEventListener('resize', () => {
        term.fit()
      })
      term.fit()
    },
    _registerSocketEvents (term) {
      this.socket.onopen = () => {
        this.socketTips.type = 'success'
        this.socketTips.message = this.$t('connection.success')
        this.changeTitle(this.$route.query.ips)
        this.socket.send(JSON.stringify({
          type: 'resize',
          data: {
            cols: term.cols,
            rows: term.rows
          }
        }))
        this.initWaterMark()
      }
      this.socket.onclose = () => {
        debug('disconnect')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.disconnect')
        this._socketClose(false)
      }
      this.socket.onerror = () => {
        debug('error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.abnormal')
      }
    },
    _socketClose (sendClose) {
      return () => {
        debug('Connection lose!!!')
        if (sendClose) {
          this.socket.send(JSON.stringify({
            type: 'close'
          }))
        }
        this.socket.close()
      }
    },
    getWebConsoleInfo () {
      let query = this.$route.query
      if (query.data) {
        query = {
          ...qs.parse(Base64.decode(query.data)),
          ...query
        }
      }
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
        this.initTerminal()
      })
    },
    changeTitle: function (title) {
      if (!title) return
      document.title = title
    },
    initWaterMark () {
      if (this.connectParams.waterMark) {
        addWaterMark({
          targetDom: document.getElementById('xterm-wrapper'),
          text: this.connectParams.waterMark,
          wrapperStyle: {
            top: '40px'
          }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
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
