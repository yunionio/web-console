const UNITS = ['B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']

function unitBase (unit, base) {
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

function normalizeSize (sz, unit, base) {
  return sz * unitBase(unit, base)
}

function numScale (num) {
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

function round (num, bits) {
  let scale = numScale(num)
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

export default function (sz, unit, base, precision) {
  if (typeof precision === 'undefined') {
    precision = 2
  }
  let nsz = normalizeSize(sz, unit, base)
  if (nsz < base) {
    return '' + nsz
  }
  let nbase = base
  for (let i = 1; i < UNITS.length; i++) {
    nbase *= base
    if (nsz < nbase) {
      return '' + round(nsz * base / nbase, precision) + UNITS[i]
    }
  }
  return 'NaN'
}
