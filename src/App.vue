<template>
  <a-config-provider :locale="locale">
    <div id="app">
      <div class="app-content">
        <component :is="layout">
          <router-view />
        </component>
      </div>
    </div>
  </a-config-provider>
</template>

<script>
import zhCN from 'ant-design-vue/lib/locale-provider/zh_CN'
import DefaultLayout from '@views/layout/Default'

export default {
  name: 'App',
  components: {
    DefaultLayout
  },
  data () {
    return {
      locale: zhCN
    }
  },
  computed: {
    layout () {
      return `${(this.$route.meta.layout || 'default')}-layout`
    }
  },
  mounted () {
    this.checkPageAccess()
    // window.addEventListener('beforeunload', e => this.beforeunloadHandler(e))
    window.onbeforeunload = this.beforeunloadHandler
  },
  methods: {
    checkPageAccess () {
      // 检查页面来源
      const referrer = document.referrer
      if (!referrer) {
        this.$router.push('/error')
        return
      }

      const currentDomain = window.location.hostname
      const referrerUrl = new URL(referrer)
      const referrerDomain = referrerUrl.hostname
      // 检查域名是否相同
      if (currentDomain !== referrerDomain) {
        this.$router.push('/error')
      }

      // 检查 query 中 data 是否为base64编码
      const query = this.$route.query
      if (query.api_server) {
        this.$router.push('/error')
      }
    },
    beforeunloadHandler (e) {
      e = e || window.event
      if (e) {
        e.returnValue = '关闭提示'
      }
      return '关闭提示'
    }
  }

}
</script>
