import 'babel-polyfill'
import './plugins'
import './register-components'

import Vue from 'vue'

import App from './App.vue'
import router from './router'
import store from './store'
import i18n from './locales'

import './permission'
import './errorLog'

import './styles/global.scss'

function initDebug () {
  if (window.Storage && window.localStorage && window.localStorage instanceof Storage) {
    window.localStorage.setItem('debug', 'app:*')
  }
}

const app = new Vue({
  router,
  store,
  i18n,
  ...App
})

Vue.config.productionTip = false

async function start () {
  // 初始化 debug
  initDebug()
  // 初始化用户信息存入 store
  // await store.dispatch('setUserInfo')
  app.$mount('#app')
}

start()
