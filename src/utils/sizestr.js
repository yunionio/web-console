export const UNITS = ['B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
class Sizestr {
  sizestr (sz, unit, base, precision = 2, end = UNITS[UNITS.length - 1]) {
    if (!sz) return '0B'
    const nsz = this.normalizeSize(sz, unit, base)
    if (nsz < base) {
      return '' + nsz
    }
    let nbase = base
    if (end === UNITS[0]) {
      return '' + sz + UNITS[0]
    }
    for (let i = 1; i < UNITS.length; i++) {
      nbase *= base
      if (nsz < nbase || UNITS[i] === end) {
        return '' + this.round(nsz * base / nbase, precision) + UNITS[i]
      }
    }
    return 'NaN'
  }

  // 在 sizestr 上加上 B 结尾
  sizestrWithUnit (...args) {
    const res = this.sizestr(...args)
    const letterReg = /[A-Z]/g
    if (res.startsWith('NaN') || res === '0B') return '0 B'
    if (res.endsWith('B')) return res.slice(0, -1) + ' B'
    if (!letterReg.test(res)) return `${res} B`
    const reg = /(\d+\.?\d*)([A-Z])/ // 12T 1.5G
    const matched = res.match(reg) // ['111T', '111', 'T']
    return `${matched[1]} ${matched[2]}B`
  }

  /**
   * 按照固定单位进行大小转换
   * @param {Number} sz 原来大小
   * @param {String} originUnit 原来单位，取值UNITS中
   * @param {String} targetUnit 目标单位，取值UNITS中
   * @param {Number}} base 单位之间进制
   * @param {Boolean} withUnit 返回是否带单位
   * @param {Number} precision 返回精度
   * @param {Array} units 单位列表，从小到大
   * @returns {Number|String} 234 | 234 KB
   */
  // 数值过小时展示为 < 0.01 MB
  sizeToDesignatedUnit (sz, originUnit, targetUnit, base = 1024, withUnit = true, precision = 2, units = UNITS) {
    if (!sz) return withUnit ? `0 ${targetUnit === 'B' ? 'B' : targetUnit + 'B'}` : 0
    const nsz = this.normalizeSize(sz, originUnit, base)
    let nbase = base
    for (let i = 1; i < UNITS.length; i++) {
      nbase *= base
      if (UNITS[i] === targetUnit) {
        const ret = this.round(nsz * base / nbase, precision)
        return withUnit ? `${sz && !ret ? '<0.01' : ret} ${targetUnit === 'B' ? 'B' : targetUnit + 'B'}` : (sz && !ret ? '<0.01' : ret)
      }
    }
    return 'NaN B'
  }

  unitBase (unit, base) {
    if (!unit) {
      return base
    }
    let unitbase = 1
    for (let i = 0; i < UNITS.length; i++) {
      if (unit.toUpperCase() === UNITS[i]) {
        return unitbase
      }
      unitbase *= base
    }
    return Math.NaN
  }

  normalizeSize (sz, unit, base) {
    return sz * this.unitBase(unit, base)
  }

  numScale (num) {
    if (parseInt(num) === 0) {
      return 0
    }
    if (num < 0) {
      num = -num
    }
    let width = 0
    while (num >= 1.0) {
      num = num / 10.0
      width += 1
    }
    while (num < 0.1) {
      num = num * 10.0
      width -= 1
    }
    return width
  }

  round (num, bits) {
    const scale = this.numScale(num)
    if (scale > bits) {
      bits = 0
    } else {
      bits -= scale
    }
    let base = 1
    for (let i = 0; i < bits; i++) {
      base *= 10
    }
    return Math.floor(num * base + 0.5) / base
  }

  percentStr (val) {
    return '' + this.round(val * 100, 0) + '%'
  }
}
const sizestrInstance = new Sizestr()

export const sizestr = sizestrInstance.sizestr.bind(sizestrInstance) // -> 12G  4.5T
export const sizestrWithUnit = sizestrInstance.sizestrWithUnit.bind(sizestrInstance) // -> 12 GB   4.5 TB
export const sizeToDesignatedUnit = sizestrInstance.sizeToDesignatedUnit.bind(sizestrInstance) // -> 12 GB   4.5 TB
export const percentstr = sizestrInstance.percentStr.bind(sizestrInstance)
