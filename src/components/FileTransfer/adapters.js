/**
 * File transfer adapters for web-console.
 * - sftp: SSH /ws sessions (session_id)
 * - container: container /tty (and future rdp) via instance_name
 */

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

export const adapters = {
  sftp: {
    list (http, { sessionId, path }) {
      return http.get(`/v1/webconsole/sftp/${sessionId}/list`, {
        params: { path },
      })
    },
    download (http, { sessionId, path }) {
      return http.get(`/v1/webconsole/sftp/${sessionId}/download`, {
        params: { path },
        responseType: 'blob',
        timeout: 1000 * 60 * 10,
      })
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
    download (http, { name, path }) {
      return http.get(`/v1/webconsole/container/${normalizeContainerName(name)}/download`, {
        params: { path },
        responseType: 'blob',
        timeout: 1000 * 60 * 10,
      })
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
}

export function resolveAdapterContext ({ adapter, sessionId, instanceName }) {
  if (adapter === 'container') {
    // 返回原始 name，由 adapter 拼 URL 时统一 encode，避免双重编码
    return { name: instanceName || '' }
  }
  return { sessionId }
}
