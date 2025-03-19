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
    // window.addEventListener('beforeunload', e => this.beforeunloadHandler(e))
    window.onbeforeunload = this.beforeunloadHandler
  },
  methods: {
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
