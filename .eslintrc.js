module.exports = {
  root: true,
  env: {
    node: true
  },
  'extends': [
    'plugin:vue/essential',
    '@vue/standard'
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'vue/attribute-hyphenation': 0,
    'vue/html-closing-bracket-newline': 0,
    'vue/html-closing-bracket-spacing': ['error', { 'selfClosingTag': 'always' }],
    'vue/html-quotes': ['error', 'double'],
    'vue/mustache-interpolation-spacing': ['error', 'always'],
    'vue/name-property-casing': ['error', 'PascalCase'],
    'vue/no-parsing-error': [2, { 'x-invalid-end-tag': false }],
    'vue/order-in-components': ['error', {
      'order': [
        'el',
        'name',
        'parent',
        'functional',
        ['delimiters', 'comments'],
        ['components', 'directives', 'filters'],
        'extends',
        'mixins',
        'inheritAttrs',
        'model',
        ['props', 'propsData'],
        'data',
        'computed',
        'watch',
        'LIFECYCLE_HOOKS',
        'methods',
        ['template', 'render'],
        'renderError'
      ]
    }],
    'comma-dangle': 0,
    'semi': 0
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
}
