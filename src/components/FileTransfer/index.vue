<template>
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
</template>

<script>
import dayjs from 'dayjs'
import { sizestrWithUnit } from '@/utils/sizestr'
import { adapters, resolveAdapterContext } from './adapters'

export default {
  name: 'FileTransfer',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    // sftp | container（后续 rdp 可复用 container 或扩展新 adapter）
    adapter: {
      type: String,
      default: 'sftp',
      validator: val => ['sftp', 'container'].includes(val),
    },
    sessionId: {
      type: String,
      default: '',
    },
    instanceName: {
      type: String,
      default: '',
    },
  },
  data () {
    return {
      loading: false,
      uploadFileModal: false,
      currentPath: '/',
      headerStyle: {
        height: '48px',
      },
      drawerStyle: {
        marginRight: '365px',
      },
      labelCol: { span: 5 },
      wrapperCol: { span: 19 },
      columns: [
        {
          title: this.$t('ws.name'),
          dataIndex: 'name',
          key: 'name',
          ellipsis: true,
          scopedSlots: { customRender: 'name' },
        },
        {
          title: this.$t('ws.size'),
          dataIndex: 'size',
          key: 'size',
          scopedSlots: { customRender: 'size' },
        },
        {
          title: this.$t('ws.mode'),
          dataIndex: 'mode',
          key: 'mode',
          scopedSlots: { customRender: 'mode' },
        },
        {
          title: this.$t('ws.type'),
          dataIndex: 'type',
          key: 'type',
          scopedSlots: { customRender: 'type' },
        },
        {
          title: this.$t('ws.mod_time'),
          dataIndex: 'mod_time',
          key: 'mod_time',
          width: 220,
        },
        {
          title: this.$t('ws.action'),
          key: 'action',
          scopedSlots: { customRender: 'action' },
          width: 160,
        },
      ],
      dataSource: [],
      fileUploadLoading: false,
      formModel: {
        fileList: [],
      },
      formRules: {
        files: [{ required: true, validator: this.uploadFileValidator, trigger: 'change' }],
      },
      clientHeight: 0,
    }
  },
  computed: {
    breadcrumbNames () {
      if (this.currentPath === '/') return []
      return this.currentPath.slice(1).split('/').filter(item => item !== '')
    },
    adapterApi () {
      return adapters[this.adapter]
    },
    adapterContext () {
      return resolveAdapterContext({
        adapter: this.adapter,
        sessionId: this.sessionId,
        instanceName: this.instanceName,
      })
    },
  },
  watch: {
    visible (val) {
      if (val) {
        this.currentPath = '/'
        this.doReload()
      }
    },
  },
  mounted () {
    this.clientHeight = window.innerHeight
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleResize () {
      this.clientHeight = window.innerHeight
    },
    onClose () {
      this.$emit('close')
      this.$emit('update:visible', false)
    },
    doReload () {
      this.fetchFiles().then(data => {
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
      this.adapterApi.download(this.$http, {
        ...this.adapterContext,
        path: record.path,
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
    async fetchFiles () {
      try {
        this.loading = true
        const res = await this.adapterApi.list(this.$http, {
          ...this.adapterContext,
          path: this.currentPath,
        })
        const getModeArr = (modeNum) => {
          const modeArr = []
          if (modeNum == null) return modeArr
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
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        const realData = list.map((item) => {
          const modeArr = getModeArr(item.mode_num)
          const getOrder = (row) => {
            if (row.link_file) return 0
            if (row.is_dir) return 1
            return -1
          }

          return {
            ...item,
            order: getOrder(item),
            mode: modeArr.join(` ${this.$t('ws.and')} `),
            size: sizestrWithUnit(item.size || 0, 'B', 1024),
            mod_time: item.mod_time ? dayjs(item.mod_time).format('YYYY-MM-DD HH:mm:ss') : '',
          }
        })
        return realData.sort((a, b) => b.order - a.order)
      } catch (error) {
        console.log(error)
        return Promise.reject(error)
      } finally {
        this.loading = false
      }
    },
    async copyText (txt) {
      const permission = await navigator.permissions.query({ name: 'clipboard-write' })
      if (permission.state === 'denied') {
        return console.error("Damn, we don't have permissions to do this")
      }
      try {
        await navigator.clipboard.writeText(txt)
        this.$message.success(this.$t('ws.copy.success'))
      } catch (e) {
        this.$message.error(this.$t('ws.copy.error'))
      }
    },
    handleRemove (file) {
      const index = this.formModel.fileList.indexOf(file)
      const newFileList = this.formModel.fileList.slice()
      newFileList.splice(index, 1)
      this.formModel.fileList = newFileList
    },
    beforeUpload (file) {
      this.formModel.fileList = [...this.formModel.fileList, file]
      return false
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
          const { fileList } = this.formModel
          this.fileUploadLoading = true
          const promises = fileList.map(file => {
            const formData = new FormData()
            formData.append('file', file)
            return this.adapterApi.upload(this.$http, {
              ...this.adapterContext,
              path: this.currentPath,
              formData,
            })
          })
          Promise.allSettled(promises).then((values) => {
            const isSomeRejected = values.some(item => item.status === 'rejected')
            this.formModel.fileList = []
            this.uploadFileModal = false
            this.fileUploadLoading = false
            if (!isSomeRejected) {
              this.$message.success(this.$t('ws.upload.success'))
            } else {
              const response = values.find(item => item?.reason?.response?.data?.details)
              const errorMsg = response?.reason?.response?.data?.details
              this.$message.error(errorMsg || this.$t('ws.upload.error'))
            }
            this.doReload()
          })
        }
        this.$refs.formRef.validate(valid => {
          if (valid) {
            doSubmit()
          }
        })
      } catch (error) {
        this.$message.error(this.$t('ws.upload.error'))
        this.fileUploadLoading = false
      }
    },
    uploadFileValidator (rule, value, callback) {
      if (this.formModel.fileList.length === 0) {
        return callback(this.$t('common.placeholder.file'))
      }
      return true
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
    },
  },
}
</script>

<style lang="less" scoped>
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
