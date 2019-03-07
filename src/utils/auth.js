import Cookies from 'js-cookie'
import { Base64 } from 'js-base64'
import { AUTH_COOKIE_NAME } from '@constants/base'

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
