<template>
  <div class="wmks-wrapper" ref="canvas">
    <div class="wmks-wrapper-inner">
      <div class="header text-center d-flex" :class="socketTips.type" style="position: relative">
        <!-- <a-dropdown :trigger="['click']">
          <a-button type="primary" class="custom-dropdown">
            发送远程命令<a-icon type="down" />
          </a-button>
          <a-menu slot="overlay" @click="dropdownClick">
            <template v-for="(item) in dropdownOps">
              <a-menu-item :key="item">Ctrl-Alt-{{ item }}</a-menu-item>
            </template>
          </a-menu>
        </a-dropdown> -->
        <div class="text flex-fill d-flex justify-content-center align-items-center">
          <span class="secret-level" v-if="secretText">{{ secretText }}</span>
          {{ instanceName }}{{ socketTips.message }}
        </div>
        <a-button @click="toggleTrackpad" :disabled="trackpadDisable" class="mr-2 custom-button">Trackpad</a-button>
        <a-button @click="dropdownClick(deleteEvent)" class="mr-2 custom-button">Ctrl-Alt-Delete</a-button>
        <a-button type="primary" @click="sendText" class="custom-button">{{ $t('send_text') }}</a-button>
      </div>
      <div id="wmks-canvas" />
      <div id="clipboard_div"></div>
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

const debug = require('debug')('app:wmks')

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

export default {
  name: 'WMKSWebConsole',
  data () {
    return {
      trackpadDisable: false,
      form: this.$form.createForm(this),
      visible: false,
      host: '',
      port: '',
      socketTips: {
        type: 'info',
        message: this.$t('connection.ing')
      },
      dropdownOps: ['Delete'],
      wmksContainer: null,
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
  },
  methods: {
    toggleTrackpad () {
      this.wmksContainer.wmks('toggleRelativePad')
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
          const r = confirm(this.$t('common_text2'))
          if (r) {
            this.wmksContainer.wmks('sendKeyCodes', [17, 18, 46])
          }
        } else {
          this.wmksContainer.wmks('sendKeyCodes', [17, 18, 46])
        }
      }
    },
    connectVNC () {
      let query = this.$route.query
      if (query.data) {
        query = {
          ...qs.parse(Base64.decode(query.data)),
          ...query
        }
      }
      this.connectParams = query
      this.host = query.api_server.slice(query.api_server.indexOf('//') + 2) // 去掉双划线
      if (hadPort(this.host)) {
        this.port = this.host.slice(this.host.indexOf(':') + 1) // 去掉:
        this.host = this.host.slice(0, this.host.indexOf(':'))
      } else {
        this.port = query.api_server.indexOf('https') === 0 ? 443 : 80
      }
      var scheme = 'ws'
      if (query.api_server.includes('https:')) {
        scheme = 'wss'
      }
      const uri = `${scheme}://${this.host}:${this.port}/websockify/?access_token=${query.access_token}`
      this.wmksContainer = window.$('#wmks-canvas')
        .wmks({
          useVNCHandshake: false,
          sendProperMouseWheelDeltas: true,
          fitToParent: false,
          position: window.WMKS.CONST.Position.CENTER
        })
        .bind('wmksconnecting', function () {
          debug('The console is connecting')
        })
        .bind('wmksconnected', this.connectedToServer)
        .bind('wmksdisconnected', this.disconnectedFromServer)
        .bind('wmkserror', this.errorConnectedFromServer)
        .bind('wmksiniterror', this.initErrorFromServer)
        .bind('wmksresolutionchanged', this.resolutionChanged)
        .bind('wmksscreensizechange', function (evt, w, h) {
          debug(w, h)
        })
        .bind('wmkstoggle', function (evt, what, visible) {
          if (what === 'RELATIVEPAD') {
            if (visible) {
              this.trackpadDisable = true
            } else {
              this.trackpadDisable = false
            }
          }
        })
      this.wmksContainer.wmks('connect', uri)
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
      window.$('#wmks-canvas canvas').focus()
    },
    handleCancle () {
      this.visible = false
      this.form.resetFields()
    },
    doSendText (text) {
      this.wmksContainer.wmks('sendInputString', text)
    },
    connectedToServer () {
      debug(this.$t('connection.success'))
      this.socketTips.message = this.$t('connection.success')
      this.socketTips.type = 'success'
      this.changeTitle(this.connectParams.ips)
    },
    errorConnectedFromServer () {
      debug(this.$t('connection.fail'))
      this.socketTips.message = this.$t('connection.fail')
      this.socketTips.type = 'error'
    },
    initErrorFromServer () {
      debug(this.$t('connection.init_fail'))
      this.socketTips.message = this.$t('connection.init_fail')
      this.socketTips.type = 'error'
    },
    disconnectedFromServer () {
      debug(this.$t('connection.disconnect'))
      this.socketTips.message = this.$t('connection.disconnect')
      this.socketTips.type = 'error'
    },
    resolutionChanged () {
      debug(this.$t('connection.success'))
      this.socketTips.message = this.$t('connection.success')
      this.socketTips.type = 'success'
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
.wmks-wrapper {
  height: 100%;
  overflow: hidden;
  .wmks-wrapper-inner {
    height: 100%;
    position: relative;
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
  #wmks-canvas {
    background-color: #000;
    color: #fff;
    position: fixed;
    top: 32px;
    left: 0;
    right: 0;
    bottom: 0;
    :global(> canvas:focus) {
      outline: none;
    }
  }
}
.secret-level {
  position: absolute;
  left: 10px;
}
</style>
