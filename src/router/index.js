import Vue from 'vue'
import Router from 'vue-router'

import SSH from '@views/ssh'
import NoVNC from '@views/no-vnc'
import Spice from '@views/spice'
import WMKS from '@views/wmks'

Vue.use(Router)

export const constantRouterMap = [
  {
    path: '/no-vnc',
    name: 'noVNC',
    meta: {
      title: 'noVNC'
    },
    component: NoVNC
  },
  {
    path: '/ssh',
    name: 'ssh',
    meta: {
      title: 'SSH'
    },
    component: SSH
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
