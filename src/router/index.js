import Vue from 'vue'
import Router from 'vue-router'
import Index from '@views/index'
import NoVNC from '@views/no-vnc'
import TTY from '@views/tty'
import WS from '@views/ws'
import Spice from '@views/spice'
import WMKS from '@views/wmks'
import Error from '@views/error'

Vue.use(Router)

export const constantRouterMap = [
  {
    path: '/',
    name: 'index',
    meta: {
      title: 'Index'
    },
    component: Index
  },
  {
    path: '/no-vnc',
    name: 'noVNC',
    meta: {
      title: 'noVNC'
    },
    component: NoVNC
  },
  {
    path: '/tty',
    name: 'tty',
    meta: {
      title: 'TTY'
    },
    component: TTY
  },
  {
    path: '/ws',
    name: 'ws',
    meta: {
      title: 'WS'
    },
    component: WS
  },
  {
    path: '/spice',
    name: 'spice',
    meta: {
      title: 'Spice'
    },
    component: Spice
  },
  {
    path: '/wmks',
    name: 'wmks',
    meta: {
      title: 'WMKS'
    },
    component: WMKS
  },
  {
    path: '/error',
    name: 'error',
    meta: {
      title: 'Error'
    },
    component: Error
  },
]

export const adminRouterMap = []

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: constantRouterMap.concat(adminRouterMap)
})

const VueRouterPush = Router.prototype.push
Router.prototype.push = function push (to) {
  return VueRouterPush.call(this, to).catch(err => err)
}

export default router
