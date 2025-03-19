<template>
  <div class="novnc-wrapper" ref="canvas">
    <div class="novnc-wrapper-inner">
      <div class="header text-center d-flex" :class="socketTips.type">
        <a-dropdown :trigger="['click']">
          <a-button type="primary" class="custom-dropdown">
            {{ $t('send_remote_command') }}<a-icon type="down" />
          </a-button>
          <a-menu slot="overlay" @click="dropdownClick">
            <template v-for="(item, idx) in dropdownOps">
              <a-menu-item :key="item">Ctrl-Alt-{{ item }}</a-menu-item>
              <a-menu-divider v-if="item === 'F1'" :key="idx" />
            </template>
          </a-menu>
        </a-dropdown>
        <div class="text flex-fill d-flex justify-content-center align-items-center" style="margin-right:8rem;position:relative">
          <span class="secret-level" v-if="secretText">{{ secretText }}</span>
          {{ instanceName }}{{ socketTips.message }}
        </div>
        <a-button @click="dropdownClick(deleteEvent)" class="mr-2 custom-button">Ctrl-Alt-Delete</a-button>
        <a-button type="primary" @click="sendText" class="custom-button">{{ $t('send_text') }}</a-button>
      </div>
      <div class="vnc-canvas-wrap">
        <div id="noVNC_canvas" @keyup.ctrl.86="keyListener" />
      </div>
    </div>
    <a-modal
      :title="$t('send_text')"
      :visible="visible"
      @cancel="handleCancle"
      :after-close="handleAfterClose">
      <template v-slot:footer>
        <a-button key="submit" type="primary" @click="handleConfirm">{{ $t('common.ok') }}</a-button>
        <a-button key="back" @click="handleCancle">{{ $t('common.cancel') }}</a-button>
      </template>
      <a-form :form="form" @submit="handleConfirm">
        <a-tag color="orange" class="d-block">{{ $t('common_text1') }}</a-tag>
        <a-form-item :label="$t('common.content')">
          <a-textarea
            ref="textarea"
            :autosize="{ minRows: 4 }"
            v-decorator="['command', {
              rules: [{ required: true, message: $t('common.placeholder.text') }]
            }]">
          </a-textarea>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'
import RFB from '@novnc/novnc/core/rfb'
import KeyTable from '@novnc/novnc/core/input/keysym'
import { charmap, shiftCharmap } from './src/VncChartMap'
import { addWaterMark } from '../../utils/watermark'

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
        message: this.$t('connection.ing')
      },
      dropdownOps: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
      deleteEvent: {
        key: 'Delete',
        keyPath: ['Delete']
      },
      connectParams: {}
    }
  },
  computed: {
    isLinux () {
      return this.connectParams.os_type === 'Linux'
    },
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
    document.addEventListener('keydown', this.watchKeydown)
  },
  destroyed () {
    document.removeEventListener('keydown', this.watchKeydown)
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
      this.visible = false
      this.form.resetFields()
    },
    handleConfirm (e) {
      e.preventDefault()
      this.form.validateFields((err, values) => {
        if (!err) {
          this.doSendText(this.getFormValue().command)
          this.$nextTick(() => {
            this.handleCancle()
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
          const r = confirm(this.$t('common_text2'))
          if (r) {
            this.cRfb.sendCtrlAltDel()
          }
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
      this.socketTips.message = this.$t('connection.success')
      this.socketTips.type = 'success'
      this.changeTitle(this.connectParams.ips)
      this.initWaterMark()
    },
    disconnectedFromServer (e) {
      this.socketTips.message = this.$t('connection.fail')
      this.socketTips.type = 'error'
      window.onbeforeunload = null
    },
    credentialsAreRequired (e) {
      this.socketTips.message = this.$t('common.placeholder.password')
      this.socketTips.type = 'info'
      const password = prompt('Password Required:')
      this.cRfb.sendCredentials({ password: password })
    },
    updateDesktopName (e) {
      this.desktopName = e.detail.name
    },
    getFormValue () {
      return this.form.getFieldsValue()
    },
    changeTitle: function (title) {
      if (!title) return
      document.title = title
    },
    watchKeydown (e) {
      // 快捷键 windows + 0
      if (e.metaKey && (e.keyCode === 48 || e.keyCode === 96)) {
        this.sendText()
      }
    },
    initWaterMark () {
      if (this.connectParams.water_mark) {
        const target = document.getElementById('noVNC_canvas')
        const canvas = document.getElementsByTagName('canvas')
        let ratioW = 1024
        let ratioH = 768
        if (canvas[0]) {
          ratioW = canvas[0].width
          ratioH = canvas[0].height
        }
        const rect = target.getBoundingClientRect()
        const { width, height } = rect
        let left = 0
        if (width / height > ratioW / ratioH) {
          left = (width - (ratioW * height / ratioH)) / 2
        }
        addWaterMark({
          targetDom: target,
          text: this.connectParams.water_mark,
          wrapperStyle: {
            position: 'absolute',
            top: 0,
            left: left + 'px',
            right: 0,
            bottom: 0,
            'aspect-ratio': `auto ${ratioW} / ${ratioH}`
          }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.novnc-wrapper {
  height: 100vh;
  background-color: rgb(40, 40, 40);
  position: relative;
  .novnc-wrapper-inner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .header {
    color: #fff;
    height: 32px;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
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
  .vnc-canvas-wrap {
    position: fixed;
    top: 32px;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    // align-items: center;
    justify-items: center;
    overflow: hidden;
  }
  #noVNC_canvas {
    position: relative;
    background-color: rgb(40, 40, 40);
    color: #fff;
    max-width: 1920px;
    max-height: 1080px;
    width: 100%;
    height: 100%;
    margin: 0 auto;
    overflow: hidden;
    canvas {
      aspect-ratio: 1024 / 768!important;
    }
  }
}
.secret-level {
  position: absolute;
  left: 10px;
}
</style>
