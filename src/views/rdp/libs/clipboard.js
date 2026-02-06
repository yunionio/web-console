/* eslint-disable no-return-assign */
import Guacamole from 'guacamole-common-js'

const clipboard = {}

clipboard.install = (client) => {
  // 延迟初始化剪贴板，确保文档已聚焦
  if (document.hasFocus()) {
    clipboard.getLocalClipboard().then(data => {
      clipboard.cache = data
    }).catch(() => {
      // 忽略错误，不影响连接
    })
  }

  window.addEventListener('load', clipboard.update(client), true)
  window.addEventListener('copy', clipboard.update(client))
  window.addEventListener('cut', clipboard.update(client))
  window.addEventListener('focus', e => {
    if (e.target === window) {
      clipboard.update(client)()
    }
  }, true)
}

clipboard.update = client => {
  return () => {
    clipboard.getLocalClipboard().then(data => {
      if (data) {
        clipboard.cache = data
        clipboard.setRemoteClipboard(client)
      }
    }).catch(() => {
      // 忽略错误，不影响连接
    })
  }
}

clipboard.setRemoteClipboard = (client) => {
  if (!clipboard.cache) {
    return
  }

  let writer

  const stream = client.createClipboardStream(clipboard.cache.type)

  if (typeof clipboard.cache.data === 'string') {
    writer = new Guacamole.StringWriter(stream)
    writer.sendText(clipboard.cache.data)
    writer.sendEnd()
  } else {
    writer = new Guacamole.BlobWriter(stream)
    writer.oncomplete = function clipboardSent () {
      writer.sendEnd()
    }
    writer.sendBlob(clipboard.cache.data)
  }
}

clipboard.getLocalClipboard = async () => {
  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      // 检查文档是否处于焦点状态
      if (!document.hasFocus()) {
        // 文档未聚焦，返回 null
        return null
      }
      const text = await navigator.clipboard.readText()
      return {
        type: 'text/plain',
        data: text
      }
    } catch (error) {
      // 捕获 NotAllowedError 或其他错误
      if (error.name === 'NotAllowedError') {
        // 文档未聚焦，静默失败
        return null
      }
      // 其他错误也静默处理
      return null
    }
  }
  return null
}

clipboard.setLocalClipboard = async (data) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    if (data.type === 'text/plain') {
      try {
        // 检查文档是否处于焦点状态
        if (!document.hasFocus()) {
          return
        }
        await navigator.clipboard.writeText(data.data)
      } catch (error) {
        // 捕获 NotAllowedError 或其他错误，静默处理
        if (error.name !== 'NotAllowedError') {
          console.warn('Failed to write to clipboard:', error)
        }
      }
    }
  }
}

clipboard.onClipboard = (stream, mimetype) => {
  let reader

  if (/^text\//.exec(mimetype)) {
    reader = new Guacamole.StringReader(stream)

    // Assemble received data into a single string
    let data = ''
    reader.ontext = text => {
      data += text
    }

    // Set clipboard contents once stream is finished
    reader.onend = () => {
      clipboard.setLocalClipboard({
        type: mimetype,
        data: data
      })
    }
  } else {
    reader = new Guacamole.BlobReader(stream, mimetype)
    reader.onend = () => {
      clipboard.setLocalClipboard({
        type: mimetype,
        data: reader.getBlob()
      })
    }
  }
}

export default clipboard
