<template>
  <div class="spice-wrapper" ref="canvas">
    <div class="spice-wrapper-inner">
      <div class="header text-center d-flex" :class="socketTips.type">
        <a-dropdown :trigger="['click']">
          <a-button type="primary" class="custom-dropdown">
            发送远程命令<a-icon type="down" />
          </a-button>
          <a-menu slot="overlay" @click="dropdownClick">
            <template v-for="(item) in dropdownOps">
              <a-menu-item :key="item">Ctrl-Alt-{{ item }}</a-menu-item>
            </template>
          </a-menu>
        </a-dropdown>
        <div class="text flex-fill d-flex justify-content-center align-items-center">{{ name }} - {{ socketTips.message }}</div>
        <a-button ref="sendTextBtn" type="primary" @click="sendText" class="custom-button">发送文字</a-button>
      </div>
      <div id="spice-canvas" />
      <div id="clipboard_div"></div>
    </div>
    <a-modal
      title="发送文字"
      :visible="visible"
      @ok="handleConfirm"
      @cancel="handleCancle"
      :after-close="handleAfterClose">
      <a-tag color="orange" class="d-block">提示：如果发送内容为登录密码，请点击确定后输入回车键。</a-tag>
      <a-form :form="form" @submit="handleConfirm">
        <a-form-item label="内容">
          <a-textarea
            ref="textarea"
            :autosize="{ minRows: 4 }"
            v-decorator="['command', {
              rules: [{ required: true, message: '请输入文字' }]
            }]">
          </a-textarea>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import qs from 'qs'
import { SpiceMainConn, handleFileDragover, handleFileDrop, handleResize, resizeHelper, sendCtrlAltDel, shiftCharmaps, _charmap, SpiceMsgcKeyDown, SpiceMiniData, SpiceMsgcKeyUp, SPICE_MSGC_INPUTS_KEY_DOWN, SPICE_MSGC_INPUTS_KEY_UP, KEY_SHIFT_L } from './src/spice.js'
import { getWebConsoleInfoByServerId } from '@/api/webconsole'

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

export default {
  name: 'SpiceWebConsole',
  data () {
    return {
      form: this.$form.createForm(this),
      visible: false,
      host: '',
      port: '',
      sendBuf: [],
      sendBufTimer: null,
      sc: null,
      socketTips: {
        type: 'info',
        message: '正在连接'
      },
      dropdownOps: ['Delete']
    }
  },
  computed: {
    serverId () {
      return this.$route.query.id
    },
    name () {
      return this.$route.query.name
    },
    isLinux () {
      return this.$route.query.os_type === 'Linux'
    }
  },
  mounted () {
    this.connect()
    document.getElementById('app').addEventListener('paste', e => {
      let pastedText = ''
      if (window.clipboardData && window.clipboardData.getData) { // IE
        pastedText = window.clipboardData.getData('Text')
      } else {
        if (e.clipboardData && e.clipboardData.getData('Text')) {
          pastedText = e.clipboardData.getData('Text')
        } else {
          pastedText = e.originalEvent.clipboardData.getData('Text')
        }
      }
      this.sendText(pastedText)
    })
  },
  methods: {
    keyDownMsg (code) {
      var key = new SpiceMsgcKeyDown()
      key.code = code
      var msg = new SpiceMiniData()
      msg.build_msg(SPICE_MSGC_INPUTS_KEY_DOWN, key)
      return msg
    },
    keyUpMsg (code) {
      var key = new SpiceMsgcKeyUp()
      key.code = (0x80|code) // eslint-disable-line
      var msg = new SpiceMiniData()
      msg.build_msg(SPICE_MSGC_INPUTS_KEY_UP, key)
      return msg
    },
    sendCharMsgs (ch) {
      var msgs = []
      var code = _charmap[ch]
      var shift = false
      if (!code) {
        code = shiftCharmaps[ch]
        if (code) {
          shift = true
        } else {
          return msgs
        }
      }
      if (shift) {
        msgs[msgs.length] = this.keyDownMsg(KEY_SHIFT_L)
      }
      msgs[msgs.length] = this.keyDownMsg(code)
      msgs[msgs.length] = this.keyUpMsg(code)
      if (shift) {
        msgs[msgs.length] = this.keyUpMsg(KEY_SHIFT_L)
      }
      return msgs
    },
    doSendText (text) {
      for (var i = 0; i < text.length; i++) {
        let msgs = this.sendCharMsgs(text[i])
        for (var j = 0; j < msgs.length; j++) {
          this.sendBuf.push(msgs[j])
        }
      }
      if (this.sendBuf.length > 0) {
        this.startSendText()
      }
    },
    startSendText () {
      if (!this.sendBufTimer) {
        this.sendBufTimer = setTimeout(this.doSendTextChar, 20)
      }
    },
    doSendTextChar () {
      this.sendBufTimer = null
      if (this.sc && this.sc.inputs && this.sc.inputs.state === 'ready' && this.sendBuf.length > 0) {
        this.sc.inputs.send_msg(this.sendBuf.shift())
      }
      if (this.sendBuf.length > 0) {
        this.startSendText()
      }
    },

    handleCancle () {
      this.form.resetFields()
      this.visible = false
    },
    handleAfterClose () {
      this.$refs['sendTextBtn'].$el.blur()
    },
    rebuiltConfirm () {
      sendCtrlAltDel(this.sc)
      this.handleCancle()
    },
    handleConfirm (e) {
      e.preventDefault()
      this.form.validateFields((err, values) => {
        if (!err) {
          this.doSendText(this.getFormValue()['command'])
          this.$nextTick(() => {
            this.visible = false
          })
        }
      })
    },
    sendText (pastedText) {
      if (pastedText && typeof pastedText === 'string') {
        this.form.setFieldsValue({
          command: pastedText
        })
      }
      this.visible = true
    },
    dropdownClick (item) {
      if (item.key === 'Delete') {
        if (this.isLinux) {
          this.$confirm({
            title: '重启机器',
            content: '提示：此操作会重启该云服务器，请慎重。',
            onOk: () => {
              this.rebuiltConfirm()
            },
            onCancel: () => {}
          })
        } else {
          sendCtrlAltDel(this.sc)
        }
      }
    },
    getIp () {
      return getWebConsoleInfoByServerId(this.serverId)
    },
    spiceError () {
      this.disconnect()
    },
    spiceSuccess (msg) {
      this.socketTips.message = '连接成功'
      this.socketTips.type = 'success'
    },
    show_status (msg) {
      const panel = document.getElementById('spice-status')
      panel.innerHTML = msg
    },
    connect () {
      this.getIp()
        .then(({ data }) => {
          const connectParams = qs.parse(data.connect_params)
          this.host = connectParams.api_server.slice(connectParams.api_server.indexOf('//') + 2) // 去掉双划线
          if (hadPort(this.host)) {
            this.port = this.host.slice(this.host.indexOf(':') + 1) // 去掉:
            this.host = this.host.slice(0, this.host.indexOf(':'))
          } else {
            this.port = connectParams.api_server.startsWith('https') ? 443 : 80
          }
          const password = connectParams.password

          var scheme = 'ws'
          if (this.sc) this.sc.stop()
          if (connectParams.api_server.includes('https:')) {
            scheme = 'wss'
          }
          const uri = `${scheme}://${this.host}:${this.port}/websockify/?access_token=${connectParams.access_token}`
          try {
            this.sc = new SpiceMainConn({
              uri,
              screen_id: 'spice-canvas',
              // dump_id: 'debug-div',
              // message_id: 'message-div',
              password,
              onerror: this.spiceError,
              onsuccess: this.spiceSuccess,
              onagent: this.agentConnected
            })
          } catch (e) {
            this.$showHttpErrorMessage(e)
            this.disconnect()
          }
        })
    },
    disconnect () {
      this.socketTips.message = '连接失败'
      this.socketTips.type = 'error'
    },
    agentConnected (sc) {
      window.addEventListener('resize', handleResize)
      window.spice_connection = this
      resizeHelper(this)
      if (window.File && window.FileReader && window.FileList && window.Blob) {
        const wrapper = this.$refs.canvas
        const spiceXferArea = document.createElement('div')
        spiceXferArea.setAttribute('id', 'spice-xfer-area')
        wrapper.appendChild(spiceXferArea)
        wrapper.addEventListener('dragover', handleFileDragover, false)
        wrapper.addEventListener('drop', handleFileDrop, false)
        this.socketTips.message = '未知情况'
        this.socketTips.type = 'info'
      } else {
        console.log('File API is not supported')
      }
    },
    getFormValue () {
      return this.form.getFieldsValue()
    }
  }
}
</script>

<style lang="scss" scoped>
.spice-wrapper {
  height: 100%;
  overflow: hidden;
  .spice-wrapper-inner {
    height: 100%;
    position: relative;
  }
  .header {
    color: #fff;
    height: 32px;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
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
  #spice-canvas {
    background-color: #000;
    color: #fff;
    position: absolute;
    top: 32px;
    left: 0;
    right: 0;
    bottom: 0;
  }
}
</style>
