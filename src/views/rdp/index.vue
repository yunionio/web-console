<template>
  <div
    class="rdp-container"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <upload-top-progress ref="uploadProgress" />
    <div
      v-show="dragOver"
      class="drop-overlay"
    >
      <div class="drop-hint">{{ $t('ws.drop_upload_hint') }}</div>
    </div>
    <div>
      <div class="header p-2 text-center" :class="socketTips.type" style="position: relative;">
        <span class="secret-level" v-if="secretText">{{ secretText }}</span>{{ instanceName }}{{ socketTips.message }}
        <a-button
          type="primary"
          @click="uploadFileHandle"
          class="custom-button upload-file"
        >{{ $t('ws.file_upload') }}</a-button>
        <a-button @click="doClickHandle()" class="ctrl-alt-delete-btn">Ctrl-Alt-Delete</a-button>
      </div>
    </div>
    <div id="display-wrapper" class="rdp-wrapper">
      <div ref="viewport" class="viewport">
        <!-- tabindex allows for div to be focused -->
        <div ref="display" class="display" tabindex="0" />
      </div>
    </div>
    <file-transfer
      :visible.sync="fileTransferVisible"
      adapter="rdp"
      :session-id="sessionId"
      @close="fileTransferVisible = false"
    />
  </div>
</template>

<!-- eslint-disable camelcase -->
<script>
import Guacamole from 'guacamole-common-js'
import GuacMouse from './libs/GuacMouse'
import states from './libs/states'
import clipboard from './libs/clipboard'
import { addWaterMark } from '../../utils/watermark'
import { debounce } from '../../utils/base'
import { getConnectParams } from '@utils/auth'
import axios from 'axios'
import FileTransfer from '@components/FileTransfer'
import UploadTopProgress from '@components/UploadTopProgress'
import { adapters } from '@components/FileTransfer/adapters'

Guacamole.Mouse = GuacMouse.mouse

const debug = require('debug')('app:ssh')

function serialize (obj) {
  const str = []
  for (const p in obj) {
    if (obj[p]) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
    }
  }
  return str.join('&')
}

const hadPort = value => {
  const reg = /^.+:\d+$/
  return reg.test(value)
}

let dropUid = 0

const UPLOAD_CONCURRENCY = 2
const SCAN_YIELD_EVERY = 40

function yieldToMain () {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function readEntriesBatch (reader) {
  return new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject)
  })
}

function entryToFile (fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject)
  })
}

/** Recursively collect { file, path }; yields to keep UI responsive. */
async function walkFsEntry (entry, parentPath, acc, counter) {
  if (!entry) return
  if (entry.isFile) {
    const file = await entryToFile(entry)
    acc.push({ file, path: parentPath || '/' })
    counter.n += 1
    if (counter.n % SCAN_YIELD_EVERY === 0) {
      await yieldToMain()
    }
    return
  }
  if (entry.isDirectory) {
    const dirPath = !parentPath || parentPath === '/'
      ? `/${entry.name}`
      : `${parentPath.replace(/\/$/, '')}/${entry.name}`
    const reader = entry.createReader()
    let batch
    do {
      batch = await readEntriesBatch(reader)
      for (const child of batch) {
        await walkFsEntry(child, dirPath, acc, counter)
      }
      if (batch.length) await yieldToMain()
    } while (batch.length > 0)
  }
}

/** Collect files from a drop event (supports folders via webkitGetAsEntry). */
async function collectDroppedUploads (dataTransfer) {
  const items = dataTransfer && dataTransfer.items
  if (items && items.length) {
    const entries = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind !== 'file') continue
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null
      if (entry) {
        entries.push(entry)
      }
    }
    if (entries.length) {
      const uploads = []
      const counter = { n: 0 }
      for (const entry of entries) {
        await walkFsEntry(entry, '/', uploads, counter)
      }
      return uploads
    }
  }
  // Fallback: flat file list (no folder structure)
  const files = dataTransfer && dataTransfer.files
  if (!files || !files.length) return []
  const uploads = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const rel = file.webkitRelativePath || ''
    if (rel && rel.includes('/')) {
      const parts = rel.split('/')
      parts.pop()
      uploads.push({ file, path: '/' + parts.join('/') })
    } else {
      uploads.push({ file, path: '/' })
    }
    if ((i + 1) % SCAN_YIELD_EVERY === 0) await yieldToMain()
  }
  return uploads
}

/** Worker-pool queue: only `limit` uploads in flight; supports mid-queue cancel. */
async function runUploadQueue (items, limit, { isCancelled, worker }) {
  let next = 0
  const runners = []
  for (let w = 0; w < limit; w++) {
    runners.push((async () => {
      while (!isCancelled()) {
        const i = next
        next += 1
        if (i >= items.length) return
        await worker(items[i], i)
      }
    })())
  }
  await Promise.all(runners)
}

export default {
  name: 'RdpConnect',
  components: {
    FileTransfer,
    UploadTopProgress,
  },
  data () {
    return {
      loading: false,
      connected: false,
      display: null,
      currentAdjustedHeight: null,
      client: null,
      keyboard: null,
      mouse: null,
      lastEvent: null,
      connectionState: states.IDLE,
      errorMessage: '',
      arguments: {},
      socketTips: {
        type: 'info',
        message: this.$t('connection.ing')
      },
      connectParams: {},
      sessionId: '',
      fileTransferVisible: false,
      dragOver: false,
      dragDepth: 0,
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
      const { secret_level } = this.connectParams
      if (secret_level) {
        const str = 'secret_level.' + secret_level
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
    getWebConsoleInfo () {
      const query = getConnectParams(this)
      this.connectParams = query
      this.sessionId = query.session_id || ''
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
        this.doGuacdConnect()
      })
    },
    doGuacdConnect () {
      this.startGuacamole()
    },
    uploadFileHandle () {
      if (!this.sessionId) {
        this.$message.error(this.$t('ws.upload.error'))
        return
      }
      this.fileTransferVisible = true
    },
    hasFileDrag (e) {
      if (!e.dataTransfer || !e.dataTransfer.types) return false
      return Array.from(e.dataTransfer.types).includes('Files')
    },
    onDragEnter (e) {
      if (!this.hasFileDrag(e)) return
      this.dragDepth += 1
      this.dragOver = true
    },
    onDragOver (e) {
      if (!this.hasFileDrag(e)) return
      e.dataTransfer.dropEffect = 'copy'
      this.dragOver = true
    },
    onDragLeave () {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) {
        this.dragOver = false
      }
    },
    async onDrop (e) {
      this.dragOver = false
      this.dragDepth = 0
      if (!this.sessionId) {
        this.$message.error(this.$t('ws.upload.error'))
        return
      }
      const hideScan = this.$message.loading(this.$t('ws.upload_scanning'), 0)
      try {
        const uploads = await collectDroppedUploads(e.dataTransfer)
        hideScan()
        if (!uploads.length) return
        await this.uploadDroppedFiles(uploads)
      } catch (err) {
        hideScan()
        debug('collect drop failed', err)
        this.$message.error(this.$t('ws.upload.error'))
      }
    },
    async uploadDroppedFiles (uploads) {
      const progress = this.$refs.uploadProgress
      let batchCancelled = false
      const inflight = new Map() // uid -> CancelToken.source
      const activeSnapshot = new Map() // uid -> { uid, name, percent, color }

      const syncActiveUi = () => {
        if (!batch || batchCancelled) return
        batch.setActive(Array.from(activeSnapshot.values()))
      }

      const batch = progress
        ? progress.startBatch({
          total: uploads.length,
          onCancel: () => {
            batchCancelled = true
            inflight.forEach(source => {
              try {
                source.cancel('cancelled')
              } catch (e) {
                // ignore
              }
            })
            inflight.clear()
            activeSnapshot.clear()
          },
        })
        : null

      const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1']
      let colorIdx = 0

      await runUploadQueue(uploads, UPLOAD_CONCURRENCY, {
        isCancelled: () => batchCancelled,
        worker: async ({ file, path }) => {
          if (batchCancelled) return
          const uid = `drop-${dropUid++}`
          const displayName = path && path !== '/'
            ? `${path.replace(/^\//, '')}/${file.name}`
            : file.name
          const source = axios.CancelToken.source()
          const color = colors[colorIdx % colors.length]
          colorIdx += 1
          inflight.set(uid, source)
          activeSnapshot.set(uid, { uid, name: displayName, percent: 0, color })
          syncActiveUi()

          const formData = new FormData()
          formData.append('file', file)
          try {
            await adapters.rdp.upload(this.$http, {
              sessionId: this.sessionId,
              path: path || '/',
              formData,
              cancelToken: source.token,
              onUploadProgress: (event) => {
                if (batchCancelled || !event.total) return
                const percent = Math.min(99, Math.round((event.loaded * 100) / event.total))
                const cur = activeSnapshot.get(uid)
                if (cur) {
                  cur.percent = percent
                  syncActiveUi()
                }
              },
            })
            if (batchCancelled) return
            if (batch) batch.tickDone()
          } catch (err) {
            if (axios.isCancel(err) || batchCancelled) return
            if (batch) batch.tickFail()
            // Avoid flooding toasts on mass failures
            if (uploads.length <= 5) {
              this.$message.error(this.$t('ws.upload.error') + `: ${displayName}`)
            }
          } finally {
            inflight.delete(uid)
            activeSnapshot.delete(uid)
            syncActiveUi()
          }
        },
      })

      if (batch && !batchCancelled) {
        batch.finish()
      }
    },
    send (cmd) {
      if (!this.client) {
        return
      }
      for (const c of cmd.data) {
        this.client.sendKeyEvent(1, c.charCodeAt(0))
      }
    },
    copy (cmd) {
      if (!this.client) {
        return
      }
      clipboard.cache = {
        type: 'text/plain',
        data: cmd.data
      }
      clipboard.setRemoteClipboard(this.client)
    },
    handleMouseState (mouseState) {
      const scaledMouseState = Object.assign({}, mouseState, {
        x: mouseState.x / this.display.getScale(),
        y: mouseState.y / this.display.getScale()
      })
      this.client.sendMouseState(scaledMouseState)
    },
    resize () {
      const elm = this.$refs.viewport
      if (!elm || !elm.offsetWidth) {
        // resize is being called on the hidden window
        return
      }

      if (!this.display) {
        return
      }

      const displayWidth = this.display.getWidth()
      const displayHeight = this.display.getHeight()

      // 确保显示元素有有效的尺寸
      if (!displayWidth || !displayHeight || displayWidth === 0 || displayHeight === 0) {
        // 如果显示元素还没有尺寸，延迟重试
        setTimeout(() => this.resize(), 100)
        return
      }

      const width = window.innerWidth
      const height = window.innerHeight - 37
      const heightScale = height / displayHeight
      const widthScale = width / displayWidth
      const minScale = widthScale < heightScale ? widthScale : heightScale

      this.client.sendSize(width, height)
      this.display.scale(minScale)
    },
    startGuacamole () {
      const url = `wss://${this.host}:${this.port}/connect/`
      const tunnel = new Guacamole.WebSocketTunnel(url)

      const resize = debounce(() => {
        this.resize()
      }, 500)

      if (this.client) {
        this.display.scale(0)
        this.uninstallKeyboard()
      }

      this.client = new Guacamole.Client(tunnel)
      clipboard.install(this.client)

      tunnel.onerror = status => {
        // eslint-disable-next-line no-console
        console.error(`Tunnel failed ${JSON.stringify(status)}`)
        this.connectionState = states.TUNNEL_ERROR
      }

      tunnel.onstatechange = state => {
        switch (state) {
          // Connection is being established
          case Guacamole.Tunnel.State.CONNECTING:
            this.connectionState = states.CONNECTING
            break

            // Connection is established / no longer unstable
          case Guacamole.Tunnel.State.OPEN:
            this.connectionState = states.CONNECTED
            break

            // Connection is established but misbehaving
          case Guacamole.Tunnel.State.UNSTABLE:
            // TODO
            debug('不稳定')
            break

            // Connection has closed
          case Guacamole.Tunnel.State.CLOSED:
            this.connectionState = states.DISCONNECTED
            break
        }
      }

      this.client.onstatechange = clientState => {
        // const key = 'message'
        switch (clientState) {
          case 0:
            this.connectionState = states.IDLE
            // message.destroy(key)
            // message.loading({ content: '正在初始化中...', duration: 0, key: key })
            break
          case 1:
            // message.destroy(key)
            // message.loading({ content: '正在努力连接中...', duration: 0, key: key })
            break
          case 2:
            this.connectionState = states.WAITING
            // message.destroy(key)
            // message.loading({ content: '正在等待服务器响应...', duration: 0, key: key })
            break
          case 3:
            this.connectionState = states.CONNECTED
            // message.destroy(key)
            // message.success({ content: '连接成功', duration: 3, key: key })
            this.socketTips.type = 'success'
            this.socketTips.message = this.$t('connection.success')
            window.addEventListener('resize', resize)
            this.$refs.viewport.addEventListener('mouseenter', resize)

            clipboard.setRemoteClipboard(this.client)
            this.initWaterMark()
            this.changeTitle(this.connectParams.ips)
            // eslint-disable-next-line no-fallthrough
          case 4:
            break
          case 5:
            // disconnected, disconnecting
            // message.info({ content: '连接已关闭', duration: 3, key: key })
            this.socketTips.type = 'error'
            this.socketTips.message = this.$t('connection.disconnect')
            window.onbeforeunload = null
            break
        }
      }

      this.client.onerror = error => {
        this.client.disconnect()
        // eslint-disable-next-line no-console
        // message.error(`Client error ${JSON.stringify(error)}`)
        this.errorMessage = error.message
        this.connectionState = states.CLIENT_ERROR
      }

      this.client.onsync = () => {
      }

      // Test for argument mutability whenever an argument value is received
      this.client.onargv = (stream, mimetype, name) => {
        if (mimetype !== 'text/plain') { return }

        const reader = new Guacamole.StringReader(stream)

        // Assemble received data into a single string
        let value = ''
        reader.ontext = text => {
          value += text
        }

        // Test mutability once stream is finished, storing the current value for the argument only if it is mutable
        reader.onend = () => {
          const stream = this.client.createArgumentValueStream('text/plain', name)
          stream.onack = status => {
            if (status.isError()) {
              // ignore reject
              return
            }
            this.arguments[name] = value
          }
        }
      }

      this.client.onclipboard = clipboard.onClipboard
      this.display = this.client.getDisplay()
      const displayElm = this.$refs.display
      const displayElement = this.display.getElement()

      // 确保显示元素有正确的尺寸
      if (displayElement) {
        displayElm.appendChild(displayElement)
        // 设置显示元素的初始尺寸
        displayElement.style.width = '100%'
        displayElement.style.height = '100%'
      }

      displayElm.addEventListener('contextmenu', e => {
        e.stopPropagation()
        if (e.preventDefault) {
          e.preventDefault()
        }
        e.returnValue = false
      })

      const query = {
        access_token: this.connectParams.access_token
      }
      const param = serialize(query)
      this.client.connect(param)
      window.onunload = () => this.client.disconnect()

      this.mouse = new Guacamole.Mouse(displayElm)
      // Hide software cursor when mouse leaves display
      this.mouse.onmouseout = () => {
        if (!this.display) return
        this.display.showCursor(false)
      }

      // allows focusing on the display div so that keyboard doesn't always go to session
      displayElm.onclick = () => {
        displayElm.focus()
      }
      displayElm.onfocus = () => {
        displayElm.className = 'focus'
      }
      displayElm.onblur = () => {
        displayElm.className = ''
      }

      this.keyboard = new Guacamole.Keyboard(displayElm)
      this.installKeyboard()
      this.mouse.onmousedown = this.mouse.onmouseup = this.mouse.onmousemove = this.handleMouseState
      setTimeout(() => {
        resize()
        displayElm.focus()
      }, 1500) // $nextTick wasn't enough
    },
    installKeyboard () {
      this.keyboard.onkeydown = keysym => {
        this.client.sendKeyEvent(1, keysym)
      }
      this.keyboard.onkeyup = keysym => {
        this.client.sendKeyEvent(0, keysym)
      }
    },
    uninstallKeyboard () {
      this.keyboard.onkeydown = this.keyboard.onkeyup = () => {
      }
    },
    initWaterMark () {
      if (this.connectParams.water_mark) {
        addWaterMark({
          targetDom: document.getElementById('display-wrapper'),
          text: this.connectParams.water_mark,
          wrapperStyle: {
            top: '40px'
          }
        })
      }
    },
    changeTitle: function (title) {
      if (!title) return
      document.title = title
    },
    doClickHandle () {
      this.client.sendKeyEvent(1, 0xFFE3) // Ctrl
      this.client.sendKeyEvent(1, 0xFFE9) // Alt
      this.client.sendKeyEvent(1, 0xFFFF) // Delete
    },
    _socketClose () {
      return () => {
        if (this.client) {
          try {
            this.client.disconnect()
          } catch (e) {
            // ignore
          }
        }
      }
    },
  }
}
</script>

<style lang="scss" scoped>
.rdp-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  position: relative;
}
.header {
  color: #fff;
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
.rdp-wrapper {
  margin: 0 auto;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.viewport {
  width: 100%;
  height: 100%;
  position: relative;
}
.display {
  overflow: hidden;
  width: 100%;
  height: 100%;
  position: relative;
}
.display.focus {
  outline: none;
}
.upload-file {
  position: absolute;
  right: 160px;
  top: 2px;
}
.ctrl-alt-delete-btn {
  position: absolute;
  right: 10px;
  top: 2px;
}
.secret-level {
  position: absolute;
  left: 10px;
}
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 1500;
  background: rgba(24, 144, 255, 0.25);
  border: 2px dashed #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.drop-hint {
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  font-size: 16px;
  color: #fff;
}
</style>
