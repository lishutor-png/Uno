package com.unoarena.game.ui

import android.content.pm.ActivityInfo
import android.os.Build
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.unoarena.game.MainActivity

/**
 * Capacitor Plugin controlling native Android screen orientation and immersive
 * sticky fullscreen dynamically without restarting the Activity or losing state.
 */
@CapacitorPlugin(name = "UnoOrientation")
class UnoOrientationPlugin : Plugin() {

    @PluginMethod
    fun setOrientation(call: PluginCall) {
        val mode = call.getString("mode") ?: "auto"
        val currentActivity = activity
        if (currentActivity == null) {
            call.resolve(JSObject().apply {
                put("applied", false)
                put("mode", mode)
            })
            return
        }

        val targetOrientation = when (mode) {
            "portrait" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
            "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            else -> ActivityInfo.SCREEN_ORIENTATION_FULL_USER
        }

        currentActivity.runOnUiThread {
            currentActivity.requestedOrientation = targetOrientation
            if (currentActivity is MainActivity && currentActivity.immersiveFullscreenEnabled) {
                currentActivity.applyImmersiveFullscreen(true)
            }
            call.resolve(JSObject().apply {
                put("applied", true)
                put("mode", mode)
            })
        }
    }

    @PluginMethod
    fun setFullscreen(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: true
        val currentActivity = activity
        if (currentActivity == null) {
            call.resolve(JSObject().apply {
                put("applied", false)
                put("enabled", enabled)
            })
            return
        }

        currentActivity.runOnUiThread {
            if (currentActivity is MainActivity) {
                currentActivity.applyImmersiveFullscreen(enabled)
            } else {
                val window = currentActivity.window
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
            call.resolve(JSObject().apply {
                put("applied", true)
                put("enabled", enabled)
            })
        }
    }
}
