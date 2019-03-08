<template>
  <div class="content d-flex flex-column">
    <div class="header p-2 text-center" :class="socketTips.type">
      {{ name }} - {{ ip }} - {{ socketTips.message }}
    </div>
    <div class="xterm flex-fill" ref="xterm"></div>
  </div>
</template>

<script>
import { getSSHInfoByBaremetalId, getSSHInfoByIp } from '@/api/webconsole'
import qs from 'qs'
import { Terminal } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'
import 'xterm/src/xterm.css'
import io from 'socket.io-client'

const debug = require('debug')('app:ssh')

export default {
  name: 'SSHWebConsole',
  data () {
    return {
      loading: false,
      socketTips: {
        type: 'info',
        message: '正在连接'
      },
      connectParams: {},
      socket: {}
    }
  },
  computed: {
    ip () {
      return this.$route.query.ip
    },
    name () {
      return this.$route.query.name
    },
    isBaremetal () {
      return this.$route.query.isBaremetal
    },
    id () {
      return this.$route.query.id
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
      this.socket = io(this.connectParams['api_server'], {
        transports: ['websocket'],
        path: '/connect',
        query: {
          access_token: this.connectParams['access_token']
        }
      })
      const term = new Terminal({
        cols: 80,
        rows: 24,
        ScrollBar: true
      })
      const terminalDom = this.$refs['xterm']
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
        this.socketTips.message = '连接成功'
      })
      this.socket.on('connecting', () => {
        debug('connecting')
        this.socketTips.type = 'info'
        this.socketTips.message = '正在连接...'
      })
      this.socket.on('disconnect', () => {
        debug('disconnect')
        this.socketTips.type = 'error'
        this.socketTips.message = '连接断开'
        this._socketClose()
      })
      this.socket.on('connect_error', () => {
        debug('connect_error')
        this.socketTips.type = 'error'
        this.socketTips.message = '连接失败'
      })
      this.socket.on('error', () => {
        debug('error')
        this.socketTips.type = 'error'
        this.socketTips.message = '连接异常'
      })
      this.socket.on('reconnect_error', () => {
        debug('reconnect_error')
        this.socketTips.type = 'error'
        this.socketTips.message = '重连失败'
      })
      this.socket.on('reconnect', () => {
        debug('success')
        this.socketTips.type = 'success'
        this.socketTips.message = '重连成功'
      })
      this.socket.on('reconnecting', () => {
        debug('reconnecting')
        this.socketTips.type = 'error'
        this.socketTips.message = '正在尝试重连...'
      })
    },
    _socketClose () {
      return () => {
        debug('Connection lose!!!')
        this.socket.close()
      }
    },
    getWebConsoleInfo () {
      this.loading = true
      let promise = null
      if (this.isBaremetal) {
        promise = getSSHInfoByBaremetalId(this.id)
      } else {
        promise = getSSHInfoByIp(this.ip)
      }
      promise.then(res => {
        this.loading = false
        const connectParams = res.data.connect_params
        this.connectParams = qs.parse(connectParams)
        this.initTerminal()
      }).catch(() => {
        this.loading = false
        this.socketTips.type = 'error'
        this.socketTips.message = '连接失败'
      })
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
