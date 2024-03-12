<template>
  <div class="content d-flex flex-column">
    <div class="header p-2 text-center d-flex" :class="socketTips.type">
      <div
        class="text flex-fill d-flex justify-content-center align-items-center"
      >{{ instanceName }}{{ socketTips.message }}</div>
      <a-button
        type="primary"
        @click="uploadFileHandle"
        class="custom-button upload-file"
      >{{ $t('ws.file_upload') }}</a-button>
    </div>
    <div id="xterm-wrapper" class="xterm flex-fill" ref="xterm"></div>
    <a-drawer
      :title="$t('ws.file_manager')"
      placement="right"
      :visible="visible"
      :headerStyle="headerStyle"
      :drawerStyle="drawerStyle"
      :maskClosable="false"
      width="100%"
      wrapClassName="drawer-wrap-class"
      @close="onClose"
    >
      <div class="d-flex">
        <a-button @click="doReload" :disabled="loading">
          <a-icon v-if="loading" type="reload" spin />
          <a-icon v-else type="reload" />
        </a-button>
        <a-button type="primary" class="ml-2" @click="doUpload">{{ $t('ws.upload_file') }}</a-button>
      </div>
      <div class="d-flex mt-3 mb-3">
        {{ $t('ws.current_path') }}：
        <ul class="breadcrumb-list d-flex">
          <li>
            <a href="javascript:;" @click="goBack('/')">
              <span class="mr-1">{{ $t('ws.root_directory') }}</span>
            </a>
          </li>
          <li v-for="(item, idx) in breadcrumbNames" :key="idx">
            <a v-if="idx < breadcrumbNames.length - 1" href="javascript:;" @click="goBack(item)">
              <span class="mr-1">/</span>
              {{ item }}
            </a>
            <span v-else>
              <span class="mr-1">/</span>
              {{ item }}
            </span>
          </li>
        </ul>
      </div>
      <a-table
        :columns="columns"
        :data-source="dataSource"
        rowKey="path"
        size="small"
        :pagination="{ hideOnSinglePage: true, defaultPageSize: 1024 }"
        :scroll="{ y: clientHeight - 260 }"
        :loading="loading"
      >
        <span class="name-wrapper" slot="name" slot-scope="text, record">
          <template v-if="isViewFolderFiles(record)">
            <a-icon class="folder-open mr-1" type="folder-open" />
            <a href="javascript:;" :title="text" @click="viewFolderFiles(record)">{{ text }}</a>
          </template>
          <template v-else>
            <a-icon class="mr-1" type="file" />
            <span :title="text">{{ text }}</span>
          </template>
          <a-icon class="copy-icon ml-1" type="copy" @click="copyText(text)" />
        </span>
        <span slot="size" slot-scope="text">{{ text }}</span>
        <span slot="mode" slot-scope="text">{{ text }}</span>
        <span slot="type" slot-scope="text, record">
          <span v-if="record.link_file" color="purple">{{ $t('ws.link_file') }}</span>
          <span v-else-if="record.is_dir" color="pink">{{ $t('ws.directory') }}</span>
          <span v-else color="blue">{{ $t('ws.file') }}</span>
        </span>
        <span slot="action" slot-scope="text, record">
          <a-button
            :disabled="getDownloadDisabled(record)"
            class="download-link"
            type="link"
            @click="doDownload(record)"
          >{{ $t('ws.download') }}</a-button>
        </span>
      </a-table>
      <a-modal
        v-model="uploadFileModal"
        :title="$t('ws.upload_file')"
        :width="800"
        :maskClosable="false">
        <a-form-model
          ref="formRef"
          :model="formModel"
          :rules="formRules"
          :label-col="labelCol"
          :wrapper-col="wrapperCol"
          labelAlign="left"
        >
          <a-form-model-item :label="$t('ws.upload_to')">{{ currentPath }}</a-form-model-item>
          <a-form-model-item :label="$t('ws.choose_file')" prop="files">
            <a-upload-dragger
              name="file"
              :multiple="true"
              :file-list="formModel.fileList"
              :remove="handleRemove"
              :before-upload="beforeUpload"
            >
              <p class="ant-upload-drag-icon">
                <a-icon type="inbox" />
              </p>
              <p class="ant-upload-text">{{ $t('ws.file_upload_text') }}</p>
            </a-upload-dragger>
          </a-form-model-item>
        </a-form-model>
        <template slot="footer">
          <a-button
            type="primary"
            :loading="fileUploadLoading"
            @click="handleUpload"
          >{{ $t('common.ok') }}</a-button>
        </template>
      </a-modal>
    </a-drawer>
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'
import dayjs from 'dayjs'
import { Terminal } from 'xterm'
import { addWaterMark } from '../../utils/watermark'
import { FitAddon } from 'xterm-addon-fit'
import { sizestrWithUnit } from '@/utils/sizestr'
import 'xterm/css/xterm.css'

const debug = require('debug')('app:ssh')

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

export default {
  name: 'WebConsole',
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
      visible: false,
      uploadFileModal: false,
      currentPath: '/',
      actionPath: '',
      headerStyle: {
        height: '48px'
      },
      drawerStyle: {
        marginRight: '365px'
      },
      labelCol: { span: 5 },
      wrapperCol: { span: 19 },
      columns: [
        {
          title: this.$t('ws.name'),
          dataIndex: 'name',
          key: 'name',
          width: 300,
          ellipsis: true,
          scopedSlots: { customRender: 'name' },
        },
        {
          title: this.$t('ws.size'),
          dataIndex: 'size',
          key: 'size',
          width: 100,
          scopedSlots: { customRender: 'size' },
        },
        {
          title: this.$t('ws.mod_time'),
          dataIndex: 'mod_time',
          key: 'mod_time',
          width: 160,
        },
        {
          title: this.$t('ws.mode'),
          dataIndex: 'mode',
          key: 'mode',
          width: 140,
          scopedSlots: { customRender: 'mode' },
        },
        {
          title: this.$t('ws.type'),
          dataIndex: 'type',
          key: 'type',
          width: 80,
          scopedSlots: { customRender: 'type' },
        },
        {
          title: this.$t('ws.action'),
          key: 'action',
          scopedSlots: { customRender: 'action' },
          width: 80,
        }
      ],
      dataSource: [],
      fileUploadLoading: false,
      formModel: {
        fileList: []
      },
      formRules: {
        files: [{ required: true, validator: this.uploadFileValidator, trigger: 'change' }]
      },
      clientHeight: 0
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
    breadcrumbNames () {
      if (this.currentPath === '/') return []
      return this.currentPath.slice(1).split('/').filter(item => item !== '')
    }
  },
  created () {
    this.getWebConsoleInfo()
  },
  mounted () {
    this.clientHeight = window.innerHeight
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy () {
    this._socketClose(true)()
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleResize () {
      this.clientHeight = window.innerHeight
    },
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
      // term.onKey(({ key, domEvent }) => {
      //   domEvent.preventDefault()
      // })
      term.onTitleChange((val) => {
        if (val && document.title === 'Web Console') {
          document.title = val
        }
      })
      this.socket.onmessage = (ev) => {
        const blob = ev.data
        const reader = new FileReader()
        reader.onload = function () {
          term.write(this.result)
        }
        reader.readAsText(blob)
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
        this._socketClose(false)
      }
      this.socket.onerror = () => {
        debug('error')
        this.socketTips.type = 'error'
        this.socketTips.message = this.$t('connection.abnormal')
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
      let query = this.$route.query
      if (query.data) {
        query = {
          ...qs.parse(Base64.decode(query.data)),
          ...query
        }
      }
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
      this.fetchSftpFiles().then(data => {
        this.dataSource = data
      })
      this.visible = true
    },
    onClose () {
      this.visible = false
    },
    doReload () {
      this.fetchSftpFiles().then(data => {
        this.dataSource = data
      })
    },
    doUpload () {
      this.uploadFileModal = true
    },
    doDownload (record) {
      const getFileName = (res) => {
        const content = res.headers['content-disposition']
        if (content) {
          let name = content.match(/filename\*=(.*)/)
          name = name && decodeURIComponent(name[1].substring(7))
          return name
        }
        return Date.now()
      }
      this.$http.get(`/v1/webconsole/sftp/${this.sessionId}/download`, {
        params: {
          path: record.path
        },
        responseType: 'blob'
      }).then(res => {
        const aLink = document.createElement('a')
        const URL = window.URL || window.webkitURL || window.moxURL
        aLink.href = URL.createObjectURL(res.data)
        document.body.appendChild(aLink)
        aLink.download = getFileName(res)
        aLink.click()
        document.body.removeChild(aLink)
        URL.revokeObjectURL(aLink.href)
      })
    },
    async fetchSftpFiles () {
      try {
        this.loading = true
        const res = await this.$http.get(`/v1/webconsole/sftp/${this.sessionId}/list?path=${this.currentPath}`)
        const getModeArr = (modeNum) => {
          const modeArr = []
          const read = (`0o${modeNum.toString(8)}` & '0o400').toString(8) === '400'
          const write = (`0o${modeNum.toString(8)}` & '0o200').toString(8) === '200'
          if (read) {
            modeArr.push(this.$t('ws.read'))
          }
          if (write) {
            modeArr.push(this.$t('ws.write'))
          }
          return modeArr
        }
        const realData = res.data.map((item, idx) => {
          const modeArr = getModeArr(item.mode_num)
          const getOrder = (item) => {
            if (item.link_file) return 0
            if (item.is_dir) return 1
            return -1
          }

          return {
            ...item,
            order: getOrder(item),
            mode: modeArr.join(` ${this.$t('ws.and')} `),
            size: sizestrWithUnit(item.size, 'B', 1024),
            mod_time: dayjs(item.mod_time).format('YYYY-MM-DD HH:mm:ss')
          }
        })
        const sortData = realData.sort((a, b) => {
          return b.order - a.order
        })
        return Promise.resolve(sortData)
      } catch (error) {
        console.log(error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    },
    async copyText (txt) {
      const permission = await navigator.permissions.query({ name: 'clipboard-write' });
      if (permission.state === 'denied') {
        return console.error("Damn, we don't have permissions to do this")
      }
      try {
        await navigator.clipboard.writeText(txt) // 写入文本
        this.$message.success(this.$t('ws.copy.success'));
      } catch (e) {
        this.$message.error(this.$t('ws.copy.error'));
      }
    },
    handleRemove (file) {
      const index = this.formModel.fileList.indexOf(file);
      const newFileList = this.formModel.fileList.slice();
      newFileList.splice(index, 1);
      this.formModel.fileList = newFileList;
    },
    beforeUpload (file) {
      this.formModel.fileList = [...this.formModel.fileList, file];
      return false;
    },
    viewFolderFiles (record) {
      this.currentPath = record.path
      this.doReload()
    },
    goBack (name) {
      if (name === '/') {
        this.currentPath = name
      } else {
        const idx = this.currentPath.indexOf(name)
        this.currentPath = this.currentPath.slice(0, idx + name.length)
      }
      this.doReload()
    },
    handleUpload () {
      try {
        const doSubmit = () => {
          const { fileList } = this.formModel;
          this.fileUploadLoading = true
          const promises = fileList.map(file => {
            const formData = new FormData();
            formData.append('file', file);
            return this.$http.post(`/v1/webconsole/sftp/${this.sessionId}/upload?path=${this.currentPath}`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })
          });
          Promise.allSettled(promises).then((values) => {
            const isSomeRejected = values.some(item => item.status === 'rejected')
            this.formModel.fileList = [];
            this.uploadFileModal = false
            if (!isSomeRejected) {
              this.$message.success(this.$t('ws.upload.success'))
            } else {
              const response = values.find(item => item?.reason?.response?.data?.details)
              const errorMsg = response.reason?.response?.data?.details
              this.$message.error(errorMsg)
            }
            this.doReload()
          })
        }
        this.$refs.formRef.validate(valid => {
          if (valid) {
            doSubmit()
          }
        });
      } catch (error) {
        this.$message.error(this.$t('ws.upload.error'))
      } finally {
        this.fileUploadLoading = false
      }
    },
    // 自定义上传附件校验
    uploadFileValidator (rule, value, callback) {
      if (this.formModel.fileList.length === 0) {
        return callback(this.$t('common.placeholder.file'))
      } else {
        return true;
      }
    },
    getDownloadDisabled (record) {
      if (record.link_file) {
        return record.link_file.is_regular === false
      }
      return record.is_regular === false
    },
    isViewFolderFiles (record) {
      if (record.link_file) {
        return record.link_file.is_dir
      }
      return record.is_dir
    }
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
  &.info {
    background-color: #909399;
    color: #000;
  }
  &.success {
    background-color: #67c23a;
    color: #fff;
  }
  &.error {
    background-color: #f56c6c;
    color: #fff;
  }
  .upload-file {
    float: right;
  }
}
.download-link {
  padding-left: 0;
}
.name-wrapper {
  .copy-icon {
    font-size: 12px;
    display: none;
  }
  &:hover {
    .copy-icon {
      display: inline-block;
    }
  }
  .folder-open {
    color: #1890ff;
  }
}
.breadcrumb-list {
  padding: 0;
  margin: 0;
  li {
    margin: 0 3px;
    list-style: none;
  }
}
</style>
<style lang="less">
.drawer-wrap-class {
  left: 365px;
  .ant-drawer-close {
    left: 0px;
    top: -15px;
    width: 26px;
    height: 38px;
    font-size: 12px;
    color: #fff;
    &::before {
      display: block;
      content: "";
      border-width: 50px 50px 50px 50px;
      border-style: solid;
      border-color: transparent transparent #1890ff transparent;

      /* 定位 */
      position: absolute;
      left: -50px;
      top: -63px;
      transform: rotate(315deg);
      z-index: -1;
    }
  }
}
.ant-table {
  .ant-table-header {
    background: #f8f8f9 !important;
  }
}
</style>
