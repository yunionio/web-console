<template>
  <div class="wrap" id="spice-wrap">
    <!-- <iframe :src="spiceUrl" scrolling="no" /> -->
  </div>
</template>

<script>
import { addWaterMark } from '../../utils/watermark'
import { getConnectParams } from '@utils/auth'

export default {
  data () {
    return {
      connectParams: {}
    }
  },
  computed: {
    spiceUrl () {
      let url = `${process.env.BASE_URL}/spice-vendor/index.html`
      const { ips, instanceName } = this.connectParams
      if (ips && instanceName) {
        url += `?ips=${ips}&instanceName=${instanceName}`
      }
      return url
    }
  },
  destroyed () {
    delete window.getQuery
  },
  created () {
    window.getQuery = () => {
      const query = getConnectParams(this)
      return query
    }
    this.connectParams = window.getQuery()
    window.addWaterMark = addWaterMark
  },
  mounted () {
    this.initNode()
  },
  methods: {
    getSpecilUrl () {
      let url = `${process.env.BASE_URL}/spice-vendor/index.html`
      const { ips, instance_name: instanceName, water_mark: waterMark, secret_level } = this.connectParams
      if (ips && instanceName) {
        url += `?ips=${ips}&instanceName=${instanceName}&waterMark=${waterMark}&secret_level=${secret_level}`
      }
      return url
    },
    initNode () {
      const { ips } = this.connectParams
      if (ips) {
        document.title = ips
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
