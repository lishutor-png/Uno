package com.unoarena.game

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.unoarena.game.lan.UnoLocalServerPlugin
import com.unoarena.game.ui.UnoOrientationPlugin
import com.unoarena.game.wifidirect.UnoWifiDirectPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(UnoLocalServerPlugin::class.java)
        registerPlugin(UnoWifiDirectPlugin::class.java)
        registerPlugin(UnoOrientationPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
