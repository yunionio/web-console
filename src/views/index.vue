<template>
  <div></div>
</template>

<script>
const PATH = {
  vnc: '/no-vnc',
  spice: '/spice',
  wmks: '/wmks',
  tty: '/tty'
}

export default {
  name: 'Index',
  created () {
    const query = this.$route.query
    const path = PATH[query.protocol] || '/tty'
    this.$router.push({
      path,
      query: this.$route.query
    })
  }
}
</script>
