import { getSession } from '@utils/auth'
import { getUserInfo } from '@api/auth'

const permissions = {
  state: {
    userInfo: {
      displayname: null,
      domain: {},
      email: null,
      enabled: false,
      exp: null,
      hypervisors: [],
      id: null,
      k8sdashboard: [],
      menus: [],
      name: null,
      projectId: null,
      projectName: null,
      projects: [],
      regions: [],
      roles: [],
      services: [],
      session: null,
      ...getSession()
    }
  },
  mutations: {
    SET_USER_INFO (state, payload) {
      state.userInfo = Object.assign(state.userInfo, payload)
    },
    SET_SESSION (state, payload) {
      state.userInfo.session = payload.session
      state.userInfo.exp = payload.exp
    }
  },
  actions: {
    setUserInfo ({ commit }) {
      return new Promise((resolve, reject) => {
        getUserInfo().then(response => {
          const data = response.data.data
          commit('SET_USER_INFO', data)
          resolve(data)
        }).catch(error => {
          reject(error)
        })
      })
    },
    updateSessionByCookie ({ commit }) {
      const session = getSession()
      commit('SET_SESSION', session)
    }
  }
}

export default permissions
