<template>
  <div class="wrap" id="spice-wrap">
    <!-- <iframe :src="spiceUrl" scrolling="no" /> -->
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import qs from 'qs'

export default {
  computed: {
    data () {
      return {
        connectParams: {}
      }
    },
    spiceUrl () {
      let url = `${process.env.BASE_URL}/spice-vendor/index.html`
      const { ips, instance_name: instanceName } = this.connectParams
      const { ips: ips2, instanceName: instanceName2 } = this.$route.query
      if ((ips || ips2) && (instanceName || instanceName2)) {
        url += `?ips=${ips || ips2}&instanceName=${instanceName || instanceName2}`
      }
      return url
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
    this.connectParams = window.getQuery()
  },
  mounted () {
    this.initNode()
  },
  methods: {
    getSpecilUrl () {
      let url = `${process.env.BASE_URL}/spice-vendor/index.html`
      const { ips, instance_name: instanceName, secret_level } = this.connectParams
      const { ips: ips2, instanceName: instanceName2, secret_level: secret_level2 } = this.$route.query
      if ((ips || ips2) && (instanceName || instanceName2)) {
        url += `?ips=${ips || ips2}&instanceName=${instanceName || instanceName2}&secret_level=${secret_level || secret_level2}`
      }
      return url
    },
    initNode () {
      const { ips } = this.connectParams
      const { ips: ips2 } = this.$route.query
      if (ips || ips2) {
        document.title = ips || ips2
      }
      const iframe = document.createElement('iframe')
      iframe.src = this.getSpecilUrl()
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.margin = 0
      iframe.style.padding = 0
      iframe.style.border = 'none'

      const fn = function () {
        setTimeout(function () {}, 0)
      }
      iframe.addEventListener('load', fn)
      document.getElementById('spice-wrap').appendChild(iframe)
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
