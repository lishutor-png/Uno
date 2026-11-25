import { WifiDirectGroupInfo, WifiDirectPeerStatus } from './types';

export function formatPeerStatusLabel(status: WifiDirectPeerStatus): string {
  switch (status) {
    case 'CONNECTED':
      return 'Terhubung';
    case 'INVITED':
      return 'Diundang';
    case 'AVAILABLE':
      return 'Tersedia';
    case 'FAILED':
      return 'Gagal';
    case 'UNAVAILABLE':
      return 'Tidak Tersedia';
    default:
      return 'Tidak Diketahui';
  }
}

/**
 * Resolves the authoritative IP address to share via QR or connect to over Wi-Fi Direct.
 * Prioritizes WifiP2pInfo.groupOwnerAddress (typically 192.168.49.1 on Android P2P)
 * or p2p subnet interfaces detected by LocalWsServer.
 */
export function resolveWifiDirectHostIp(
  groupInfo: WifiDirectGroupInfo | null | undefined,
  serverIpAddresses: string[]
): string {
  if (groupInfo?.groupFormed && groupInfo.groupOwnerAddress.trim().length > 0) {
    return groupInfo.groupOwnerAddress.trim();
  }
  const p2pIp = serverIpAddresses.find((ip) => ip.startsWith('192.168.49.'));
  if (p2pIp) {
    return p2pIp;
  }
  return serverIpAddresses[0] ?? '';
}

export function translateWifiDirectError(err: unknown): string {
  if (!err) {
    return 'Terjadi kesalahan Wi-Fi Direct yang tidak diketahui.';
  }

  const record =
    typeof err === 'object' ? (err as { code?: string; message?: string }) : null;
  const code = record?.code ?? '';
  const msg = err instanceof Error ? err.message : record?.message ?? String(err);

  switch (code) {
    case 'PERMISSION_DENIED':
      return msg || 'Izin perangkat sekitar/lokasi ditolak. Aktifkan di Pengaturan Android.';
    case 'P2P_UNSUPPORTED':
      return 'Perangkat Android ini tidak mendukung Wi-Fi Direct (WifiP2pManager).';
    case 'BUSY':
      return 'Wi-Fi Direct sedang sibuk atau Wi-Fi belum aktif. Pastikan Wi-Fi dan Lokasi menyala.';
    case 'NO_SERVICE_REQUESTS':
      return 'Permintaan layanan Wi-Fi Direct tidak ditemukan.';
    case 'CHANNEL_LOST':
      return 'Saluran WifiP2pManager terputus. Coba tutup lalu buka ulang Wi-Fi Direct.';
    default:
      return msg || 'Gagal memproses operasi Wi-Fi Direct.';
  }
}
