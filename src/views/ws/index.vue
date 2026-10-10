<template>
  <div class="content d-flex flex-column">
    <div class="header text-center d-flex" :class="socketTips.type">
      <div class="text flex-fill d-flex justify-content-center align-items-center" style="position: relative;">
        <span class="secret-level" v-if="secretText">{{ secretText }}</span>{{ instanceName }}{{ socketTips.message }}
      </div>
      <a-button
        type="primary"
        @click="uploadFileHandle"
        class="custom-button upload-file"
      >{{ $t('ws.file_upload') }}</a-button>
    </div>
    <div id="xterm-wrapper" class="xterm flex-fill" ref="xterm"></div>
    <file-transfer
      :visible.sync="fileTransferVisible"
      adapter="sftp"
      :session-id="sessionId"
      @close="fileTransferVisible = false"
    />
  </div>
</template>

<script>
import { Terminal } from 'xterm'
import { addWaterMark } from '../../utils/watermark'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { getConnectParams } from '@utils/auth'
import FileTransfer from '@components/FileTransfer'

const debug = require('debug')('app:ssh')

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

export default {
  name: 'WebConsole',
  components: {
    FileTransfer,
  },
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
      socket: {},
      sessionId: '',
      fileTransferVisible: false,
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
      const { secret_level: secretLevel } = this.connectParams
      if (secretLevel) {
        const str = 'secret_level.' + secretLevel
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
      term.onTitleChange((val) => {
        if (val && document.title === 'Web Console') {
          document.title = val
        }
      })
      this.socket.onmessage = (ev) => {
        const payload = ev.data
        // WebSocket 可能返回 text/string、Blob，或 ArrayBuffer（取决于服务端发送与 binaryType）。
        // 这里按类型兼容，避免把非 Blob 传给 FileReader。
        if (typeof payload === 'string') {
          term.write(payload)
          return
        }
        if (payload instanceof Blob) {
          const reader = new FileReader()
          reader.onload = function () {
            term.write(this.result)
          }
          reader.readAsText(payload)
          return
        }
        // ArrayBuffer / Uint8Array
        if (payload && (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload))) {
          try {
            const buf = payload instanceof ArrayBuffer ? payload : payload.buffer
            const text = new TextDecoder('utf-8').decode(buf)
            term.write(text)
          } catch (e) {
            // 解码失败时退化为字符串写入
            term.write(String(payload))
          }
          return
        }
        term.write(String(payload))
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
        this.changeTitle(this.connectParams.ips)
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
        window.onbeforeunload = null
        this._socketClose(false)
      }
      this.socket.onerror = () => {
        debug('error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.abnormal')
        window.onbeforeunload = null
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
      const query = getConnectParams(this)
      this.sessionId = query.session_id
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
      if (this.connectParams.water_mark) {
        addWaterMark({
          targetDom: document.getElementById('xterm-wrapper'),
          text: this.connectParams.water_mark,
          wrapperStyle: {
            top: '40px'
          }
        })
      }
    },
    uploadFileHandle () {
      this.fileTransferVisible = true
    },
  }
}
</script>

<style lang="less" scoped>
.content {
  height: 100%;
  background-color: #000;
  color: #fff;
}
.header {
  color: #fff;
  height: 32px;
  line-height: 32px;
  padding: 0;
  overflow: hidden;
  &.info {
    background-color: #909399;
    color: #000;
    .secret-level {
      color: red;
    }
  }
  &.success {
    background-color: #67c23a;
    color: #fff;
    .secret-level {
      color: red;
    }
  }
  &.error {
    background-color: #f56c6c;
    color: #fff;
    .secret-level {
      color: #6cf5dc;
    }
  }
  .upload-file {
    float: right;
  }
}
.secret-level {
  position: absolute;
  left: 10px;
}
</style>
