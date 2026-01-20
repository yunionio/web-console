/**
 * base config
 * author: houjiazong <houjiazong@gmail.com>
 * date: 2019/03/05
 */

const path = require('path')
const fs = require('fs')
const child_process = require('child_process')

const PROXY_TIMEOUT = 1000 * 60 * 2
const aliasSrcDir = ['api', 'assets', 'components', 'views', 'utils', 'styles', 'store', 'router', 'mixins', 'constants']

function resolve (dir) {
  return path.join(__dirname, dir)
}

function fsExistsSync (path) {
  try {
    fs.accessSync(path, fs.F_OK)
  } catch (e) {
    return false
  }
  return true
}

const nowDate = new Date()
const buildDate = `${nowDate.getFullYear() + '-' + (nowDate.getMonth() + 1) + '-' + nowDate.getDate() + ' ' + nowDate.getHours() + ':' + nowDate.getMinutes()}`

const buildInfo = {
  buildDate,
  branch: child_process.execSync('git branch --show-current').toString(),
}

const devServerCoustomConfig = fsExistsSync(resolve('./dev.server.config.js')) ? require('./dev.server.config.js') : {}
// const isProd = process.env.NODE_ENV === 'production'
const isProd = true

module.exports = {
  publicPath: '/web-console/',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: true,
  productionSourceMap: false,
  /**
   * webpack config
   * https://github.com/vuejs/vue-cli/blob/dev/docs/zh/guide/webpack.md
   */
  chainWebpack: (config) => {
    config
      .plugin('define')
      .tap((args) => {
        args[0]['process.env'] = Object.assign(args[0]['process.env'], {
          BUILD_TIME: JSON.stringify(buildInfo)
        })
        return args
      })
    config
      // https://webpack.js.org/configuration/devtool/#development
      .when(!isProd,
        config => config.devtool('cheap-source-map'),
      )
  },
  configureWebpack: (config) => {
    const aliasSrcDirConfig = {}
    aliasSrcDir.forEach(item => {
      aliasSrcDirConfig[`@${item}`] = resolve(`./src/${item}`)
    })
    Object.assign(config, {
      resolve: {
        extensions: ['.js', '.vue', '.json'],
        alias: {
          '@': resolve('./src'),
          '~': resolve('./src'),
          '@@': resolve('.'),
          '~~': resolve('.'),
          ...aliasSrcDirConfig
        },
        fallback: {
          querystring: require.resolve('querystring-es3')
        }
      }
    })
  },
  productionSourceMap: !isProd,
  parallel: require('os').cpus().length > 1,
  /**
   * 考虑到每个人的配置习惯不同，如有自定义 devServer 配置的需求请在根目录下创建 dev.server.config.js 文件
   * 然后使用 module.exports 导出配置即可，请勿直接修改以下配置 !!
   * dev.server.config.js 不进行 git 提交操作
   */
  devServer: Object.assign({
    // open: process.platform === 'darwin',
    // host: '0.0.0.0',
    port: 4000,
    // public: '0.0.0.0:4000',
    proxy: {
      '/api': {
        target: 'https://office.yunion.io/',
        ws: true,
        changeOrigin: true,
        proxyTimeout: PROXY_TIMEOUT,
        secure: false
      }
    }
  }, devServerCoustomConfig),
  // 第三方插件配置
  pluginOptions: {

  },
  css: {
    loaderOptions: {
      less: {
        lessOptions: {
          javascriptEnabled: true,
          math: 'always'
        }
      }
    }
  }
}
