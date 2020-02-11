import Vue from 'vue'
import Router from 'vue-router'
import Index from '@views/index'
import NoVNC from '@views/no-vnc'
import TTY from '@views/tty'
import Spice from '@views/spice'
import WMKS from '@views/wmks'

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
  }
]

export const adminRouterMap = []

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: constantRouterMap.concat(adminRouterMap)
})

export default router
