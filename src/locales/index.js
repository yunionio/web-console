import Vue from 'vue'
import VueI18n from 'vue-i18n'
import en from './en'
import zhCN from './zh-CN'
import { getLanguage } from '@/utils/common/cookie'

Vue.use(VueI18n)

const messages = {
  en,
  'zh-CN': zhCN
}

const i18n = new VueI18n({
  locale: getLanguage(),
  messages,
  fallbackLocale: 'zh-CN'
  // silentTranslationWarn: true,
})

export default i18n
