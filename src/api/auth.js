import { Manager } from '@utils/manager'

const manager = new Manager('auth')

export function logout () {
  return manager.performClassAction('logout')
}

export function login (data) {
  return manager.performClassAction('login', data)
}

export function getUserInfo (params) {
  return manager.get('user', params)
}
