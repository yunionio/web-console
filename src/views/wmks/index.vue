<template>
  <div class="wmks-wrapper" ref="canvas">
    <div class="wmks-wrapper-inner">
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
import { getWebConsoleInfoByServerId } from '@/api/webconsole'
import qs from 'qs'

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

export default {
  name: 'WMKSWebConsole',
  data () {
    return {
      form: this.$form.createForm(this),
      visible: false,
      host: '',
      port: '',
      socketTips: {
        type: 'info',
        message: '正在连接'
      },
      dropdownOps: ['Delete'],
      wmksContainer: null
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
    sendText (pastedText) {
      if (pastedText && typeof pastedText === 'string') {
        this.form.setFieldsValue({
          command: pastedText
        })
      }
      this.visible = true
    },
    rebuiltConfirm () {
      this.wmksContainer.wmks('sendKeyCodes', [17, 18, 46])
      this.handleCancle()
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
          this.wmksContainer.wmks('sendKeyCodes', [17, 18, 46])
        }
      }
    },
    connectVNC () {
      this.getNovncIp()
        .then(({ data }) => {
          const connectParams = qs.parse(data.connect_params)
          this.host = connectParams.api_server.slice(connectParams.api_server.indexOf('//') + 2) // 去掉双划线
          if (hadPort(this.host)) {
            this.port = this.host.slice(this.host.indexOf(':') + 1) // 去掉:
            this.host = this.host.slice(0, this.host.indexOf(':'))
          } else {
            this.port = connectParams.api_server.indexOf('https') === 0 ? 443 : 80
          }
          var scheme = 'ws'
          if (connectParams.api_server.includes('https:')) {
            scheme = 'wss'
          }
          const uri = `${scheme}://${this.host}:${this.port}/websockify/?access_token=${connectParams.access_token}`
          this.wmksContainer = window.$('#wmks-canvas')
            .wmks({
              'useVNCHandshake': false,
              'sendProperMouseWheelDeltas': true,
              'fitToParent': false,
              'position': window.WMKS.CONST.Position.CENTER
            })
            .bind('wmksconnecting', function () {
              console.log('The console is connecting')
            })
            .bind('wmksconnected', this.connectedToServer)
            .bind('wmksdisconnected', this.disconnectedFromServer)
            .bind('wmkserror', this.errorConnectedFromServer)
            .bind('wmksiniterror', this.initErrorFromServer)
            .bind('wmksresolutionchanged', this.resolutionChanged)
            .bind('wmksscreensizechange', function (evt, w, h) {
              console.log(w, h)
            })
            // .bind('wmkstoggle', function (evt, what, visible) {
            //   if (what === 'RELATIVEPAD') {
            //     if (visible) {
            //       $("#trackPad").attr('disabled', true)
            //     } else {
            //       $("#trackPad").attr('disabled', false)
            //     }
            //   }
            // })
            // $("#trackPad").click(function () {
            //   wmksContainer.wmks("toggleRelativePad")
            // })
          this.wmksContainer.wmks('connect', uri)
        })
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
      window.$('#wmks-canvas canvas').focus()
    },
    handleCancle () {
      this.form.resetFields()
      this.visible = false
    },
    doSendText (text) {
      this.wmksContainer.wmks('sendInputString', text)
    },
    getNovncIp () {
      return getWebConsoleInfoByServerId(this.serverId)
    },
    connectedToServer () {
      console.log('连接成功')
      this.socketTips.message = '连接成功'
      this.socketTips.type = 'success'
    },
    errorConnectedFromServer () {
      console.log('连接失败')
      this.socketTips.message = '连接失败'
      this.socketTips.type = 'error'
    },
    initErrorFromServer () {
      console.log('初始化失败')
      this.socketTips.message = '初始化失败'
      this.socketTips.type = 'error'
    },
    disconnectedFromServer () {
      console.log('连接断开')
      this.socketTips.message = '连接断开'
      this.socketTips.type = 'error'
    },
    resolutionChanged () {
      console.log('正在重连')
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
  #wmks-canvas {
    background-color: #000;
    color: #fff;
    position: absolute;
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
