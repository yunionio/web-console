import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

function loadView (view) {
  return () => import(/* webpackChunkName: "view-[request]" */ `@views/${view}`)
}

export const constantRouterMap = [
  {
    path: '/',
    name: 'index',
    meta: {
      title: 'Index'
    },
    component: loadView('index')
  },
  {
    path: '/no-vnc',
    name: 'noVNC',
    meta: {
      title: 'noVNC'
    },
    component: loadView('no-vnc')
  },
  {
    path: '/tty',
    name: 'tty',
    meta: {
      title: 'TTY'
    },
    component: loadView('tty')
  },
  {
    path: '/spice',
    name: 'spice',
    meta: {
      title: 'Spice'
    },
    component: loadView('spice')
  },
  {
    path: '/wmks',
    name: 'wmks',
    meta: {
      title: 'WMKS'
    },
    component: loadView('wmks')
  }
]

export const adminRouterMap = []

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: constantRouterMap.concat(adminRouterMap)
})

export default router
