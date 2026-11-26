package com.unoarena.game

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.BridgeActivity
import com.unoarena.game.lan.UnoLocalServerPlugin
import com.unoarena.game.ui.UnoOrientationPlugin
import com.unoarena.game.wifidirect.UnoWifiDirectPlugin

class MainActivity : BridgeActivity() {

    var immersiveFullscreenEnabled: Boolean = true
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(UnoLocalServerPlugin::class.java)
        registerPlugin(UnoWifiDirectPlugin::class.java)
        registerPlugin(UnoOrientationPlugin::class.java)
        super.onCreate(savedInstanceState)
        applyImmersiveFullscreen(true)
    }

    override fun onResume() {
        super.onResume()
        if (immersiveFullscreenEnabled) {
            applyImmersiveFullscreen(true)
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && immersiveFullscreenEnabled) {
            applyImmersiveFullscreen(true)
        }
    }

    fun applyImmersiveFullscreen(enabled: Boolean = true) {
        immersiveFullscreenEnabled = enabled
        WindowCompat.setDecorFitsSystemWindows(window, !enabled)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val attrs = window.attributes
            attrs.layoutInDisplayCutoutMode = if (enabled) {
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            } else {
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
            }
            window.attributes = attrs
        }

        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        if (enabled) {
            controller.hide(WindowInsetsCompat.Type.systemBars())
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars())
        }
    }
}
