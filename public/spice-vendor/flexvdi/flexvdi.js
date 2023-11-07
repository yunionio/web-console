function read_cookie (name) {
  var nameEQ = escape(name) + '='
  var ca = document.cookie.split(';')
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return unescape(c.substring(nameEQ.length, c.length))
  }
  return null
}
function toggleMenuBar () {
  var width = $(window).width()
  var height = $(window).height()

  if (document.getElementById('login').className == '') {
    document.getElementById('login').className = 'hidden'
    document.getElementById('menubarbutton').firstChild.data = tr.menubarbutton_alt

    var canvas = document.getElementById('canvas_0')
    var eventLayer = document.getElementById('eventLayer')
    if (canvas != null && eventLayer != null) {
      canvas.style.top = '0px'
      eventLayer.style.top = '0px'
      app.clientGui.setCanvasMargin({ x: 0, y: 0 })
      app.sendCommand('setResolution', {
			    width: width,
			    height: height
		    })
    }
  } else {
    var canvas = document.getElementById('canvas_0')
    var eventLayer = document.getElementById('eventLayer')
    if (canvas != null && eventLayer != null) {
      canvas.style.top = '0px'
      eventLayer.style.top = '0px'
      app.clientGui.setCanvasMargin({ x: 0, y: 0 })
      app.sendCommand('setResolution', {
        width: width,
        height: height
      })
    }
    document.getElementById('login').className = ''
    document.getElementById('menubarbutton').firstChild.data = tr.menubarbutton
  }
}
function showMenuBar () {
  if (document.getElementById('login').className == 'hidden') {
    document.getElementById('login').className = 'hidden-peek'
  }
}
function hideMenuBar () {
  if (document.getElementById('login').className == 'hidden-peek') {
    document.getElementById('login').className = 'hidden'
  }
}
function closeSession (inactivity) {
  inactivityClosed = true
  clearTimeout(inactivityTimer)
  clearTimeout(inactivityCountdownTimer)
  app.sendKeystroke('Win+L')
  app.disconnect()

  if (document.getElementById('fullscreen').firstChild.data == tr.fullscreen_alt) {
    toggleFullScreen(document.body)
  }

  document.getElementById('overlay').style.visibility = 'visible'
  document.getElementById('overlay').style.opacity = '1'

  if (inactivity) {
    document.getElementById('inactivity-end').style.visibility = 'visible'
  } else {
    document.getElementById('dialog-end').style.visibility = 'visible'
  }
  app.clientGui.releasePointer()
}
function showClientID () {
  var hwaddress = read_cookie('hwaddress')
  alert(tr.show_id.replace('_', hwaddress))
}
var progFS = false
var isFS = false
var wasFS = false
function toggleFullScreen (elem) {
  if ((document.fullScreenElement !== undefined && document.fullScreenElement === null) || (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) || (document.mozFullScreen !== undefined && !document.mozFullScreen) || (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen)) {
    if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen()
    } else {
      alert(tr.no_auto_fs)
    }
  } else {
    if (document.mozCancelFullScreen) {
      progFS = true
      document.mozCancelFullScreen()
    }
  }
}
function showCloseDialog () {
  document.getElementById('overlay').style.visibility = 'visible'
  document.getElementById('dialog-close').style.visibility = 'visible'
}
function closeAction (close) {
  document.getElementById('overlay').style.visibility = 'hidden'
  document.getElementById('dialog-close').style.visibility = 'hidden'
  if (close) {
    closeSession(false)
  } else if (wasFS) {
    wasFS = false
    toggleFullScreen(document.body)
  }
}
function overlayAction (fullscreen) {
  document.getElementById('overlay').style.visibility = 'hidden'
  document.getElementById('dialog-fs').style.visibility = 'hidden'
  if (fullscreen) {
    toggleMenuBar()
    toggleFullScreen(document.body)
  }
}
function showExtWin () {
  document.getElementById('overlay').style.visibility = 'visible'
  document.getElementById('extwin').style.visibility = 'visible'
}
function hideExtWin () {
  document.getElementById('overlay').style.visibility = 'hidden'
  document.getElementById('extwin').style.visibility = 'hidden'
}
function isFullScreen () {
  isFS = true
  document.getElementById('fullscreen').firstChild.data = tr.fullscreen_alt
  document.getElementById('menubarbutton').style.visibility = 'hidden'
}
function notFullScreen () {
  isFS = false
  document.getElementById('fullscreen').firstChild.data = tr.fullscreen
  document.getElementById('menubarbutton').style.visibility = 'visible'
  if (progFS) {
    progFS = false
  } else {
    wasFS = true
    showCloseDialog()
  }
}
function sendKeystroke (e) {
  app.sendKeystroke($(e).text())
  document.getElementById('inputmanager').focus()
}

function sendtext (e) {
  const text = $('#sendtext-area').val()
  app.sendtext(text)
  hideSendtextDialog()
}

function showSendtextDialog () {
  $('#dialog-sendtext').addClass('dialog-sendtext-show')
  app.updateSendtextShow(true)
}

async function sendClipBoard () {
  if (navigator.clipboard) {
    const text = await navigator.clipboard.readText()
    app.sendtext(text)
  }
}

function hideSendtextDialog () {
  $('#sendtext-area').val('')
  $('#dialog-sendtext').removeClass('dialog-sendtext-show')
  app.updateSendtextShow(false)
}

function showKeystrokesMenu () {
  $('#keystrokes-menu').toggleClass('show')
}
window.addEventListener('click', function (event) {
  if (!event.target.matches('.dropbtn')) {
    $('.dropdown-content').removeClass('show')
  }
}, false)

document.addEventListener('mozfullscreenchange', function () {
  (document.mozFullScreen) ? isFullScreen() : notFullScreen()
}, false)
inactivityTimer = null
inactivityCountdownTimer = null
inactivityCountdown = false
inactivityCountdownSecs = 0
inactivityClosed = false
function setInactivityTimer () {
  if (inactivityTimeout == 0 || inactivityClosed) {
    return
  }
  if (inactivityCountdown) {
    stopInactivityCountdown()
  }
  if (inactivityTimer != null) {
    clearTimeout(inactivityTimer)
  }
  inactivityTimer = setTimeout(inactivityHandler, inactivityTimeout * 1000)
}
function inactivityHandler () {
  startInactivityCountdown()
}
function startInactivityCountdown () {
  document.getElementById('inactivity_close_text').innerHTML =
        tr.inactivity_close_text.replace('_', inactivityGrace)
  document.getElementById('overlay').style.visibility = 'visible'
  document.getElementById('inactivity-close').style.visibility = 'visible'
  if (inactivityCountdownTimer != null) {
    clearTimeout(inactivityCountdownTimer)
  }
  inactivityCountdownSecs = inactivityGrace
  inactivityCountdownTimer = setTimeout(inactivityCountdownHandler, 1000)
  inactivityCountdown = true
}
function stopInactivityCountdown () {
  document.getElementById('overlay').style.visibility = 'hidden'
  document.getElementById('inactivity-close').style.visibility = 'hidden'
  if (inactivityCountdownTimer != null) {
    clearTimeout(inactivityCountdownTimer)
  }
  inactivityCountdown = false
  setInactivityTimer()
  document.getElementById('inputmanager').focus()
}
function inactivityCountdownHandler () {
  inactivityCountdownSecs -= 1
  if (inactivityCountdownSecs < 1) {
    document.getElementById('inactivity-close').style.visibility = 'hidden'
    inactivityClosed = true
    closeSession(true)
    return
  }
  document.getElementById('inactivity_close_text').innerHTML =
        tr.inactivity_close_text.replace('_', inactivityCountdownSecs)
  if (inactivityCountdownTimer != null) {
    clearTimeout(inactivityCountdownTimer)
  }
  inactivityCountdownTimer = setTimeout(inactivityCountdownHandler, 1000)
}
