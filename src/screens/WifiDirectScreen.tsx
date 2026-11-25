import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Keyboard,
  QrCode,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  getNativeMultiplayerCapabilities,
  getUnoWifiDirectPlugin,
  PluginListenerHandle,
} from '../multiplayer/nativeBridge';
import {
  WifiDirectGroupInfo,
  WifiDirectPeer,
} from '../multiplayer/types';
import {
  formatPeerStatusLabel,
  translateWifiDirectError,
} from '../multiplayer/wifiDirectHelpers';

interface WifiDirectScreenProps {
  onBack: () => void;
  onProceedAsHost: (groupInfo: WifiDirectGroupInfo) => void;
  onProceedAsClientManual: (groupOwnerIp: string) => void;
  onProceedAsClientScanner: () => void;
}

export const WifiDirectScreen: React.FC<WifiDirectScreenProps> = ({
  onBack,
  onProceedAsHost,
  onProceedAsClientManual,
  onProceedAsClientScanner,
}) => {
  const caps = getNativeMultiplayerCapabilities();
  const [roleTab, setRoleTab] = useState<'HOST' | 'CLIENT'>('HOST');
  const [p2pEnabled, setP2pEnabled] = useState<boolean | null>(null);
  const [thisDevice, setThisDevice] = useState<WifiDirectPeer | null>(null);
  const [peers, setPeers] = useState<WifiDirectPeer[]>([]);
  const [groupInfo, setGroupInfo] = useState<WifiDirectGroupInfo | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listenersRef = useRef<PluginListenerHandle[]>([]);

  useEffect(() => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;

    let mounted = true;
    const register = async () => {
      try {
        const handles = await Promise.all([
          plugin.addListener('wifiP2pStateChanged', (ev) => {
            if (!mounted) return;
            setP2pEnabled(ev.enabled);
          }),
          plugin.addListener('peersUpdated', (ev) => {
            if (!mounted) return;
            setPeers(ev.peers ?? []);
          }),
          plugin.addListener('connectionInfoChanged', (info) => {
            if (!mounted) return;
            setGroupInfo(info);
            if (info.groupFormed) {
              setDiscovering(false);
              setStatusMessage(
                info.isGroupOwner
                  ? `Grup Wi-Fi Direct aktif sebagai Group Owner (${info.groupOwnerAddress}).`
                  : `Terhubung ke Group Owner (${info.groupOwnerAddress}).`
              );
            }
          }),
          plugin.addListener('thisDeviceChanged', (dev) => {
            if (!mounted) return;
            setThisDevice(dev);
          }),
          plugin.addListener('wifiDirectError', (ev) => {
            if (!mounted) return;
            setErrorMsg(translateWifiDirectError(ev));
          }),
        ]);
        listenersRef.current = handles;

        // Query initial state honestly without faking anything
        const perm = await plugin.ensurePermissions();
        if (mounted) {
          setP2pEnabled(perm.p2pEnabled);
        }
        const currentInfo = await plugin.getConnectionInfo();
        if (mounted) {
          setGroupInfo(currentInfo);
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(translateWifiDirectError(err));
        }
      }
    };

    void register();

    return () => {
      mounted = false;
      const current = listenersRef.current;
      listenersRef.current = [];
      current.forEach((h) => {
        void h.remove();
      });
    };
  }, []);

  const handleEnsurePermissions = async () => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;
    setErrorMsg(null);
    setBusyAction('permissions');
    try {
      const res = await plugin.ensurePermissions();
      setP2pEnabled(res.p2pEnabled);
      setStatusMessage('Izin Wi-Fi Direct siap digunakan.');
    } catch (err) {
      setErrorMsg(translateWifiDirectError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateGroup = async () => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;
    setErrorMsg(null);
    setBusyAction('createGroup');
    try {
      const info = await plugin.createGroup();
      setGroupInfo(info);
      setStatusMessage(
        info.groupFormed
          ? `Grup Wi-Fi Direct terbentuk. IP Group Owner: ${info.groupOwnerAddress || 'menunggu alamat...'}`
          : 'Permintaan pembentukan grup dikirim ke sistem Android...'
      );
    } catch (err) {
      setErrorMsg(translateWifiDirectError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveGroup = async () => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;
    setErrorMsg(null);
    setBusyAction('removeGroup');
    try {
      await plugin.removeGroup();
      const info = await plugin.getConnectionInfo();
      setGroupInfo(info);
      setStatusMessage('Grup Wi-Fi Direct dibubarkan.');
    } catch (err) {
      setErrorMsg(translateWifiDirectError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDiscoverPeers = async () => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;
    setErrorMsg(null);
    setBusyAction('discover');
    try {
      await plugin.discoverPeers();
      setDiscovering(true);
      setStatusMessage('Memindai perangkat Wi-Fi Direct di sekitar...');
      const res = await plugin.getPeers();
      setPeers(res.peers ?? []);
    } catch (err) {
      setDiscovering(false);
      setErrorMsg(translateWifiDirectError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleStopDiscovery = async () => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;
    setErrorMsg(null);
    try {
      await plugin.stopDiscovery();
      setDiscovering(false);
      setStatusMessage('Pemindaian perangkat dihentikan.');
    } catch (err) {
      setErrorMsg(translateWifiDirectError(err));
    }
  };

  const handleConnectPeer = async (peer: WifiDirectPeer) => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;
    setErrorMsg(null);
    setBusyAction(`connect:${peer.deviceAddress}`);
    try {
      await plugin.connectToPeer({
        deviceAddress: peer.deviceAddress,
        groupOwnerIntent: 0,
      });
      setStatusMessage(
        `Mengirim permintaan koneksi ke ${peer.deviceName}. Terima konfirmasi di perangkat tujuan jika diminta.`
      );
    } catch (err) {
      setErrorMsg(translateWifiDirectError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancelConnect = async () => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;
    setErrorMsg(null);
    try {
      await plugin.cancelConnect();
      setStatusMessage('Permintaan koneksi dibatalkan.');
    } catch (err) {
      setErrorMsg(translateWifiDirectError(err));
    }
  };

  const handleRefreshConnection = async () => {
    const plugin = getUnoWifiDirectPlugin();
    if (!plugin) return;
    setErrorMsg(null);
    setBusyAction('refresh');
    try {
      const info = await plugin.getConnectionInfo();
      setGroupInfo(info);
    } catch (err) {
      setErrorMsg(translateWifiDirectError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const isSupported = caps.wifiDirectSupported;

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-[#072e1e] via-[#041d13] to-[#02100a] px-4 sm:px-8 py-4 sm:py-6 flex flex-col">
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto mb-4">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 flex items-center gap-2 text-sm font-semibold text-white cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <h1 className="font-display text-lg sm:text-2xl font-bold text-white text-center">
          Wi-Fi Direct (Android WifiP2pManager)
        </h1>

        <button
          type="button"
          onClick={() => void handleEnsurePermissions()}
          disabled={!isSupported || busyAction !== null}
          className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            isSupported
              ? 'bg-white/10 hover:bg-white/15 text-white cursor-pointer'
              : 'bg-white/5 text-white/35 cursor-not-allowed'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-300" />
          <span>Cek Izin P2P</span>
        </button>
      </div>

      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-4">
        {!isSupported && (
          <div className="rounded-2xl bg-black/40 border border-amber-400/40 p-4 text-xs sm:text-sm text-amber-100">
            <div className="font-display font-bold text-amber-300 mb-1">
              Status Wi-Fi Direct: Belum Didukung di Browser Web
            </div>
            <p className="text-emerald-100/85 leading-relaxed">
              Plugin Kotlin native Android{' '}
              <code className="font-mono">UnoWifiDirectPlugin.kt</code> (
              <code className="font-mono">WifiP2pManager</code>) hanya berjalan
              di APK Android fisik yang dibuild lewat Android Studio dan
              Capacitor. Simulasi koneksi Wi-Fi Direct di JavaScript tidak
              diaktifkan.
            </p>
          </div>
        )}

        {isSupported && p2pEnabled === false && (
          <div className="rounded-xl bg-amber-950/70 border border-amber-400/45 px-4 py-3 text-xs sm:text-sm text-amber-100 flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              Wi-Fi Direct sedang nonaktif pada perangkat. Aktifkan Wi-Fi dan
              Layanan Lokasi di pengaturan Android.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-red-950/80 border border-red-400/50 px-4 py-3 text-xs sm:text-sm text-red-100">
            {errorMsg}
          </div>
        )}

        {statusMessage && !errorMsg && (
          <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/35 px-4 py-2.5 text-xs sm:text-sm text-emerald-100">
            {statusMessage}
          </div>
        )}

        {/* Role segmented tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setRoleTab('HOST')}
              className={`min-h-[40px] px-4 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer ${
                roleTab === 'HOST'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-emerald-100/80 hover:text-white'
              }`}
            >
              Host · Group Owner
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('CLIENT')}
              className={`min-h-[40px] px-4 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer ${
                roleTab === 'CLIENT'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-emerald-100/80 hover:text-white'
              }`}
            >
              Pemain · Cari &amp; Gabung Peer
            </button>
          </div>

          <div className="text-xs text-emerald-200/75 flex items-center gap-2">
            <span>
              Perangkat ini:{' '}
              {thisDevice?.deviceName ?? (isSupported ? 'Siap' : 'Web Browser')}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Status P2P:{' '}
              {!isSupported
                ? 'Butuh APK Android'
                : p2pEnabled
                  ? 'Aktif'
                  : 'Menunggu'}
            </span>
          </div>
        </div>

        {roleTab === 'HOST' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-black/35 border border-emerald-400/20 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-display font-bold text-base text-amber-300">
                  <Radio className="w-5 h-5" />
                  <span>1. Pembentukan Grup Wi-Fi Direct</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                  Perangkat Host membentuk grup P2P sebagai{' '}
                  <strong className="text-white">Group Owner</strong> agar HP
                  lain dapat terhubung langsung tanpa router atau hotspot.
                </p>

                <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
                  <div>
                    <span className="text-emerald-200/70">Status Grup: </span>
                    <span className="font-semibold text-white">
                      {groupInfo?.groupFormed
                        ? groupInfo.isGroupOwner
                          ? 'Aktif (Group Owner)'
                          : 'Terhubung sebagai Client'
                        : 'Belum terbentuk'}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-200/70">
                      IP Group Owner:{' '}
                    </span>
                    <span className="font-mono-num font-bold text-amber-300">
                      {groupInfo?.groupOwnerAddress || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-200/70">SSID Grup: </span>
                    <span className="font-mono-num text-white">
                      {groupInfo?.networkName || '-'}
                    </span>
                  </div>
                  {groupInfo?.isGroupOwner && groupInfo.passphrase && (
                    <div>
                      <span className="text-emerald-200/70">Passphrase: </span>
                      <span className="font-mono-num text-emerald-300">
                        {groupInfo.passphrase}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void handleCreateGroup()}
                  disabled={!isSupported || busyAction !== null}
                  className={`min-h-[46px] w-full rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 ${
                    isSupported
                      ? 'bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-slate-950 cursor-pointer'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span>Bentuk Grup Wi-Fi Direct (Group Owner)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRefreshConnection()}
                    disabled={!isSupported || busyAction !== null}
                    className={`min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      isSupported
                        ? 'bg-white/10 hover:bg-white/15 text-white cursor-pointer'
                        : 'bg-white/5 text-white/35 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Muat Ulang Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleRemoveGroup()}
                    disabled={!isSupported || busyAction !== null}
                    className={`min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      isSupported
                        ? 'bg-red-600/80 hover:bg-red-500 text-white cursor-pointer'
                        : 'bg-white/5 text-white/35 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bubarkan Grup</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-black/35 border border-emerald-400/20 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-display font-bold text-base text-white">
                    2. Perangkat Client P2P &amp; Server UNO
                  </div>
                  <span className="text-xs text-emerald-200/75 tabular-nums">
                    {groupInfo?.clients.length ?? 0} terhubung
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                  {(!groupInfo || groupInfo.clients.length === 0) && (
                    <div className="text-xs text-emerald-100/60 py-4 text-center">
                      Belum ada perangkat client Wi-Fi Direct yang terhubung ke
                      grup ini.
                    </div>
                  )}
                  {groupInfo?.clients.map((c) => (
                    <div
                      key={c.deviceAddress}
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-white">
                        {c.deviceName}
                      </span>
                      <span className="font-mono-num text-emerald-200/75">
                        {c.deviceAddress}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-emerald-100/75 leading-relaxed">
                  Setelah grup aktif, jalankan server WebSocket lokal pada
                  alamat Group Owner{' '}
                  <span className="font-mono-num text-white">
                    {groupInfo?.groupOwnerAddress || '192.168.49.1'}
                  </span>{' '}
                  lalu bagikan QR Room ke pemain lain.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  !isSupported ||
                  !groupInfo?.groupFormed ||
                  !groupInfo.isGroupOwner
                }
                onClick={() => {
                  if (groupInfo) onProceedAsHost(groupInfo);
                }}
                className={`min-h-[48px] w-full rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 ${
                  isSupported &&
                  groupInfo?.groupFormed &&
                  groupInfo.isGroupOwner
                    ? 'bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-slate-950 cursor-pointer'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Lanjut Buka Room &amp; Server WebSocket</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-black/35 border border-emerald-400/20 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-display font-bold text-base text-emerald-300 flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    <span>Perangkat Wi-Fi Direct Sekitar</span>
                  </div>
                  <span className="text-xs text-emerald-200/75 tabular-nums">
                    {peers.length} ditemukan
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {peers.length === 0 && (
                    <div className="text-xs text-emerald-100/60 py-6 text-center">
                      Belum ada peer ditemukan. Ketuk{' '}
                      <strong className="text-white">
                        Pindai Perangkat Terdekat
                      </strong>{' '}
                      saat Host sudah membentuk grup.
                    </div>
                  )}
                  {peers.map((peer) => (
                    <div
                      key={peer.deviceAddress}
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-white truncate">
                          {peer.deviceName}
                          {peer.isGroupOwner ? ' · Group Owner' : ''}
                        </div>
                        <div className="text-[11px] font-mono-num text-emerald-200/70">
                          {peer.deviceAddress} ·{' '}
                          {formatPeerStatusLabel(peer.status)}
                        </div>
                      </div>

                      {peer.status === 'CONNECTED' ? (
                        <span className="text-xs font-semibold text-emerald-300 shrink-0">
                          Terhubung
                        </span>
                      ) : peer.status === 'INVITED' ? (
                        <button
                          type="button"
                          onClick={() => void handleCancelConnect()}
                          className="min-h-[36px] px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold cursor-pointer shrink-0"
                        >
                          Batalkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleConnectPeer(peer)}
                          disabled={!isSupported || busyAction !== null}
                          className="min-h-[36px] px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer shrink-0"
                        >
                          Hubungkan
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleDiscoverPeers()}
                  disabled={!isSupported || busyAction !== null}
                  className={`min-h-[44px] rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
                    isSupported
                      ? 'bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-slate-950 cursor-pointer'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`}
                  />
                  <span>Pindai Perangkat</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleStopDiscovery()}
                  disabled={!isSupported || !discovering}
                  className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center ${
                    isSupported && discovering
                      ? 'bg-white/15 hover:bg-white/20 text-white cursor-pointer'
                      : 'bg-white/5 text-white/35 cursor-not-allowed'
                  }`}
                >
                  Hentikan Scan
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-black/35 border border-emerald-400/20 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="font-display font-bold text-base text-white flex items-center gap-2">
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      groupInfo?.groupFormed
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  />
                  <span>Koneksi ke Server UNO Host</span>
                </div>

                <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
                  <div>
                    <span className="text-emerald-200/70">Status P2P: </span>
                    <span className="font-semibold text-white">
                      {groupInfo?.groupFormed
                        ? 'Terhubung ke Grup P2P'
                        : 'Belum terhubung ke Group Owner'}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-200/70">
                      IP Group Owner Host:{' '}
                    </span>
                    <span className="font-mono-num font-bold text-amber-300">
                      {groupInfo?.groupOwnerAddress || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-200/70">Nama Grup: </span>
                    <span className="font-mono-num text-white">
                      {groupInfo?.networkName || '-'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-emerald-100/75 leading-relaxed">
                  Setelah perangkat ini terhubung ke Group Owner Host, pindai QR
                  Room pada layar Host atau masuk lewat Kode Room Manual dengan
                  IP Group Owner.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!groupInfo?.groupFormed || !groupInfo.groupOwnerAddress}
                  onClick={onProceedAsClientScanner}
                  className={`min-h-[46px] w-full rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 ${
                    groupInfo?.groupFormed && groupInfo.groupOwnerAddress
                      ? 'bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-slate-950 cursor-pointer'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan QR Room Host</span>
                </button>

                <button
                  type="button"
                  disabled={!groupInfo?.groupFormed || !groupInfo.groupOwnerAddress}
                  onClick={() => {
                    if (groupInfo?.groupOwnerAddress) {
                      onProceedAsClientManual(groupInfo.groupOwnerAddress);
                    }
                  }}
                  className={`min-h-[42px] w-full rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 ${
                    groupInfo?.groupFormed && groupInfo.groupOwnerAddress
                      ? 'bg-white/15 hover:bg-white/20 text-white cursor-pointer'
                      : 'bg-white/5 text-white/35 cursor-not-allowed'
                  }`}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Masuk Kode Room Manual</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
