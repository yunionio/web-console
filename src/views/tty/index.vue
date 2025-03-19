<template>
  <div class="content d-flex flex-column">
    <div class="header p-2 text-center" :class="socketTips.type" style="position: relative;">
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
import io from 'socket.io-client'

const debug = require('debug')('app:ssh')

export default {
  name: 'TTYWebConsole',
  data () {
    return {
      loading: false,
      socketTips: {
        type: 'info',
        message: this.$t('connection.ing')
      },
      connectParams: {},
      socket: {}
    }
  },
  computed: {
    instanceName () {
      let name = ''
      const { instance_name: instanceName, ips } = this.connectParams
      const { instanceName: instanceName2, ips: ips2 } = this.$route.query
      if (instanceName || instanceName2) {
        name += (instanceName || instanceName2)
      }
      if (ips || ips2) {
        name += ` (${ips || ips2}) `
      }
      return name
    },
    secretText () {
      const { secret_level } = this.connectParams
      const { secret_level: secret_level2 } = this.$route.query
      if (secret_level || secret_level2) {
        const str = 'secret_level.' + (secret_level || secret_level2)
        return this.$te(str) ? this.$t(str) : null
      }
      return null
    }
  },
  created () {
    this.getWebConsoleInfo()
  },
  beforeDestroy () {
    this._socketClose()()
  },
  methods: {
    initTerminal () {
      this.socket = io(this.connectParams.api_server || this.$route.query.api_server, {
        transports: ['websocket'],
        path: '/connect',
        query: {
          access_token: this.connectParams.access_token || this.$route.query.access_token
        }
      })
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
        this.socket.emit('resize', [size.cols, size.rows])
      })
      term.onData(data => this.socket.emit('input', data))
      // term.onKey((val, domEvent) => {
      //   domEvent.preventDefault()
      // })
      term.onTitleChange((val) => {
        if (val) {
          document.title = val
        }
      })
      this.socket.on('output', arrayBuffer => {
        term.write(arrayBuffer)
      })
      this._registerSocketEvents()
      window.addEventListener('resize', () => {
        fitAddon.fit()
      })
      fitAddon.fit()
    },
    _registerSocketEvents () {
      /**
       * // connect：连接成功
       * connecting：正在连接
       * disconnect：断开连接
       * connect_error：连接失败
       * error：错误发生，并且无法被其他事件类型所处理
       * message：同服务器端message事件
       * anything：同服务器端anything事件
       * reconnect_error：重连失败
       * reconnect：成功重连
       * reconnecting：正在重连
       */
      this.socket.on('connect', () => {
        debug('connect')
        this.socketTips.type = 'success'
        this.socketTips.message = this.$t('connection.success')
        this.changeTitle(this.connectParams.ips || this.$route.query.ips)
      })
      this.socket.on('connecting', () => {
        debug('connecting')
        this.socketTips.type = 'info'
        this.socketTips.message = this.$t('connection.ing')
      })
      this.socket.on('disconnect', () => {
        debug('disconnect')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.disconnect')
        window.onbeforeunload = null
        this._socketClose()
      })
      this.socket.on('connect_error', () => {
        debug('connect_error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.fail')
        window.onbeforeunload = null
      })
      this.socket.on('error', () => {
        debug('error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.abnormal')
        window.onbeforeunload = null
      })
      this.socket.on('reconnect_error', () => {
        debug('reconnect_error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.reconnection_fail')
        window.onbeforeunload = null
      })
      this.socket.on('reconnect', () => {
        debug('success')
        this.socketTips.type = 'success'
        this.socketTips.message = this.$t('connection.reconnection_success')
      })
      this.socket.on('reconnecting', () => {
        debug('reconnecting')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.reconnection_ing')
      })
    },
    _socketClose () {
      return () => {
        debug('Connection lose!!!')
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
