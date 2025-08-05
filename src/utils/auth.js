import Cookies from 'js-cookie'
import { Base64 } from 'js-base64'
import qs from 'qs'
import { AUTH_COOKIE_NAME } from '@constants/base'
import { aesDecrypt } from './crypto'

function _decodeToken (authCookie) {
  let ret = Base64.decode(authCookie)
  if (ret === 'undefined') {
    ret = '{}'
  }
  return JSON.parse(ret)
}

function _getAuthCookie () {
  return Cookies.get(AUTH_COOKIE_NAME)
}

export function getSession () {
  const authCookie = _getAuthCookie()
  if (authCookie) {
    return _decodeToken(authCookie)
  }
  return {}
}

export function removeAllCookie () {
  const allCookies = Cookies.get()
  const whiteList = ['isadmin', 'tenant']
  Object.keys(allCookies).forEach(key => {
    if (!whiteList.includes(key)) {
      Cookies.remove(key)
    }
  })
}

export function authed () {
  const obj = getSession()
  if (obj.session && obj.exp) {
    const endTime = +new Date(obj.exp)
    const currentTime = +new Date()
    if (endTime > currentTime) {
      return true
    }
  }
  return false
}

export function feLogout () {
  removeAllCookie()
}

export function getConnectParams (vm) {
  const parseQuery = vm.$route.query
  if (parseQuery.data) {
    try {
      const params = qs.parse(Base64.decode(parseQuery.data))
      if (params.api_server) {
        return { ...params, ...parseQuery }
      }
    } catch (err) { }
    const params = aesDecrypt(parseQuery.data)
    return { ...qs.parse(params), ...parseQuery }
  }
  return parseQuery
}
