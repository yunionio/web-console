
function cssHelper (el, prototype) {
  for (const i in prototype) {
    el.style[i] = prototype[i]
  }
}
function createItem (text) {
  const item = document.createElement('div')
  item.innerHTML = text
  cssHelper(item, {
    position: 'absolute',
    top: '100px',
    left: '100px',
    fontSize: '18px',
    color: '#ccc',
    lineHeight: 1.5,
    opacity: 0.2,
    transform: 'rotate(-20deg)',
    transformOrigin: '0 0',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textAlign: 'center'
  })
  return item
}

export const addWaterMark = ({ text, wrapperStyle, targetDom }) => {
  const watermark1 = document.getElementById('watermark')
  // 在创建新的水印节点之前，先判断有没有，有的话删掉
  if (watermark1) document.body.removeChild(watermark1)
  const waterWrapper = document.createElement('div')
  waterWrapper.id = 'watermark'
  cssHelper(waterWrapper, {
    position: 'fixed',
    top: '0',
    right: '-100px ',
    bottom: '-100px',
    left: '-100px',
    overflow: 'hidden',
    display: 'flex',
    'flex-wrap': 'wrap',
    'pointer-events': 'none',
    'z-index': '1000',
    ...wrapperStyle
  })
  // 宽高值越小，水印越密集
  // 宽高值越大，水印越稀疏
  const waterHeight = 200
  const waterWidth = 320
  const { clientWidth, clientHeight } = document.documentElement || document.body
  const column = Math.ceil(clientWidth / waterWidth)
  const rows = Math.ceil(clientHeight / waterHeight)

  for (let i = 0; i < column * rows; i++) {
    const wrap = document.createElement('div')
    cssHelper(wrap, Object.create({
      position: 'relative',
      width: `${waterWidth}px`,
      height: `${waterHeight}px`,
      flex: `0 0 ${waterWidth}px`,
      overflow: 'hidden'
    }))
    wrap.appendChild(createItem(text))
    waterWrapper.appendChild(wrap)
  }
  targetDom.appendChild(waterWrapper)
}

export const removeWaterMark = () => {
  var watermark = document.getElementById('watermark')
  if (watermark) {
    document.body.removeChild(watermark)
  }
}
