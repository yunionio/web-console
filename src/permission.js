// import { Base64 } from 'js-base64'
// import qs from 'qs'
// import store from '@store'

import router from './router'
import { LOGIN_URL } from '@constants/base'

// function isLogin (to) {
//   let flag = false
//   if (store.getters.userInfo.session || to.path.includes('/no-vnc')) {
//     flag = true
//   }
//   return flag
// }

router.beforeEach((to, from, next) => {
  const _isLogin = true // isLogin(to)
  if (_isLogin) {
    next()
  } else {
    window.location.href = `${LOGIN_URL}?rf=${window.location.href}`
  }
})
