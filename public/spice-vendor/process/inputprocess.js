wdi.InputProcess = $.spcExtend(wdi.EventObject.prototype, {
  clientGui: null,
  spiceConnection: null,
  pendingCtrlKey: false,
  pendingAltKey: false,
  altGrCombo: false,

  init: function (c) {
    this.superInit()
    this.clientGui = c.clientGui
    this.spiceConnection = c.spiceConnection
  },

  process: function (spiceMessage) {
    switch (spiceMessage.messageType) {
      case wdi.SpiceVars.SPICE_MSG_INPUTS_MOUSE_MOTION_ACK:
        this.clientGui.motion_ack()
        break
    }
  },

  send: function (data, type) {
    var packet, scanCodes, i
    setInactivityTimer()
    if (type == 'mousemove') {
      var mouse_mode = data[1][3]
      if (mouse_mode == wdi.SpiceMouseModeTypes.SPICE_MOUSE_MODE_CLIENT) {
        packet = new wdi.SpiceMessage({
          messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_MOUSE_POSITION,
          channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
          args: new wdi.RedcMousePosition({
            x: data[1][0] + wdi.VirtualMouse.hotspot.x,
            y: data[1][1] + wdi.VirtualMouse.hotspot.y,
            buttons_state: data[1][2],
            display_id: 0
          })
        })
        this.spiceConnection.send(packet)
      } else {
        var dx = data[1][0]
        var dy = data[1][1]

        if (dx != 0 || dy != 0) {
          packet = new wdi.SpiceMessage({
            messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_MOUSE_MOTION,
            channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
            args: new wdi.RedcMouseMotion({
              x: dx,
              y: dy,
              buttons_state: data[1][2]
            })
          })
          this.spiceConnection.send(packet)
        }

        wdi.VirtualMouse.lastMousePosition.x += dx
        wdi.VirtualMouse.lastMousePosition.y += dy
      }
    } else if (type == 'mousedown') {
      packet = new wdi.SpiceMessage({
        messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_MOUSE_PRESS,
        channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
        args: new wdi.RedcMousePress({
          button_id: data[1] + 1,
          buttons_state: 1 << data[1]
        })
      })
      this.spiceConnection.send(packet)
    } else if (type == 'mouseup') {
      packet = new wdi.SpiceMessage({
        messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_MOUSE_RELEASE,
        channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
        args: new wdi.RedcMousePress({
          button_id: data[1] + 1,
          buttons_state: 0
        })
      })
      this.spiceConnection.send(packet)
    } else if (type == 'keydown' || type == 'keypress') {
      scanCodes = wdi.Keymap.getScanCodes(data[1][0], this.altGrCombo, type)
      if (scanCodes.length == 1 && !data[1][0]['generated']) {
        if (scanCodes[0][0] == 56) {
          if (this.pendingCtrlKey) {
            console.log('INPUTS_KEY_DOWN: enabling altGrCombo')
            this.pendingCtrlKey = false
            this.altGrCombo = true
          } else {
            console.log('INPUTS_KEY_DOWN: ommitting Alt key')
            this.pendingAltKey = true
          }
          return
        } else if (scanCodes[0][0] == 224 && scanCodes[0][1] == 29) {
          if (this.pendingAltKey) {
            console.log('INPUTS_KEY_DOWN: enabling altGrCombo')
            this.pendingAltKey = false
            this.altGrCombo = true
          } else {
            console.log('INPUTS_KEY_DOWN: ommitting Ctrl key')
            this.pendingCtrlKey = true
          }
          return
        } else if (scanCodes[0][0] == 0x15B) {
          console.log('INPUTS_KEY_DOWN: detected Meta')
        }
      }
      for (i = 0; i < scanCodes.length; i++) {
        console.log('INPUTS_KEY_DOWN: ' + scanCodes[i])
        this.pendingAltKey = false
        this.pendingCtrlKey = false
        packet = new wdi.SpiceMessage({
          messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_KEY_DOWN,
          channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
          args: new wdi.SpiceScanCode(scanCodes[i])
        })
        this.spiceConnection.send(packet)
      }
    } else if (type == 'keyup') {
      scanCodes = wdi.Keymap.getScanCodes(data[1][0], this.altGrCombo, type)
      if (scanCodes.length == 1 && scanCodes[0][0] == 184) {
        if (this.pendingAltKey) {
          console.log('INPUTS_KEY_UP: sending pending Alt key')
          packet = new wdi.SpiceMessage({
            messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_KEY_DOWN,
            channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
            args: new wdi.SpiceScanCode([56, 0, 0])
          })
          this.spiceConnection.send(packet)
        } else if (this.altGrCombo) {
          console.log('INPUTS_KEY_UP: disabling altGrCombo')
          this.altGrCombo = false
          return
        }
      }
      if (scanCodes.length == 1 && scanCodes[0][0] == 224 && scanCodes[0][1] == 157) {
        if (this.pendingCtrlKey) {
          console.log('INPUTS_KEY_UP: sending pending Ctrl key')
          packet = new wdi.SpiceMessage({
            messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_KEY_DOWN,
            channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
            args: new wdi.SpiceScanCode([224, 29, 0])
          })
          this.spiceConnection.send(packet)
        } else if (this.altGrCombo) {
          console.log('INPUTS_KEY_UP: disabling altGrCombo')
          this.altGrCombo = false
          return
        }
      }
      for (i = 0; i < scanCodes.length; i++) {
        console.log('INPUTS_KEY_UP: ' + scanCodes[i])
        this.pendingAltKey = false
        this.pendingCtrlKey = false
        packet = new wdi.SpiceMessage({
          messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_KEY_UP,
          channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
          args: new wdi.SpiceScanCode(scanCodes[i])
        })
        this.spiceConnection.send(packet)
      }
    } else if (type == 'joystick') {
      packet = new wdi.SpiceMessage({
        messageType: wdi.SpiceVars.SPICE_MSGC_INPUTS_MOUSE_MOTION,
        channel: wdi.SpiceVars.SPICE_CHANNEL_INPUTS,
        args: new wdi.RedcMouseMotion({
          x: data[1][0],
          y: data[1][1],
          buttons_state: 0
        })
      })
      this.spiceConnection.send(packet)
    }
  }
})
