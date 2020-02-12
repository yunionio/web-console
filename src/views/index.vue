<template>
  <div></div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'

const PATH = {
  vnc: '/no-vnc',
  spice: '/spice',
  wmks: '/wmks',
  tty: '/tty'
}

export default {
  name: 'Index',
  created () {
    let query = this.$route.query
    if (query.data) {
      query = {
        ...qs.parse(Base64.decode(query.data)),
        ...query
      }
    }
    const path = PATH[query.protocol] || '/tty'
    this.$router.push({
      path,
      query: this.$route.query
    })
  }
}
</script>
