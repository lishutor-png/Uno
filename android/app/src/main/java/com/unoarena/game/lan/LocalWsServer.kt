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
    fun onServerStartFailed(message: String)
    fun onClientConnected(connectionId: String, remoteAddress: String)
    fun onClientMessage(connectionId: String, payload: String)
    fun onClientDisconnected(connectionId: String, code: Int, reason: String)
    fun onServerError(message: String)
}

/**
 * Offline WebSocket Server running locally on the Android Host device.
 * Supports clean shutdown and repeated restarts across multiple Rooms without app restart.
 */
class LocalWsServer(
    port: Int,
    private val listener: LocalWsServerListener
) : WebSocketServer(InetSocketAddress("0.0.0.0", port)) {

    private val socketToId = ConcurrentHashMap<WebSocket, String>()
    private val idToSocket = ConcurrentHashMap<String, WebSocket>()

    @Volatile
    private var started = false

    @Volatile
    private var shuttingDown = false

    init {
        isReuseAddr = true
        connectionLostTimeout = 30
    }

    override fun onStart() {
        started = true
        listener.onServerStarted(port)
    }

    override fun onOpen(conn: WebSocket, handshake: ClientHandshake?) {
        if (shuttingDown) {
            try {
                conn.close(1000, "Server sedang ditutup")
            } catch (_: Exception) {
                // Ignore
            }
            return
        }
        val connectionId = "conn_${UUID.randomUUID().toString().take(12)}"
        socketToId[conn] = connectionId
        idToSocket[connectionId] = conn
        val remote = conn.remoteSocketAddress?.address?.hostAddress ?: "unknown"
        listener.onClientConnected(connectionId, remote)
    }

    override fun onMessage(conn: WebSocket, message: String) {
        if (shuttingDown) return
        val connectionId = socketToId[conn] ?: return
        listener.onClientMessage(connectionId, message)
    }

    override fun onClose(conn: WebSocket, code: Int, reason: String?, remote: Boolean) {
        val connectionId = socketToId.remove(conn) ?: return
        idToSocket.remove(connectionId)
        if (!shuttingDown) {
            listener.onClientDisconnected(connectionId, code, reason ?: "")
        }
    }

    override fun onError(conn: WebSocket?, ex: Exception?) {
        val message = ex?.message ?: "Terjadi kesalahan pada server WebSocket lokal"
        if (conn == null && !started && !shuttingDown) {
            listener.onServerStartFailed(message)
        } else if (!shuttingDown) {
            listener.onServerError(message)
        }
    }

    fun sendToClient(connectionId: String, payload: String): Boolean {
        if (shuttingDown) return false
        val socket = idToSocket[connectionId] ?: return false
        if (!socket.isOpen) return false
        return try {
            socket.send(payload)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun broadcastPayload(payload: String) {
        if (shuttingDown) return
        for (socket in idToSocket.values) {
            if (socket.isOpen) {
                try {
                    socket.send(payload)
                } catch (_: Exception) {
                    // Ignore transient send error on individual socket
                }
            }
        }
    }

    fun kickClient(connectionId: String, reason: String) {
        val socket = idToSocket[connectionId] ?: return
        if (socket.isOpen) {
            try {
                socket.close(4001, reason)
            } catch (_: Exception) {
                // Ignore close error
            }
        }
    }

    fun getConnectedCount(): Int = idToSocket.size

    fun shutdown() {
        shuttingDown = true
        for (socket in idToSocket.values.toList()) {
            try {
                if (socket.isOpen || socket.isClosing) {
                    socket.close(1000, "Room ditutup oleh Host")
                }
            } catch (_: Exception) {
                // Ignore close errors
            }
        }
        socketToId.clear()
        idToSocket.clear()
        try {
            stop(1500)
        } catch (_: Exception) {
            // Ignore shutdown errors
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
