import { Manager } from '@utils/manager'

const manager = new Manager('webconsole')

export function getSSHInfoByBaremetalId (id) {
  return manager.performAction('baremetal', id)
}

export function getSSHInfoByIp (ip) {
  return manager.performAction('ssh', ip)
}

export function getWebConsoleInfoByServerId (id) {
  return manager.performAction('server', id)
}
