<template>
  <div class="wmks-wrapper" ref="canvas">
    <div class="wmks-wrapper-inner">
      <div class="header text-center d-flex" :class="socketTips.type">
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
        <div class="text flex-fill d-flex justify-content-center align-items-center">{{ socketTips.message }}</div>
        <a-button @click="toggleTrackpad" :disabled="trackpadDisable" class="mr-2 custom-button">Trackpad</a-button>
        <a-button @click="dropdownClick(deleteEvent)" class="mr-2 custom-button">Ctrl-Alt-Delete</a-button>
        <a-button type="primary" @click="sendText" class="custom-button">发送文字</a-button>
      </div>
      <div id="wmks-canvas" />
      <div id="clipboard_div"></div>
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
        message: '正在连接'
      },
      dropdownOps: ['Delete'],
      wmksContainer: null,
      deleteEvent: {
        key: 'Delete',
        keyPath: ['Delete']
      }
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
          const r = confirm('Ctrl-Alt-Delete组合键将重启服务器，确定重启？')
          if (r) {
            this.wmksContainer.wmks('sendKeyCodes', [17, 18, 46])
          }
        } else {
          this.wmksContainer.wmks('sendKeyCodes', [17, 18, 46])
        }
      }
    },
    connectVNC () {
      const query = this.$route.query
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
          'useVNCHandshake': false,
          'sendProperMouseWheelDeltas': true,
          'fitToParent': false,
          'position': window.WMKS.CONST.Position.CENTER
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
          this.doSendText(this.getFormValue()['command'])
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
      debug('连接成功')
      this.socketTips.message = '连接成功'
      this.socketTips.type = 'success'
    },
    errorConnectedFromServer () {
      debug('连接失败')
      this.socketTips.message = '连接失败'
      this.socketTips.type = 'error'
    },
    initErrorFromServer () {
      debug('初始化失败')
      this.socketTips.message = '初始化失败'
      this.socketTips.type = 'error'
    },
    disconnectedFromServer () {
      debug('连接断开')
      this.socketTips.message = '连接断开'
      this.socketTips.type = 'error'
    },
    resolutionChanged () {
      debug('正在重连')
      this.socketTips.message = '连接成功'
      this.socketTips.type = 'success'
    },
    getFormValue () {
      return this.form.getFieldsValue()
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
</style>
