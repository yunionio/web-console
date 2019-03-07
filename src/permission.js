import store from '@store'

import router from './router'
import { LOGIN_URL } from '@constants/base'

router.beforeEach((to, from, next) => {
  if (!to.meta.auth) {
    next()
  } else {
    if (!store.getters.userInfo.session) {
      window.location.href = `${LOGIN_URL}?rf=${window.location.href}`
    }
  }
})

// router.afterEach((to, from) => {
// })
