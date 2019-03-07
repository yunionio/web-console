import Vue from 'vue'
import Antd from 'ant-design-vue'

import 'normalize.css'
import '@styles/antd/index.less'
import '@styles/index.scss'

import Http from '@utils/http'

// mixins
import GlobalMixin from '@mixins/global'

Vue.mixin(GlobalMixin)

Vue.use(Antd)
Vue.use(Http)
