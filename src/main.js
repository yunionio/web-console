import 'babel-polyfill'
import './plugins'
import './register-components'

import Vue from 'vue'

import App from './App.vue'
import router from './router'
import store from './store'

import './permission'
import './errorLog'

const app = new Vue({
  router,
  store,
  ...App
})

Vue.config.productionTip = false

async function start () {
  // 初始化用户信息存入 store
  await store.dispatch('setUserInfo')
  app.$mount('#app')
}

start()
