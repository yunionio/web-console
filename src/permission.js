// import { Base64 } from 'js-base64'
// import qs from 'qs'
import store from '@store'

import router from './router'
import { LOGIN_URL } from '@constants/base'

function isLogin (to) {
  let flag = false
  console.log(to, to.path)
  console.log(to.path.includes('/no-vnc'))
  if (store.getters.userInfo.session || to.path.includes('/no-vnc')) {
    // if (to.query.data) {
    //   try {
    //     let data = Base64.decode(to.query.data)
    //     data = qs.parse(data)
    //     if (data.api_server === location.origin) {
    //       flag = true
    //     }
    //   } catch (error) {
    //     flag = false
    //   }
    // }
    flag = true
  }
  return flag
}

router.beforeEach((to, from, next) => {
  const _isLogin = isLogin(to)
  if (_isLogin) {
    next()
  } else {
    window.location.href = `${LOGIN_URL}?rf=${window.location.href}`
  }
})
