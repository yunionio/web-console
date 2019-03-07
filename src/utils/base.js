export function camel2Words (camel) {
  let tmp = ''
  for (let i = 0, len = camel.length; i < len; i++) {
    let ch = camel.charAt(i)
    if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) {
      if (tmp.length > 0) {
        tmp += '-'
      }
      tmp += ch.toLowerCase()
    } else {
      tmp += ch
    }
  }
  return tmp.split('-')
}
