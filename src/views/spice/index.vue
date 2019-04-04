<template>
  <div class="wrap">
    <iframe :src="spiceUrl" scrolling="no" />
  </div>
</template>

<script>
export default {
  computed: {
    spiceUrl () {
      return `${process.env.BASE_URL}/spice-vendor/index.html`
    }
  },
  destroyed () {
    delete window.getQuery
  },
  created () {
    window.getQuery = () => this.$route.query
  }
}
</script>

<style lang="scss" scoped>
.wrap {
  height: 100%;
  overflow: hidden;
  iframe {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
  }
}
</style>
