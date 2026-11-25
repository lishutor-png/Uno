package com.unoarena.game.lan

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor Plugin bridging Android LocalWsServer to the JavaScript HostRoomManager.
 */
@CapacitorPlugin(name = "UnoLocalServer")
class UnoLocalServerPlugin : Plugin() {

    private var server: LocalWsServer? = null
    private var activePort: Int = 8765

    @PluginMethod
    fun startServer(call: PluginCall) {
        val requestedPort = call.getInt("port", 8765) ?: 8765

        if (server != null) {
            stopInternal()
        }

        try {
            val wsServer = LocalWsServer(requestedPort, object : LocalWsServerListener {
                override fun onServerStarted(port: Int) {
                    activePort = port
                    val ips = LocalWsServer.getLocalIpv4Addresses()
                    val ipArray = JSArray()
                    ips.forEach { ipArray.put(it) }

                    val ret = JSObject().apply {
                        put("started", true)
                        put("port", port)
                        put("ipAddresses", ipArray)
                        put("primaryIp", ips.firstOrNull() ?: "")
                    }
                    call.resolve(ret)
                }

                override fun onClientConnected(connectionId: String, remoteAddress: String) {
                    val data = JSObject().apply {
                        put("connectionId", connectionId)
                        put("remoteAddress", remoteAddress)
                    }
                    notifyListeners("clientConnected", data)
                }

                override fun onClientMessage(connectionId: String, payload: String) {
                    val data = JSObject().apply {
                        put("connectionId", connectionId)
                        put("payload", payload)
                    }
                    notifyListeners("clientMessage", data)
                }

                override fun onClientDisconnected(connectionId: String, code: Int, reason: String) {
                    val data = JSObject().apply {
                        put("connectionId", connectionId)
                        put("code", code)
                        put("reason", reason)
                    }
                    notifyListeners("clientDisconnected", data)
                }

                override fun onServerError(message: String) {
                    val data = JSObject().apply {
                        put("message", message)
                    }
                    notifyListeners("serverError", data)
                }
            })

            server = wsServer
            wsServer.start()
        } catch (e: Exception) {
            server = null
            call.reject("Gagal menjalankan server WebSocket lokal: ${e.message}", e)
        }
    }

    @PluginMethod
    fun stopServer(call: PluginCall) {
        stopInternal()
        val ret = JSObject().apply { put("stopped", true) }
        call.resolve(ret)
    }

    @PluginMethod
    fun sendToClient(call: PluginCall) {
        val connectionId = call.getString("connectionId")
        val payload = call.getString("payload")
        if (connectionId.isNullOrBlank() || payload == null) {
            call.reject("connectionId dan payload wajib diisi.")
            return
        }
        val sent = server?.sendToClient(connectionId, payload) ?: false
        call.resolve(JSObject().apply { put("sent", sent) })
    }

    @PluginMethod
    fun broadcast(call: PluginCall) {
        val payload = call.getString("payload")
        if (payload == null) {
            call.reject("payload wajib diisi.")
            return
        }
        server?.broadcastPayload(payload)
        call.resolve(JSObject().apply { put("sent", true) })
    }

    @PluginMethod
    fun kickClient(call: PluginCall) {
        val connectionId = call.getString("connectionId")
        val reason = call.getString("reason") ?: "Dikeluarkan oleh host"
        if (connectionId.isNullOrBlank()) {
            call.reject("connectionId wajib diisi.")
            return
        }
        server?.kickClient(connectionId, reason)
        call.resolve(JSObject().apply { put("kicked", true) })
    }

    @PluginMethod
    fun getLocalIpAddresses(call: PluginCall) {
        val ips = LocalWsServer.getLocalIpv4Addresses()
        val ipArray = JSArray()
        ips.forEach { ipArray.put(it) }
        call.resolve(JSObject().apply {
            put("ipAddresses", ipArray)
            put("primaryIp", ips.firstOrNull() ?: "")
            put("port", activePort)
        })
    }

    override fun handleOnDestroy() {
        stopInternal()
        super.handleOnDestroy()
    }

    private fun stopInternal() {
        try {
            server?.stop(500)
        } catch (_: Exception) {
            // Ignore shutdown errors
        } finally {
            server = null
        }
    }
}
