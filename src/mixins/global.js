import { mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      $userInfo: 'userInfo'
    }),
    $isSystemAdmin () {
      return this.$userInfo.projects.some(item => item.id === this.$userInfo.projectId && item.admin_capable)
    }
  }
}
