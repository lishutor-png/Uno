package com.unoarena.game.lan

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Capacitor Plugin bridging Android LocalWsServer to the JavaScript HostRoomManager.
 * Enforces serialized start/stop lifecycle so Host can create and close Rooms repeatedly.
 */
@CapacitorPlugin(name = "UnoLocalServer")
class UnoLocalServerPlugin : Plugin() {

    private val serverLock = Any()
    private var server: LocalWsServer? = null
    private var activePort: Int = 8765

    @Volatile
    private var serverState: String = "IDLE"

    @PluginMethod
    fun startServer(call: PluginCall) {
        val requestedPort = call.getInt("port", 8765) ?: 8765
        val settled = AtomicBoolean(false)

        synchronized(serverLock) {
            if (server != null) {
                serverState = "CLOSING"
                stopInternalLocked()
                try {
                    Thread.sleep(60)
                } catch (_: InterruptedException) {
                    // Ignore
                }
            }

            serverState = "CREATING"
            try {
                lateinit var wsServer: LocalWsServer
                wsServer = LocalWsServer(requestedPort, object : LocalWsServerListener {
                    override fun onServerStarted(port: Int) {
                        synchronized(serverLock) {
                            if (server === wsServer) {
                                activePort = port
                                serverState = "WAITING"
                            }
                        }
                        if (settled.compareAndSet(false, true)) {
                            val ips = LocalWsServer.getLocalIpv4Addresses()
                            val ipArray = JSArray()
                            ips.forEach { ipArray.put(it) }

                            val ret = JSObject().apply {
                                put("started", true)
                                put("port", port)
                                put("ipAddresses", ipArray)
                                put("primaryIp", ips.firstOrNull() ?: "")
                                put("state", "WAITING")
                            }
                            call.resolve(ret)
                        }
                    }

                    override fun onServerStartFailed(message: String) {
                        synchronized(serverLock) {
                            if (server === wsServer) {
                                server = null
                                serverState = "ERROR"
                            }
                        }
                        if (settled.compareAndSet(false, true)) {
                            call.reject("Gagal membuka server WebSocket lokal di port $requestedPort: $message")
                        }
                    }

                    override fun onClientConnected(connectionId: String, remoteAddress: String) {
                        synchronized(serverLock) {
                            if (server !== wsServer) return
                        }
                        val data = JSObject().apply {
                            put("connectionId", connectionId)
                            put("remoteAddress", remoteAddress)
                        }
                        notifyListeners("clientConnected", data)
                    }

                    override fun onClientMessage(connectionId: String, payload: String) {
                        synchronized(serverLock) {
                            if (server !== wsServer) return
                        }
                        val data = JSObject().apply {
                            put("connectionId", connectionId)
                            put("payload", payload)
                        }
                        notifyListeners("clientMessage", data)
                    }

                    override fun onClientDisconnected(connectionId: String, code: Int, reason: String) {
                        synchronized(serverLock) {
                            if (server !== wsServer) return
                        }
                        val data = JSObject().apply {
                            put("connectionId", connectionId)
                            put("code", code)
                            put("reason", reason)
                        }
                        notifyListeners("clientDisconnected", data)
                    }

                    override fun onServerError(message: String) {
                        synchronized(serverLock) {
                            if (server !== wsServer) return
                        }
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
                serverState = "ERROR"
                if (settled.compareAndSet(false, true)) {
                    call.reject("Gagal menjalankan server WebSocket lokal: ${e.message}", e)
                }
            }
        }
    }

    @PluginMethod
    fun stopServer(call: PluginCall) {
        synchronized(serverLock) {
            serverState = "CLOSING"
            stopInternalLocked()
            serverState = "IDLE"
        }
        val ret = JSObject().apply {
            put("stopped", true)
            put("state", "IDLE")
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun getServerStatus(call: PluginCall) {
        val currentServer: LocalWsServer?
        val currentState: String
        val portCopy: Int
        synchronized(serverLock) {
            currentServer = server
            currentState = serverState
            portCopy = activePort
        }
        call.resolve(JSObject().apply {
            put("state", currentState)
            put("activePort", portCopy)
            put("connectedClients", currentServer?.getConnectedCount() ?: 0)
        })
    }

    @PluginMethod
    fun sendToClient(call: PluginCall) {
        val connectionId = call.getString("connectionId")
        val payload = call.getString("payload")
        if (connectionId.isNullOrBlank() || payload == null) {
            call.reject("connectionId dan payload wajib diisi.")
            return
        }
        val activeServer = synchronized(serverLock) { server }
        val sent = activeServer?.sendToClient(connectionId, payload) ?: false
        call.resolve(JSObject().apply { put("sent", sent) })
    }

    @PluginMethod
    fun broadcast(call: PluginCall) {
        val payload = call.getString("payload")
        if (payload == null) {
            call.reject("payload wajib diisi.")
            return
        }
        val activeServer = synchronized(serverLock) { server }
        activeServer?.broadcastPayload(payload)
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
        val activeServer = synchronized(serverLock) { server }
        activeServer?.kickClient(connectionId, reason)
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
        synchronized(serverLock) {
            stopInternalLocked()
            serverState = "IDLE"
        }
        super.handleOnDestroy()
    }

    private fun stopInternalLocked() {
        val existing = server
        server = null
        try {
            existing?.shutdown()
        } catch (_: Exception) {
            // Ignore shutdown errors
        } finally {
            serverState = "IDLE"
        }
    }
}
