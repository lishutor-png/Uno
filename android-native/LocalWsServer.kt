package com.unoarena.game.lan

import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

interface LocalWsServerListener {
    fun onServerStarted(port: Int)
    fun onClientConnected(connectionId: String, remoteAddress: String)
    fun onClientMessage(connectionId: String, payload: String)
    fun onClientDisconnected(connectionId: String, code: Int, reason: String)
    fun onServerError(message: String)
}

/**
 * Offline WebSocket Server running locally on the Android Host device.
 * Accepts connections from other phones over Wi-Fi Hotspot or Local Router (no internet required).
 */
class LocalWsServer(
    port: Int,
    private val listener: LocalWsServerListener
) : WebSocketServer(InetSocketAddress("0.0.0.0", port)) {

    private val socketToId = ConcurrentHashMap<WebSocket, String>()
    private val idToSocket = ConcurrentHashMap<String, WebSocket>()

    init {
        isReuseAddr = true
        connectionLostTimeout = 15
    }

    override fun onStart() {
        listener.onServerStarted(port)
    }

    override fun onOpen(conn: WebSocket, handshake: ClientHandshake?) {
        val connectionId = "conn_${UUID.randomUUID().toString().take(12)}"
        socketToId[conn] = connectionId
        idToSocket[connectionId] = conn
        val remote = conn.remoteSocketAddress?.address?.hostAddress ?: "unknown"
        listener.onClientConnected(connectionId, remote)
    }

    override fun onMessage(conn: WebSocket, message: String) {
        val connectionId = socketToId[conn] ?: return
        listener.onClientMessage(connectionId, message)
    }

    override fun onClose(conn: WebSocket, code: Int, reason: String?, remote: Boolean) {
        val connectionId = socketToId.remove(conn) ?: return
        idToSocket.remove(connectionId)
        listener.onClientDisconnected(connectionId, code, reason ?: "")
    }

    override fun onError(conn: WebSocket?, ex: Exception?) {
        listener.onServerError(ex?.message ?: "Unknown WebSocket server error")
    }

    fun sendToClient(connectionId: String, payload: String): Boolean {
        val socket = idToSocket[connectionId] ?: return false
        if (!socket.isOpen) return false
        socket.send(payload)
        return true
    }

    fun broadcastPayload(payload: String) {
        for (socket in idToSocket.values) {
            if (socket.isOpen) {
                socket.send(payload)
            }
        }
    }

    fun kickClient(connectionId: String, reason: String) {
        val socket = idToSocket[connectionId] ?: return
        if (socket.isOpen) {
            socket.close(4001, reason)
        }
    }

    companion object {
        /**
         * Discovers active local IPv4 addresses (Hotspot AP interfaces and Wi-Fi LAN interfaces).
         */
        fun getLocalIpv4Addresses(): List<String> {
            val results = mutableListOf<String>()
            try {
                val interfaces = NetworkInterface.getNetworkInterfaces() ?: return emptyList()
                val sorted = interfaces.toList().sortedBy { iface ->
                    val name = iface.name.lowercase()
                    when {
                        name.startsWith("p2p") -> 0
                        name.startsWith("ap") || name.startsWith("swlan") -> 1
                        name.startsWith("wlan") -> 2
                        else -> 3
                    }
                }
                for (iface in sorted) {
                    if (!iface.isUp || iface.isLoopback) continue
                    val addrs = iface.inetAddresses
                    while (addrs.hasMoreElements()) {
                        val addr = addrs.nextElement()
                        if (addr is Inet4Address && !addr.isLoopbackAddress) {
                            addr.hostAddress?.let { ip ->
                                if (!results.contains(ip)) results.add(ip)
                            }
                        }
                    }
                }
            } catch (_: Exception) {
                // Ignore interface enumeration errors
            }
            return results
        }
    }
}
