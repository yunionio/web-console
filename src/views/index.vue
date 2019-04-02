<template>
  <div></div>
</template>

<script>
const PATH = {
  vnc: '/no-vnc',
  spice: '/spice',
  wmks: '/wmks'
}

export default {
  name: 'Index',
  created () {
    const query = this.$route.query
    const path = PATH[query.protocol] || '/ssh'
    this.$router.push({
      path,
      query: this.$route.query
    })
  }
}
</script>
