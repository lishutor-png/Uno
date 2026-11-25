package com.unoarena.game.ui

import android.content.pm.ActivityInfo
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor Plugin controlling native Android screen orientation dynamically
 * based on active game mode without restarting the Activity or losing state.
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
            call.resolve(JSObject().apply {
                put("applied", true)
                put("mode", mode)
            })
        }
    }
}
