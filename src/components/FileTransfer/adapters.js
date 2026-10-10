/**
 * File transfer adapters for web-console.
 * - sftp: SSH /ws sessions (session_id)
 * - container: container /tty via instance_name
 * - rdp: Windows RDP shared drive (session_id)
 */
import { API_URL } from '@constants/base'

/** instance_name 中的 / 编成 %2F；若已编码则先 decode 再 encode，避免 %252F */
function normalizeContainerName (name) {
  if (!name) return ''
  let raw = name
  try {
    raw = decodeURIComponent(name)
  } catch (e) {
    raw = name
  }
  return encodeURIComponent(raw)
}

function joinApi (path) {
  const base = (API_URL || '').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function withPathQuery (url, path) {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}path=${encodeURIComponent(path || '/')}`
}

export const adapters = {
  sftp: {
    list (http, { sessionId, path }) {
      return http.get(`/v1/webconsole/sftp/${sessionId}/list`, {
        params: { path },
      })
    },
    /** Browser-native streaming download (cookie auth); avoids buffering whole file as blob. */
    getDownloadUrl ({ sessionId, path }) {
      return withPathQuery(joinApi(`/v1/webconsole/sftp/${sessionId}/download`), path)
    },
    upload (http, { sessionId, path, formData, onUploadProgress }) {
      return http.post(`/v1/webconsole/sftp/${sessionId}/upload?path=${path}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 1000 * 60 * 10,
        onUploadProgress,
      })
    },
  },
  container: {
    list (http, { name, path }) {
      return http.get(`/v1/webconsole/container/${normalizeContainerName(name)}/list`, {
        params: { path },
      })
    },
    getDownloadUrl ({ name, path }) {
      return withPathQuery(joinApi(`/v1/webconsole/container/${normalizeContainerName(name)}/download`), path)
    },
    upload (http, { name, path, formData, onUploadProgress }) {
      return http.post(`/v1/webconsole/container/${normalizeContainerName(name)}/upload?path=${path}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 1000 * 60 * 10,
        onUploadProgress,
      })
    },
  },
  rdp: {
    list (http, { sessionId, path }) {
      return http.get(`/v1/webconsole/rdp/${sessionId}/list`, {
        params: { path },
      })
    },
    getDownloadUrl ({ sessionId, path }) {
      return withPathQuery(joinApi(`/v1/webconsole/rdp/${sessionId}/download`), path)
    },
    upload (http, { sessionId, path, formData, onUploadProgress, cancelToken }) {
      const q = encodeURIComponent(path || '/')
      return http.post(`/v1/webconsole/rdp/${sessionId}/upload?path=${q}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 1000 * 60 * 10,
        onUploadProgress,
        cancelToken,
      })
    },
  },
}

export function resolveAdapterContext ({ adapter, sessionId, instanceName }) {
  if (adapter === 'container') {
    // 返回原始 name，由 adapter 拼 URL 时统一 encode，避免双重编码
    return { name: instanceName || '' }
  }
  return { sessionId }
}
