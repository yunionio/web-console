<template>
  <div class="content d-flex flex-column">
    <div class="header p-2 text-center" :class="socketTips.type" style="position:relative">
      <span class="secret-level" v-if="secretText">{{ secretText }}</span>{{ instanceName }}{{ socketTips.message }}
    </div>
    <div class="xterm flex-fill" ref="xterm"></div>
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

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
  created () {
    this.getWebConsoleInfo()
  },
  beforeDestroy () {
    this._socketClose(true)()
  },
  methods: {
    async initTerminal () {
      const url = `wss://${this.host}:${this.port}/connect/?access_token=${this.connectParams.access_token}&EIO=3&transport=websocket`
      this.socket = new WebSocket(url)
      const term = new Terminal({
        cols: 80,
        rows: 24,
        ScrollBar: true
      })
      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      const terminalDom = this.$refs.xterm
      term.open(terminalDom)
      term.focus()
      term.onResize(size => {
        if (this.socket.readyState !== 1 && this.socket.readyState !== 2) return
        this.socket.send(JSON.stringify({
          type: 'resize',
          data: {
            cols: size.cols,
            rows: size.rows
          }
        }))
      })
      term.onData(data => {
        this.socket.send(JSON.stringify({
          type: 'input',
          data: {
            data
          }
        }))
      })
      // term.onKey((val, domEvent) => {
      //   domEvent.preventDefault()
      // })
      term.onTitleChange((val) => {
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
        fitAddon.fit()
      })
      fitAddon.fit()
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
.secret-level {
  position: absolute;
  left: 10px;
}
</style>
