package com.unoarena.game.wifidirect

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.WpsInfo
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pGroup
import android.net.wifi.p2p.WifiP2pInfo
import android.net.wifi.p2p.WifiP2pManager
import android.os.Build
import android.os.Looper
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Capacitor Plugin for Android Native Wi-Fi Direct using WifiP2pManager.
 * Handles peer discovery, Group Owner formation, peer connection management,
 * runtime permissions, and integration with LocalWsServer.
 */
@CapacitorPlugin(
    name = "UnoWifiDirect",
    permissions = [
        Permission(
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ],
            alias = "location"
        ),
        Permission(
            strings = ["android.permission.NEARBY_WIFI_DEVICES"],
            alias = "nearbyWifi"
        )
    ]
)
class UnoWifiDirectPlugin : Plugin() {

    private var manager: WifiP2pManager? = null
    private var channel: WifiP2pManager.Channel? = null
    private var receiver: BroadcastReceiver? = null
    private var isReceiverRegistered = false
    private var isP2pEnabled = false
    private var pendingPermissionCall: PluginCall? = null
    private var pendingActionAfterPermission: (() -> Unit)? = null

    override fun load() {
        super.load()
        initWifiP2p()
    }

    override fun handleOnStart() {
        super.handleOnStart()
        registerP2pReceiver()
    }

    override fun handleOnStop() {
        unregisterP2pReceiver()
        super.handleOnStop()
    }

    override fun handleOnDestroy() {
        unregisterP2pReceiver()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            try {
                channel?.close()
            } catch (_: Exception) {
                // Ignore close error
            }
        }
        channel = null
        manager = null
        super.handleOnDestroy()
    }

    private fun initWifiP2p() {
        if (manager != null && channel != null) return
        val mgr = context.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
        manager = mgr
        if (mgr != null) {
            channel = mgr.initialize(context, Looper.getMainLooper()) {
                notifyError("CHANNEL_LOST", "Saluran Wi-Fi Direct terputus. Coba inisialisasi ulang.")
            }
        }
    }

    private fun registerP2pReceiver() {
        if (isReceiverRegistered) return
        initWifiP2p()

        val filter = IntentFilter().apply {
            addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION)
        }

        val p2pReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                when (intent.action) {
                    WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION -> {
                        val state = intent.getIntExtra(
                            WifiP2pManager.EXTRA_WIFI_STATE,
                            WifiP2pManager.WIFI_P2P_STATE_DISABLED
                        )
                        isP2pEnabled = state == WifiP2pManager.WIFI_P2P_STATE_ENABLED
                        val data = JSObject().apply {
                            put("enabled", isP2pEnabled)
                        }
                        notifyListeners("wifiP2pStateChanged", data)
                    }

                    WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> {
                        requestPeersAndNotify()
                    }

                    WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> {
                        requestConnectionAndGroupInfoAndNotify()
                    }

                    WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION -> {
                        val device = getParcelableExtraCompat(
                            intent,
                            WifiP2pManager.EXTRA_WIFI_P2P_DEVICE,
                            WifiP2pDevice::class.java
                        )
                        if (device != null) {
                            notifyListeners("thisDeviceChanged", deviceToJson(device))
                        }
                    }
                }
            }
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(p2pReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                context.registerReceiver(p2pReceiver, filter)
            }
            receiver = p2pReceiver
            isReceiverRegistered = true
        } catch (e: Exception) {
            notifyError("RECEIVER_ERROR", "Gagal mendaftarkan receiver Wi-Fi Direct: ${e.message}")
        }
    }

    private fun unregisterP2pReceiver() {
        if (!isReceiverRegistered || receiver == null) return
        try {
            context.unregisterReceiver(receiver)
        } catch (_: Exception) {
            // Ignore if already unregistered
        } finally {
            receiver = null
            isReceiverRegistered = false
        }
    }

    private fun requiredPermissionAlias(): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            "nearbyWifi"
        } else {
            "location"
        }
    }

    private fun hasRequiredP2pPermissions(): Boolean {
        return getPermissionState(requiredPermissionAlias()) == PermissionState.GRANTED
    }

    private fun ensureP2pReadyAndPermissions(
        call: PluginCall,
        onReady: () -> Unit
    ) {
        initWifiP2p()
        if (manager == null || channel == null) {
            call.reject("Perangkat ini tidak mendukung Wi-Fi Direct (WifiP2pManager).", "P2P_UNSUPPORTED")
            return
        }

        registerP2pReceiver()

        if (hasRequiredP2pPermissions()) {
            onReady()
            return
        }

        pendingPermissionCall = call
        pendingActionAfterPermission = onReady
        requestPermissionForAlias(requiredPermissionAlias(), call, "p2pPermissionCallback")
    }

    @PermissionCallback
    private fun p2pPermissionCallback(call: PluginCall) {
        val action = pendingActionAfterPermission
        pendingPermissionCall = null
        pendingActionAfterPermission = null

        if (hasRequiredP2pPermissions()) {
            action?.invoke()
        } else {
            val permLabel = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                "NEARBY_WIFI_DEVICES"
            } else {
                "ACCESS_FINE_LOCATION"
            }
            call.reject(
                "Izin $permLabel ditolak. Aktifkan izin perangkat sekitar/lokasi untuk memakai Wi-Fi Direct.",
                "PERMISSION_DENIED"
            )
        }
    }

    @PluginMethod
    fun ensurePermissions(call: PluginCall) {
        ensureP2pReadyAndPermissions(call) {
            call.resolve(JSObject().apply {
                put("granted", true)
                put("p2pEnabled", isP2pEnabled)
                put("sdkInt", Build.VERSION.SDK_INT)
            })
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun discoverPeers(call: PluginCall) {
        ensureP2pReadyAndPermissions(call) {
            val mgr = manager!!
            val ch = channel!!
            mgr.discoverPeers(ch, object : WifiP2pManager.ActionListener {
                override fun onSuccess() {
                    requestPeersAndNotify()
                    call.resolve(JSObject().apply {
                        put("discovering", true)
                    })
                }

                override fun onFailure(reasonCode: Int) {
                    call.reject(
                        "Gagal memindai perangkat Wi-Fi Direct: ${mapFailureReason(reasonCode)}",
                        mapFailureCode(reasonCode)
                    )
                }
            })
        }
    }

    @PluginMethod
    fun stopDiscovery(call: PluginCall) {
        val mgr = manager
        val ch = channel
        if (mgr == null || ch == null) {
            call.resolve(JSObject().apply { put("stopped", true) })
            return
        }
        mgr.stopPeerDiscovery(ch, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                call.resolve(JSObject().apply { put("stopped", true) })
            }

            override fun onFailure(reasonCode: Int) {
                call.reject(
                    "Gagal menghentikan pemindaian: ${mapFailureReason(reasonCode)}",
                    mapFailureCode(reasonCode)
                )
            }
        })
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun getPeers(call: PluginCall) {
        ensureP2pReadyAndPermissions(call) {
            val mgr = manager!!
            val ch = channel!!
            mgr.requestPeers(ch) { peerList ->
                val arr = JSArray()
                peerList.deviceList.forEach { dev -> arr.put(deviceToJson(dev)) }
                call.resolve(JSObject().apply {
                    put("peers", arr)
                })
            }
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun createGroup(call: PluginCall) {
        ensureP2pReadyAndPermissions(call) {
            val mgr = manager!!
            val ch = channel!!

            // Query existing group first to handle clean formation
            mgr.requestGroupInfo(ch) { existingGroup ->
                if (existingGroup != null && existingGroup.isGroupOwner) {
                    requestConnectionAndGroupInfo { infoJson ->
                        call.resolve(infoJson)
                    }
                    return@requestGroupInfo
                }

                mgr.createGroup(ch, object : WifiP2pManager.ActionListener {
                    override fun onSuccess() {
                        requestConnectionAndGroupInfo { infoJson ->
                            call.resolve(infoJson)
                        }
                    }

                    override fun onFailure(reasonCode: Int) {
                        call.reject(
                            "Gagal membentuk grup Wi-Fi Direct (Group Owner): ${mapFailureReason(reasonCode)}",
                            mapFailureCode(reasonCode)
                        )
                    }
                })
            }
        }
    }

    @PluginMethod
    fun removeGroup(call: PluginCall) {
        val mgr = manager
        val ch = channel
        if (mgr == null || ch == null) {
            call.resolve(JSObject().apply { put("removed", true) })
            return
        }

        mgr.cancelConnect(ch, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                removeP2pGroupInternal(mgr, ch, call)
            }

            override fun onFailure(reasonCode: Int) {
                removeP2pGroupInternal(mgr, ch, call)
            }
        })
    }

    private fun removeP2pGroupInternal(
        mgr: WifiP2pManager,
        ch: WifiP2pManager.Channel,
        call: PluginCall
    ) {
        mgr.removeGroup(ch, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                requestConnectionAndGroupInfoAndNotify()
                call.resolve(JSObject().apply { put("removed", true) })
            }

            override fun onFailure(reasonCode: Int) {
                if (reasonCode == WifiP2pManager.BUSY) {
                    call.resolve(JSObject().apply {
                        put("removed", false)
                        put("message", "Tidak ada grup aktif atau sistem sedang sibuk.")
                    })
                } else {
                    call.reject(
                        "Gagal membubarkan grup Wi-Fi Direct: ${mapFailureReason(reasonCode)}",
                        mapFailureCode(reasonCode)
                    )
                }
            }
        })
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun connectToPeer(call: PluginCall) {
        val address = call.getString("deviceAddress")
        if (address.isNullOrBlank()) {
            call.reject("deviceAddress wajib diisi.", "INVALID_ARGUMENT")
            return
        }
        val groupOwnerIntent = (call.getInt("groupOwnerIntent") ?: 0).coerceIn(0, 15)

        ensureP2pReadyAndPermissions(call) {
            val mgr = manager!!
            val ch = channel!!
            val config = WifiP2pConfig().apply {
                deviceAddress = address
                wps.setup = WpsInfo.PBC
                this.groupOwnerIntent = groupOwnerIntent
            }

            mgr.connect(ch, config, object : WifiP2pManager.ActionListener {
                override fun onSuccess() {
                    call.resolve(JSObject().apply {
                        put("connecting", true)
                        put("deviceAddress", address)
                    })
                }

                override fun onFailure(reasonCode: Int) {
                    call.reject(
                        "Gagal menghubungkan ke perangkat $address: ${mapFailureReason(reasonCode)}",
                        mapFailureCode(reasonCode)
                    )
                }
            })
        }
    }

    @PluginMethod
    fun cancelConnect(call: PluginCall) {
        val mgr = manager
        val ch = channel
        if (mgr == null || ch == null) {
            call.resolve(JSObject().apply { put("cancelled", true) })
            return
        }

        mgr.cancelConnect(ch, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                call.resolve(JSObject().apply { put("cancelled", true) })
            }

            override fun onFailure(reasonCode: Int) {
                call.reject(
                    "Gagal membatalkan koneksi: ${mapFailureReason(reasonCode)}",
                    mapFailureCode(reasonCode)
                )
            }
        })
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun getConnectionInfo(call: PluginCall) {
        ensureP2pReadyAndPermissions(call) {
            requestConnectionAndGroupInfo { infoJson ->
                call.resolve(infoJson)
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun requestPeersAndNotify() {
        val mgr = manager ?: return
        val ch = channel ?: return
        if (!hasRequiredP2pPermissions()) return

        mgr.requestPeers(ch) { peerList ->
            val arr = JSArray()
            peerList.deviceList.forEach { dev -> arr.put(deviceToJson(dev)) }
            notifyListeners("peersUpdated", JSObject().apply {
                put("peers", arr)
            })
        }
    }

    private fun requestConnectionAndGroupInfoAndNotify() {
        if (!hasRequiredP2pPermissions()) return
        requestConnectionAndGroupInfo { infoJson ->
            notifyListeners("connectionInfoChanged", infoJson)
        }
    }

    @SuppressLint("MissingPermission")
    private fun requestConnectionAndGroupInfo(onResult: (JSObject) -> Unit) {
        val mgr = manager
        val ch = channel
        if (mgr == null || ch == null) {
            onResult(emptyConnectionInfo())
            return
        }

        mgr.requestConnectionInfo(ch) { info: WifiP2pInfo? ->
            if (info == null || !info.groupFormed) {
                onResult(emptyConnectionInfo())
                return@requestConnectionInfo
            }

            if (!hasRequiredP2pPermissions()) {
                onResult(buildConnectionJson(info, null))
                return@requestConnectionInfo
            }

            mgr.requestGroupInfo(ch) { group: WifiP2pGroup? ->
                onResult(buildConnectionJson(info, group))
            }
        }
    }

    private fun emptyConnectionInfo(): JSObject {
        return JSObject().apply {
            put("groupFormed", false)
            put("isGroupOwner", false)
            put("groupOwnerAddress", "")
            put("networkName", "")
            put("passphrase", "")
            put("clients", JSArray())
        }
    }

    private fun buildConnectionJson(info: WifiP2pInfo, group: WifiP2pGroup?): JSObject {
        val clientsArr = JSArray()
        group?.clientList?.forEach { client ->
            clientsArr.put(deviceToJson(client))
        }
        return JSObject().apply {
            put("groupFormed", info.groupFormed)
            put("isGroupOwner", info.isGroupOwner)
            put("groupOwnerAddress", info.groupOwnerAddress?.hostAddress ?: "")
            put("networkName", group?.networkName ?: "")
            put("passphrase", if (info.isGroupOwner) (group?.passphrase ?: "") else "")
            put("clients", clientsArr)
        }
    }

    private fun deviceToJson(device: WifiP2pDevice): JSObject {
        return JSObject().apply {
            put("deviceName", device.deviceName ?: "Perangkat Android")
            put("deviceAddress", device.deviceAddress ?: "")
            put("status", mapDeviceStatus(device.status))
            put("primaryDeviceType", device.primaryDeviceType ?: "")
            put("isGroupOwner", device.isGroupOwner)
        }
    }

    private fun mapDeviceStatus(status: Int): String {
        return when (status) {
            WifiP2pDevice.CONNECTED -> "CONNECTED"
            WifiP2pDevice.INVITED -> "INVITED"
            WifiP2pDevice.FAILED -> "FAILED"
            WifiP2pDevice.AVAILABLE -> "AVAILABLE"
            WifiP2pDevice.UNAVAILABLE -> "UNAVAILABLE"
            else -> "UNKNOWN"
        }
    }

    private fun mapFailureCode(reasonCode: Int): String {
        return when (reasonCode) {
            WifiP2pManager.P2P_UNSUPPORTED -> "P2P_UNSUPPORTED"
            WifiP2pManager.BUSY -> "BUSY"
            WifiP2pManager.NO_SERVICE_REQUESTS -> "NO_SERVICE_REQUESTS"
            else -> "ERROR"
        }
    }

    private fun mapFailureReason(reasonCode: Int): String {
        return when (reasonCode) {
            WifiP2pManager.P2P_UNSUPPORTED -> "Wi-Fi Direct tidak didukung pada perangkat ini."
            WifiP2pManager.BUSY -> "Sistem Wi-Fi Direct sedang sibuk atau Wi-Fi belum aktif. Pastikan Wi-Fi & Lokasi menyala."
            WifiP2pManager.NO_SERVICE_REQUESTS -> "Tidak ada permintaan layanan Wi-Fi Direct."
            else -> "Terjadi kesalahan internal Wi-Fi Direct (kode $reasonCode). Pastikan Wi-Fi & Lokasi aktif."
        }
    }

    private fun notifyError(code: String, message: String) {
        notifyListeners("wifiDirectError", JSObject().apply {
            put("code", code)
            put("message", message)
        })
    }

    private fun <T> getParcelableExtraCompat(
        intent: Intent,
        key: String,
        clazz: Class<T>
    ): T? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(key, clazz)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(key)
        }
    }
}
