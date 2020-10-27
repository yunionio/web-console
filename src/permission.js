import { Base64 } from 'js-base64'
import qs from 'qs'
import store from '@store'

import router from './router'
import { LOGIN_URL } from '@constants/base'

function isLogin (to) {
  let flag = false
  if (!store.getters.userInfo.session) {
    if (to.query.data) {
      try {
        let data = Base64.decode(to.query.data)
        data = qs.parse(data)
        if (data.api_server === location.origin) {
          flag = true
        }
      } catch (error) {
        flag = false
      }
    }
  }
  return flag
}

router.beforeEach((to, from, next) => {
  const _isLogin = isLogin(to)
  if (_isLogin) {
    window.location.href = `${LOGIN_URL}?rf=${window.location.href}`
  } else {
    next()
  }
})
