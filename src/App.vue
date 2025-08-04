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
import { getConnectParams } from '@utils/auth'

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
    // this.checkPageAccess()
    // window.addEventListener('beforeunload', e => this.beforeunloadHandler(e))
    window.onbeforeunload = this.beforeunloadHandler
  },
  methods: {
    checkPageAccess () {
      // 检查页面来源
      const referrer = document.referrer
      // 直接打开
      if (!referrer) {
        this.$router.push('/error')
        return
      }

      const currentDomain = window.location.hostname
      const parseQuery = getConnectParams(this)
      const { referer_whitelist = '' } = parseQuery
      const whiteList = referer_whitelist ? referer_whitelist.split(',') : []
      const contains = whiteList.some(referrer => {
        const referrerUrl = new URL(referrer)
        const referrerDomain = referrerUrl.hostname
        return currentDomain === referrerDomain
      })
      // 配置了但是没有匹配
      if (referer_whitelist) {
        if (!contains) {
          this.$router.push('/error')
          return
        }
      } else {
        // 没配置 检查是否同源
        const referrerUrl = new URL(referrer)
        const referrerDomain = referrerUrl.hostname
        if (currentDomain !== referrerDomain) {
          this.$router.push('/error')
          return
        }
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
