<template>
  <div class="novnc-wrapper" ref="canvas">
    <div class="novnc-wrapper-inner">
      <div class="header text-center d-flex" :class="socketTips.type">
        <a-dropdown :trigger="['click']">
          <a-button type="primary" class="custom-dropdown">
            发送远程命令<a-icon type="down" />
          </a-button>
          <a-menu slot="overlay" @click="dropdownClick">
            <template v-for="(item, idx) in dropdownOps">
              <a-menu-item :key="item">Ctrl-Alt-{{ item }}</a-menu-item>
              <a-menu-divider v-if="item === 'F1'" :key="idx" />
            </template>
          </a-menu>
        </a-dropdown>
        <div class="text flex-fill d-flex justify-content-center align-items-center">{{ socketTips.message }}</div>
        <a-button type="primary" @click="sendText" class="custom-button">发送文字</a-button>
      </div>
      <div id="noVNC_canvas" @keyup.ctrl.86="keyListener" />
    </div>
    <a-modal
      title="发送文字"
      :visible="visible"
      @ok="handleConfirm"
      @cancel="handleCancle"
      :after-close="handleAfterClose">
      <a-form :form="form" @submit="handleConfirm">
        <a-tag color="orange" class="d-block">提示：如果发送内容为登录密码，请点击确定后输入回车键。</a-tag>
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
import RFB from '@novnc/novnc/core/rfb'
import KeyTable from '@novnc/novnc/core/input/keysym'
import { charmap, shiftCharmap } from './src/VncChartMap'

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

export default {
  name: 'NoVNCWebConsole',
  data () {
    return {
      form: this.$form.createForm(this),
      sendBuf: [],
      sendBufTimer: null,
      visible: false,
      cRfb: null,
      desktopName: '',
      host: '',
      port: '',
      socketTips: {
        type: 'info',
        message: '正在连接'
      },
      dropdownOps: ['Delete', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6']
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
    this.connectVNC()
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
    doSendText (text) {
      for (var i = 0; i < text.length; i++) {
        this.sendBuf.push(text[i])
      }
      if (this.sendBuf.length > 0) {
        this.startSendText()
      }
    },
    startSendText () {
      if (!this.sendBufTimer) {
        this.sendBufTimer = setTimeout(this.doSendTextChar, 100)
      }
    },
    doSendTextChar () {
      this.sendBufTimer = null
      if (this.sendBuf.length > 0) {
        for (var i = 0; i < 2; i++) {
          var ch = this.sendBuf.shift()
          this._doSendTextChar(ch)
        }
      }
      if (this.sendBuf.length > 0) {
        this.startSendText()
      }
    },
    _doSendTextChar (tch) {
      var ch = charmap[tch]
      if (ch) {
        this.cRfb.sendKey(ch, null, true)
        this.cRfb.sendKey(ch, null, false)
      } else {
        ch = shiftCharmap[tch]
        if (ch) {
          this.cRfb.sendKey(0xffe1, null, true)
          this.cRfb.sendKey(ch, null, true)
          this.cRfb.sendKey(ch, null, false)
          this.cRfb.sendKey(0xffe1, null, false)
        }
      }
    },
    handleCancle () {
      this.form.resetFields()
      this.visible = false
    },
    rebuiltConfirm () {
      this.cRfb.sendCtrlAltDel()
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
    handleAfterClose () {
      this.cRfb.focus()
    },
    sendText (pastedText) {
      if (pastedText && typeof pastedText === 'string') {
        this.form.setFieldsValue({
          command: pastedText
        })
      }
      this.visible = true
      this.$nextTick(() => {
        this.$refs.textarea.$el.focus()
      })
    },
    dropdownClick (e) {
      if (e.key === 'Delete') {
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
          this.cRfb.sendCtrlAltDel()
        }
      } else {
        const n = +e.key.slice(1)
        this.cRfb.sendKey(KeyTable.XK_Alt_L, 'AltLeft', true)
        this.cRfb.sendKey(KeyTable['XK_F' + n], null, true)
        this.cRfb.sendKey(KeyTable['XK_F' + n], null, false)
        this.cRfb.sendKey(KeyTable.XK_Alt_L, 'AltLeft', false)
      }
    },
    connectVNC () {
      const oTarget = document.getElementById('noVNC_canvas')
      const query = this.$route.query
      this.host = query.api_server.slice(query.api_server.indexOf('//') + 2) // 去掉双划线
      if (hadPort(this.host)) {
        this.port = this.host.slice(this.host.indexOf(':') + 1) // 去掉:
        this.host = this.host.slice(0, this.host.indexOf(':'))
      } else {
        this.port = query.api_server.indexOf('https') === 0 ? 443 : 80
      }
      let scheme = 'ws'
      if (query.api_server.includes('https:')) {
        scheme = 'wss'
      }
      const sPassword = query.password
      this.cRfb = new RFB(oTarget, `${scheme}://${this.host}:${this.port}/websockify/?access_token=${query.access_token}`, {
        share: true,
        credentials: { password: sPassword }
      })
      this.cRfb.addEventListener('connect', this.connectedToServer)
      this.cRfb.addEventListener('disconnect', this.disconnectedFromServer)
      this.cRfb.addEventListener('credentialsrequired', this.credentialsAreRequired)
      this.cRfb.addEventListener('desktopname', this.updateDesktopName)
      this.cRfb.scaleViewport = true
      this.cRfb.viewOnly = false // 是否应该阻止任何事件，(例如按键或鼠标移动)发送到服务器。默认情况下禁用。
    },
    connectedToServer (e) {
      this.socketTips.message = '连接成功'
      this.socketTips.type = 'success'
    },
    disconnectedFromServer (e) {
      this.socketTips.message = '连接失败'
      this.socketTips.type = 'error'
    },
    credentialsAreRequired (e) {
      this.socketTips.message = '请输入密码'
      this.socketTips.type = 'info'
      const password = prompt('Password Required:')
      this.cRfb.sendCredentials({ password: password })
    },
    updateDesktopName (e) {
      this.desktopName = e.detail.name
    },
    getFormValue () {
      return this.form.getFieldsValue()
    }
  }
}
</script>

<style lang="scss" scoped>
.novnc-wrapper {
  height: 100%;
  overflow: hidden;
  .novnc-wrapper-inner {
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
  #noVNC_canvas {
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
