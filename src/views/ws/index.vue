<template>
  <div class="content d-flex flex-column">
    <div class="header p-2 text-center" :class="socketTips.type">
      {{ instanceName }}{{ socketTips.message }}
    </div>
    <div class="xterm flex-fill" ref="xterm"></div>
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'
import { Terminal } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'
import 'xterm/src/xterm.css'

const debug = require('debug')('app:ssh')

export default {
  name: 'WebConsole',
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
      this.socket = new WebSocket('wss://office.yunion.io/connect/?access_token=' + this.connectParams.access_token + '&EIO=3&transport=websocket')
      const term = new Terminal({
        cols: 80,
        rows: 24,
        ScrollBar: true
      })
      const terminalDom = this.$refs.xterm
      term.open(terminalDom)
      term.focus()
      term.on('resize', size => {
        // this.socket.send(JSON.stringify({
        //   type: 'resize',
        //   data: {
        //     cols: size.cols,
        //     rows: size.rows,
        //     base64: false
        //   }
        // }))
      })
      term.on('data', data => {
        // this.socket.emit('input', data)
        console.log('data', btoa(data))
        // const blob = new Blob([btoa(data)], {
        //   type: 'text/plain'
        // })
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
      // this.socket.on('output', arrayBuffer => {
      //   term.write(arrayBuffer)
      // })
      this.socket.onmessage = (ev) => {
        console.log('message', ev)
        const blob = ev.data
        const reader = new FileReader()
        reader.onload = function () {
          term.write(this.result)
        }
        reader.readAsText(blob)
      }
      this._registerSocketEvents()
      window.addEventListener('resize', () => {
        term.fit()
      })
      term.fit()
    },
    _registerSocketEvents () {
      this.socket.onopen = () => {
        console.log('open')
        this.socketTips.type = 'success'
        this.socketTips.message = this.$t('connection.success')
        this.changeTitle(this.$route.query.ips)
      }
      // this.socket.onconnecting = () => {
      //   debug('connecting')
      //   this.socketTips.type = 'info'
      //   this.socketTips.message = this.$t('connection.ing')
      // }
      this.socket.onclose = () => {
        debug('disconnect')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.disconnect')
        this._socketClose()
      }
      // this.socket.on('connect_error', () => {
      //   debug('connect_error')
      //   this.socketTips.type = 'error'
      //   this.socketTips.message = this.$t('connection.fail')
      // })
      this.socket.onerror = () => {
        debug('error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.abnormal')
      }
      // this.socket.on('reconnect_error', () => {
      //   debug('reconnect_error')
      //   this.socketTips.type = 'error'
      //   this.socketTips.message = this.$t('connection.reconnection_fail')
      // })
      // this.socket.on('reconnect', () => {
      //   debug('success')
      //   this.socketTips.type = 'success'
      //   this.socketTips.message = this.$t('connection.reconnection_success')
      // })
      // this.socket.on('reconnecting', () => {
      //   debug('reconnecting')
      //   this.socketTips.type = 'error'
      //   this.socketTips.message = this.$t('connection.reconnection_ing')
      // })
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
