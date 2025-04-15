<template>
  <div></div>
</template>

<script>
import { getConnectParams } from '@utils/auth'

const PATH = {
  vnc: '/no-vnc',
  spice: '/spice',
  wmks: '/wmks',
  tty: '/tty',
  ws: '/ws',
  rdp: '/rdp'
}

export default {
  name: 'Index',
  created () {
    const query = getConnectParams(this)
    const path = PATH[query.protocol] || '/tty'
    this.$router.push({
      path,
      query: this.$route.query
    })
  }
}
</script>
