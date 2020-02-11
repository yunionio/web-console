<template>
  <div class="wrap">
    <iframe :src="spiceUrl" scrolling="no" />
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'

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
    window.getQuery = () => {
      let query = this.$route.query
      if (query.data) {
        query = {
          ...qs.parse(Base64.decode(query.data)),
          ...query
        }
      }
      return query
    }
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
