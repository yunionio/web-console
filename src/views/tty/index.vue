<template>
  <div class="content d-flex flex-column">
    <div class="header p-2 text-center" :class="socketTips.type">
      {{ instanceName }}{{ socketTips.message }}
    </div>
    <div  class="xterm flex-fill" ref="xterm"></div>
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'
import { Terminal } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'
import 'xterm/src/xterm.css'
import io from 'socket.io-client'
import { addWaterMark } from '../../utils/watermark'

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
    this._socketClose()()
  },
  methods: {
    initTerminal () {
      Terminal.applyAddon(fit)
      this.socket = io(this.connectParams.api_server, {
        transports: ['websocket'],
        path: '/connect',
        query: {
          access_token: this.connectParams.access_token
        }
      })
      const term = new Terminal({
        cols: 80,
        rows: 24,
        ScrollBar: true
      })
      const terminalDom = this.$refs.xterm
      term.open(terminalDom)
      term.focus()
      term.on('resize', size => {
        this.socket.emit('resize', [size.cols, size.rows])
      })
      term.on('data', data => this.socket.emit('input', data))
      term.on('keypress', (val, e) => {
        e.preventDefault()
      })
      term.on('title', (val) => {
        if (val) {
          document.title = val
        }
      })
      this.socket.on('output', arrayBuffer => {
        term.write(arrayBuffer)
      })
      this._registerSocketEvents()
      window.addEventListener('resize', () => {
        term.fit()
      })
      term.fit()
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
        this.changeTitle(this.$route.query.ips)
        this.initWaterMark()
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
        this._socketClose()
      })
      this.socket.on('connect_error', () => {
        debug('connect_error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.fail')
      })
      this.socket.on('error', () => {
        debug('error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.abnormal')
      })
      this.socket.on('reconnect_error', () => {
        debug('reconnect_error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.reconnection_fail')
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
