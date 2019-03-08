/**
 * Rquest
 * author: houjiazong <houjiazong@gmail.com>
 * date: 2019/03/16
 */

import Vue from 'vue'
import axios from 'axios'
import { API_URL, HTTP_TIMEOUT, LOGIN_URL } from '@constants/base'
import store from '@store'
import { message } from 'ant-design-vue'
import { getHttpErrorMessage } from './httpError'

const debug = require('debug')('app:http')

export const http = axios.create({
  baseURL: API_URL,
  timeout: HTTP_TIMEOUT
})

// request interceptor
http.interceptors.request.use(
  (config) => {
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${store.getters.userInfo.session}`
      }
    }
  },
  (error) => {
    debug(error) // for debug
    Promise.reject(error)
  }
)

// response interceptor
http.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    debug(error) // for debug
    message.error(getHttpErrorMessage(error))
    if (error.response) {
      const status = error.response.status
      if (status === 401 || status === 403) {
        window.location.href = `${LOGIN_URL}?rf=${window.location.href}`
      }
    }
    return Promise.reject(error)
  }
)

export default {
  install () {
    Vue.prototype.$http = http
    Vue.http = http
  }
}
