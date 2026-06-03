<template>
  <div class="novnc-wrapper" ref="canvas">
    <div class="novnc-wrapper-inner">
      <div class="header text-center d-flex" :class="socketTips.type">
        <a-dropdown :trigger="['click']" :visible="keystrokesMenuVisible" @visibleChange="onKeystrokesMenuVisibleChange">
          <a-button type="primary" class="custom-dropdown">
            {{ $t('send_remote_command') }}<a-icon type="down" />
          </a-button>
          <div slot="overlay" class="keystrokes-panel" @mousedown.stop @click.stop>
            <div class="keystrokes-panel-inner">
              <div class="keystrokes-col keystrokes-col-common">
                <div class="keystrokes-col-title">{{ $t('keystrokes.common_keys') }}</div>
                <div class="keystrokes-common-body">
                  <div class="keystroke-group">
                    <div class="keystroke-group-mod">Win</div>
                    <div class="keystroke-group-keys keystroke-group-keys--letters">
                      <button type="button" class="keystroke-num" @click="sendCommonKeystrokeCombo('Win', 'D')">D</button>
                      <button type="button" class="keystroke-num" @click="sendCommonKeystrokeCombo('Win', 'E')">E</button>
                      <button type="button" class="keystroke-num" @click="sendCommonKeystrokeCombo('Win', 'L')">L</button>
                      <button type="button" class="keystroke-num" @click="sendCommonKeystrokeCombo('Win', 'Tab')">Tab</button>
                    </div>
                  </div>
                  <div class="keystroke-group">
                    <div class="keystroke-group-mod keystroke-group-mod--stack">
                      <span>Ctrl+Alt</span>
                    </div>
                    <div class="keystroke-group-keys">
                      <button
                        v-for="n in fKeyNumbers"
                        :key="'ca-' + n"
                        type="button"
                        class="keystroke-num"
                        @click="sendCommonKeystrokeCombo('Ctrl+Alt', n)">
                        F{{ n }}
                      </button>
                    </div>
                  </div>
                  <div class="keystroke-group">
                    <div class="keystroke-group-mod keystroke-group-mod--stack">
                      <span>Ctrl+Shift</span>
                    </div>
                    <div class="keystroke-group-keys">
                      <button
                        v-for="n in fKeyNumbers"
                        :key="'cs-' + n"
                        type="button"
                        class="keystroke-num"
                        @click="sendCommonKeystrokeCombo('Ctrl+Shift', n)">
                        F{{ n }}
                      </button>
                    </div>
                  </div>
                  <div class="keystrokes-quick-row">
                    <button type="button" class="keystroke-chip" @click="sendCommonQuickKeystroke('Alt+Tab')">Alt+Tab</button>
                    <button type="button" class="keystroke-chip" @click="sendCommonQuickKeystroke('Ctrl+Win+Left')">Ctrl+Win+Left</button>
                    <button type="button" class="keystroke-chip" @click="sendCommonQuickKeystroke('Ctrl+Win+Right')">Ctrl+Win+Right</button>
                  </div>
                </div>
              </div>
              <div class="keystrokes-col keystrokes-col-custom">
                <div class="keystrokes-col-title">{{ $t('keystrokes.custom_keys') }}</div>
                <div class="keystrokes-custom-body">
                  <div class="keystroke-group">
                    <div class="keystroke-group-mod">{{ $t('keystrokes.modifier_keys') }}</div>
                    <div class="keystroke-group-keys keystroke-group-keys--modifiers">
                      <label class="customkey-chip">
                        <input v-model="customKeyCtrl" type="checkbox">
                        <span>Ctrl</span>
                      </label>
                      <label class="customkey-chip">
                        <input v-model="customKeyAlt" type="checkbox">
                        <span>Alt</span>
                      </label>
                      <label class="customkey-chip">
                        <input v-model="customKeyShift" type="checkbox">
                        <span>Shift</span>
                      </label>
                      <label class="customkey-chip">
                        <input v-model="customKeyWin" type="checkbox">
                        <span>Win</span>
                      </label>
                    </div>
                  </div>
                  <div class="keystroke-group keystroke-group--align-top">
                    <div class="keystroke-group-mod">{{ $t('keystrokes.function_keys') }}</div>
                    <div class="customkey-func-panel">
                      <div class="customkey-func-section">
                        <div class="customkey-func-radios customkey-func-radios--fkeys">
                          <label v-for="key in customFuncFKeys" :key="key" class="customkey-radio">
                            <input v-model="customKeyFunc" type="radio" :value="key">
                            <span>{{ key }}</span>
                          </label>
                        </div>
                      </div>
                      <div class="customkey-func-section">
                        <div class="customkey-func-radios">
                          <label v-for="key in customFuncCommon" :key="key" class="customkey-radio">
                            <input v-model="customKeyFunc" type="radio" :value="key">
                            <span>{{ key }}</span>
                          </label>
                        </div>
                      </div>
                      <div class="customkey-func-section">
                        <div class="customkey-func-radios">
                          <label v-for="key in customFuncNav" :key="key" class="customkey-radio">
                            <input v-model="customKeyFunc" type="radio" :value="key">
                            <span>{{ key }}</span>
                          </label>
                        </div>
                      </div>
                      <div class="customkey-func-section">
                        <div class="customkey-func-radios">
                          <label v-for="key in customFuncArrow" :key="key" class="customkey-radio">
                            <input v-model="customKeyFunc" type="radio" :value="key">
                            <span>{{ key }}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="keystrokes-custom-footer">
                    <a-button type="primary" size="small" @click="sendCustomKey">{{ $t('keystrokes.send_combo') }}</a-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a-dropdown>
        <div class="text flex-fill d-flex justify-content-center align-items-center" style="margin-right:8rem;position:relative">
          <span class="secret-level" v-if="secretText">{{ secretText }}</span>
          {{ instanceName }}{{ socketTips.message }}
        </div>
        <a-button @click="sendQuickKeystroke('F8')" class="mr-2 custom-button">F8</a-button>
        <a-button @click="sendCtrlAltDel" class="mr-2 custom-button">Ctrl-Alt-Delete</a-button>
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

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

const CUSTOM_FUNC_FKEYS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
const CUSTOM_FUNC_COMMON = ['Tab', 'Enter', 'Space', 'Delete', 'Backspace', 'Insert']
const CUSTOM_FUNC_NAV = ['Home', 'End', 'PageUp', 'PageDown']
const CUSTOM_FUNC_ARROW = ['Left', 'Up', 'Right', 'Down']

const FUNC_KEY_MAP = {
  F1: 0xffbe,
  F2: 0xffbf,
  F3: 0xffc0,
  F4: 0xffc1,
  F5: 0xffc2,
  F6: 0xffc3,
  F7: 0xffc4,
  F8: 0xffc5,
  F9: 0xffc6,
  F10: 0xffc7,
  F11: 0xffc8,
  F12: 0xffc9,
  Tab: 0xff09,
  Enter: 0xff0d,
  Space: 0x0020,
  Delete: 0xffff,
  Backspace: 0xff08,
  Insert: 0xff63,
  Home: 0xff50,
  End: 0xff57,
  PageUp: 0xff55,
  PageDown: 0xff56,
  Left: 0xff51,
  Up: 0xff52,
  Right: 0xff53,
  Down: 0xff54
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
      connectParams: {},
      customKeyCtrl: false,
      customKeyAlt: false,
      customKeyShift: false,
      customKeyWin: false,
      customKeyFunc: '',
      customFuncFKeys: CUSTOM_FUNC_FKEYS,
      customFuncCommon: CUSTOM_FUNC_COMMON,
      customFuncNav: CUSTOM_FUNC_NAV,
      customFuncArrow: CUSTOM_FUNC_ARROW,
      fKeyNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      keystrokesMenuVisible: false
    }
  },
  computed: {
    isLinux () {
      return this.connectParams.os_type === 'Linux' || this.$route.query.os_type === 'Linux'
    },
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
      const { secret_level: secretLevel } = this.connectParams
      const { secret_level: secretLevel2 } = this.$route.query
      if (secretLevel || secretLevel2) {
        const str = 'secret_level.' + (secretLevel || secretLevel2)
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
  },
  methods: {
    onKeystrokesMenuVisibleChange (visible) {
      this.keystrokesMenuVisible = visible
    },
    closeKeystrokesMenu () {
      this.keystrokesMenuVisible = false
    },
    sendCommonKeystrokeCombo (modifier, key) {
      this.sendKeystrokeCombo(modifier, key)
      this.closeKeystrokesMenu()
    },
    sendCommonQuickKeystroke (name) {
      this.sendQuickKeystroke(name)
      this.closeKeystrokesMenu()
    },
    sendKeyList (keysyms) {
      if (!this.cRfb) return
      keysyms.forEach(k => this.cRfb.sendKey(k, null, true))
      keysyms.slice().reverse().forEach(k => this.cRfb.sendKey(k, null, false))
      this.cRfb.focus()
    },
    getFKey (n) {
      return KeyTable['XK_F' + n]
    },
    sendKeystrokeCombo (modifier, key) {
      const K = KeyTable
      let keys = []
      if (modifier === 'Win') {
        keys = [K.XK_Super_L]
        if (key === 'D') keys.push(K.XK_d)
        else if (key === 'E') keys.push(K.XK_e)
        else if (key === 'L') keys.push(K.XK_l)
        else if (key === 'Tab') keys.push(K.XK_Tab)
      } else if (modifier === 'Ctrl+Alt') {
        keys = [K.XK_Control_L, K.XK_Alt_L, this.getFKey(key)]
      } else if (modifier === 'Ctrl+Shift') {
        keys = [K.XK_Control_L, K.XK_Shift_L, this.getFKey(key)]
      }
      if (keys.length) {
        this.sendKeyList(keys)
      }
    },
    sendQuickKeystroke (name) {
      const K = KeyTable
      const map = {
        'Alt+Tab': [K.XK_Alt_L, K.XK_Tab],
        'Ctrl+Win+Left': [K.XK_Control_L, K.XK_Super_L, K.XK_Left],
        'Ctrl+Win+Right': [K.XK_Control_L, K.XK_Super_L, K.XK_Right],
        F8: [K.XK_F8]
      }
      if (map[name]) {
        this.sendKeyList(map[name])
      }
    },
    sendCtrlAltDel () {
      if (!this.cRfb) return
      if (this.isLinux) {
        const r = confirm(this.$t('common_text2'))
        if (r) {
          this.cRfb.sendCtrlAltDel()
        }
      } else {
        this.cRfb.sendCtrlAltDel()
      }
      this.cRfb.focus()
    },
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
    resetCustomKeyForm () {
      this.customKeyCtrl = false
      this.customKeyAlt = false
      this.customKeyShift = false
      this.customKeyWin = false
      this.customKeyFunc = ''
    },
    sendCustomKey () {
      const funcKeyCode = FUNC_KEY_MAP[this.customKeyFunc]
      if (!funcKeyCode) {
        this.$message.warning(this.$t('keystrokes.select_function_key'))
        return
      }

      const keysDown = []
      if (this.customKeyCtrl) keysDown.push(KeyTable.XK_Control_L)
      if (this.customKeyAlt) keysDown.push(KeyTable.XK_Alt_L)
      if (this.customKeyShift) keysDown.push(KeyTable.XK_Shift_L)
      if (this.customKeyWin) keysDown.push(KeyTable.XK_Super_L)
      keysDown.push(funcKeyCode)

      this.sendKeyList(keysDown)
      this.resetCustomKeyForm()
      this.closeKeystrokesMenu()
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
      this.changeTitle(this.connectParams.ips || this.$route.query.ips)
    },
    disconnectedFromServer (e) {
      this.socketTips.message = this.$t('connection.fail')
      this.socketTips.type = 'error'
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
    justify-items: center;
    overflow: hidden;
  }
  #noVNC_canvas {
    background-color: rgb(40, 40, 40);
    color: #fff;
    max-width: 1920px;
    max-height: 1080px;
    width: 100%;
    height: 100%;
    margin: 0 auto;
  }
}
.secret-level {
  position: absolute;
  left: 10px;
}
</style>

<style lang="scss">
.keystrokes-panel {
  min-width: 640px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  padding: 0;
}

.keystrokes-panel-inner {
  display: flex;
}

.keystrokes-col-common {
  flex: 0 0 300px;
  width: 300px;
  border-right: 1px solid #e8e8e8;
}

.keystrokes-col-custom {
  min-width: 340px;
  flex: 1;
}

.keystrokes-col-title {
  padding: 8px 12px 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  font-weight: 500;
  border-bottom: solid 1px #f0f0f0;
}

.keystrokes-common-body {
  padding-bottom: 8px;
}

.keystrokes-col-common .keystroke-group {
  padding: 6px 8px;
}

.keystrokes-col-common .keystroke-group-mod {
  width: 62px;
}

.keystrokes-col-common .keystroke-group-keys {
  gap: 6px;
}

.keystrokes-col-common .keystroke-chip,
.keystrokes-col-common .keystroke-num {
  min-height: 26px;
  padding: 1px 4px;
  font-size: 12px;
  line-height: 24px;
}

.keystrokes-col-common .keystrokes-quick-row .keystroke-chip {
  flex: 0 0 auto;
  width: auto;
}

.keystrokes-quick-row {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  padding: 6px 8px 0;
}

.keystrokes-quick-row .keystroke-chip {
  flex: 0 0 auto;
  width: auto;
  padding: 0 6px;
  white-space: nowrap;
}

.keystroke-group {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.keystroke-group:last-child {
  border-bottom: none;
}

.keystroke-group-mod {
  width: 80px;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
}

.keystroke-group-mod--stack {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.2;
}

.keystroke-group-keys {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.keystroke-group-keys--letters,
.keystroke-group-keys--modifiers {
  grid-template-columns: repeat(4, 1fr);
}

.keystroke-group--align-top {
  align-items: flex-start;
  padding-bottom: 7px;
}

.keystroke-chip,
.keystroke-num {
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fafafa;
  color: #333;
  font-size: 12px;
  line-height: 26px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.keystroke-chip:hover,
.keystroke-num:hover {
  color: #1890ff;
  border-color: #1890ff;
  background: #e6f7ff;
}

.keystroke-chip:active,
.keystroke-num:active {
  color: #096dd9;
  border-color: #096dd9;
  background: #bae7ff;
}

.keystrokes-custom-body {
  padding-bottom: 6px;
}

.keystrokes-custom-footer {
  display: flex;
  justify-content: center;
  align-items: center;
}

.keystrokes-custom-footer .ant-btn {
  margin-top: 8px;
}

.customkey-func-panel {
  flex: 1;
  min-width: 0;
}

.customkey-func-section {
  margin-bottom: 8px;
}

.customkey-func-section:last-child {
  margin-bottom: 0;
}

.customkey-func-radios {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.customkey-func-radios--fkeys {
  grid-template-columns: repeat(6, 1fr);
}

.customkey-chip,
.customkey-radio {
  position: relative;
  cursor: pointer;
  margin: 0;
}

.customkey-chip input,
.customkey-radio input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.customkey-chip span,
.customkey-radio span {
  display: block;
  min-height: 28px;
  padding: 0 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fafafa;
  color: #333;
  font-size: 12px;
  line-height: 26px;
  text-align: center;
  transition: all 0.2s;
  user-select: none;
}

.customkey-chip:hover span,
.customkey-radio:hover span {
  color: #1890ff;
  border-color: #1890ff;
  background: #e6f7ff;
}

.customkey-chip input:checked + span,
.customkey-radio input:checked + span {
  color: #1890ff;
  border-color: #1890ff;
  background: #e6f7ff;
  font-weight: 500;
}
</style>
