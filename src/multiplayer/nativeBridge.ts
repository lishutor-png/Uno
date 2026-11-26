import {
  HostServerTransport,
  NativeCapabilityStatus,
  WifiDirectErrorEvent,
  WifiDirectGroupInfo,
  WifiDirectPeer,
} from './types';

export interface PluginListenerHandle {
  remove: () => Promise<void>;
}

export interface UnoLocalServerPluginInterface {
  startServer(options: { port: number }): Promise<{
    started: boolean;
    port: number;
    ipAddresses: string[];
    primaryIp: string;
  }>;
  stopServer(): Promise<{ stopped: boolean }>;
  sendToClient(options: {
    connectionId: string;
    payload: string;
  }): Promise<{ sent: boolean }>;
  broadcast(options: { payload: string }): Promise<{ sent: boolean }>;
  kickClient(options: {
    connectionId: string;
    reason: string;
  }): Promise<{ kicked: boolean }>;
  getLocalIpAddresses(): Promise<{
    ipAddresses: string[];
    primaryIp: string;
    port: number;
  }>;
  addListener(
    eventName: 'clientConnected',
    cb: (data: { connectionId: string; remoteAddress: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'clientMessage',
    cb: (data: { connectionId: string; payload: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'clientDisconnected',
    cb: (data: { connectionId: string; code: number; reason: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'serverError',
    cb: (data: { message: string }) => void
  ): Promise<PluginListenerHandle>;
}

export interface UnoWifiDirectPluginInterface {
  ensurePermissions(): Promise<{
    granted: boolean;
    p2pEnabled: boolean;
    sdkInt: number;
  }>;
  discoverPeers(): Promise<{ discovering: boolean }>;
  stopDiscovery(): Promise<{ stopped: boolean }>;
  getPeers(): Promise<{ peers: WifiDirectPeer[] }>;
  createGroup(): Promise<WifiDirectGroupInfo>;
  removeGroup(): Promise<{ removed: boolean; message?: string }>;
  connectToPeer(options: {
    deviceAddress: string;
    groupOwnerIntent?: number;
  }): Promise<{ connecting: boolean; deviceAddress: string }>;
  cancelConnect(): Promise<{ cancelled: boolean }>;
  getConnectionInfo(): Promise<WifiDirectGroupInfo>;
  addListener(
    eventName: 'wifiP2pStateChanged',
    cb: (data: { enabled: boolean }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'peersUpdated',
    cb: (data: { peers: WifiDirectPeer[] }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'connectionInfoChanged',
    cb: (data: WifiDirectGroupInfo) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'thisDeviceChanged',
    cb: (data: WifiDirectPeer) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'wifiDirectError',
    cb: (data: WifiDirectErrorEvent) => void
  ): Promise<PluginListenerHandle>;
}

export interface UnoOrientationPluginInterface {
  setOrientation(options: {
    mode: 'portrait' | 'landscape' | 'auto';
  }): Promise<{ applied: boolean; mode: string }>;
  setFullscreen?(options: {
    enabled: boolean;
  }): Promise<{ applied: boolean; enabled: boolean }>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    UnoLocalServer?: UnoLocalServerPluginInterface;
    UnoWifiDirect?: UnoWifiDirectPluginInterface;
    UnoOrientation?: UnoOrientationPluginInterface;
    [key: string]: unknown;
  };
}

function getCapacitor(): CapacitorGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function getUnoLocalServerPlugin(): UnoLocalServerPluginInterface | null {
  const cap = getCapacitor();
  return cap?.Plugins?.UnoLocalServer ?? null;
}

export function getUnoWifiDirectPlugin(): UnoWifiDirectPluginInterface | null {
  const cap = getCapacitor();
  return cap?.Plugins?.UnoWifiDirect ?? null;
}

export function getUnoOrientationPlugin(): UnoOrientationPluginInterface | null {
  const cap = getCapacitor();
  return cap?.Plugins?.UnoOrientation ?? null;
}

/**
 * Checks whether the Android Capacitor native plugins (UnoLocalServer & UnoWifiDirect)
 * are available in the current runtime.
 * Never fakes native Android server or Wi-Fi Direct availability in browser mode.
 */
export function getNativeMultiplayerCapabilities(): NativeCapabilityStatus {
  const cap = getCapacitor();
  const isNative = Boolean(cap?.isNativePlatform?.());
  const platform = cap?.getPlatform?.() ?? 'web';
  const plugins = cap?.Plugins ?? {};

  const hasLocalWsPlugin = Boolean(plugins.UnoLocalServer);
  const hasWifiDirectPlugin = Boolean(plugins.UnoWifiDirect);
  const hasCamera =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  if (!isNative || platform !== 'android') {
    return {
      isAndroidCapacitor: false,
      localWebSocketServerSupported: false,
      wifiDirectSupported: false,
      cameraQrSupported: hasCamera,
      reason:
        'Plugin native Android (UnoLocalServer & UnoWifiDirect) aktif setelah aplikasi dibuild ke APK Capacitor. Di browser web, Anda tetap dapat bergabung sebagai Client WebSocket ke HP host.',
    };
  }

  return {
    isAndroidCapacitor: true,
    localWebSocketServerSupported: hasLocalWsPlugin,
    wifiDirectSupported: hasWifiDirectPlugin,
    cameraQrSupported: hasCamera,
    reason:
      hasLocalWsPlugin && hasWifiDirectPlugin
        ? 'Server WebSocket lokal (UnoLocalServer) dan Wi-Fi Direct (UnoWifiDirect) siap digunakan.'
        : !hasLocalWsPlugin
          ? 'Plugin Kotlin UnoLocalServer belum terdaftar pada MainActivity Android.'
          : 'Plugin Kotlin UnoWifiDirect belum terdaftar pada MainActivity Android.',
  };
}

export function createCapacitorServerTransport(
  plugin: UnoLocalServerPluginInterface
): HostServerTransport {
  return {
    async sendToClient(connectionId: string, payload: string) {
      const res = await plugin.sendToClient({ connectionId, payload });
      return res.sent;
    },
    async kickClient(connectionId: string, reason: string) {
      await plugin.kickClient({ connectionId, reason });
    },
  };
}
