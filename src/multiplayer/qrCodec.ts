import QRCode from 'qrcode';
import { QRConnectionPayload } from './types';

/**
 * Serializes a connection QR payload into JSON.
 * Strictly strips any unexpected fields so cards or player data are never embedded.
 */
export function encodeQrPayload(payload: QRConnectionPayload): string {
  const safePayload: QRConnectionPayload = {
    protocolVersion: 1,
    roomId: payload.roomId,
    roomCode: payload.roomCode.trim().toUpperCase(),
    hostIp: payload.hostIp.trim(),
    port: payload.port,
    qrType: payload.qrType,
    roomAuthToken: payload.roomAuthToken.trim(),
  };
  return JSON.stringify(safePayload);
}

/**
 * Parses and strictly validates a scanned QR string.
 */
export function parseQrPayload(
  rawText: string
): { ok: true; payload: QRConnectionPayload } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: 'QR Code tidak berisi format JSON MABAR UNO yang valid.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Isi QR Code tidak dikenali.' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.protocolVersion !== 1) {
    return { ok: false, error: 'Versi protokol QR Code tidak didukung.' };
  }

  if (
    typeof obj.roomId !== 'string' ||
    !obj.roomId.trim() ||
    typeof obj.roomCode !== 'string' ||
    !obj.roomCode.trim() ||
    typeof obj.hostIp !== 'string' ||
    !obj.hostIp.trim() ||
    typeof obj.port !== 'number' ||
    !Number.isInteger(obj.port) ||
    obj.port < 1024 ||
    obj.port > 65535 ||
    (obj.qrType !== 'PERSISTENT_ROOM' && obj.qrType !== 'SINGLE_GAME') ||
    typeof obj.roomAuthToken !== 'string' ||
    !obj.roomAuthToken.trim()
  ) {
    return { ok: false, error: 'Data koneksi pada QR Code tidak lengkap atau tidak valid.' };
  }

  return {
    ok: true,
    payload: {
      protocolVersion: 1,
      roomId: obj.roomId.trim(),
      roomCode: obj.roomCode.trim().toUpperCase(),
      hostIp: obj.hostIp.trim(),
      port: obj.port,
      qrType: obj.qrType,
      roomAuthToken: obj.roomAuthToken.trim(),
    },
  };
}

/**
 * Renders a real ISO/IEC 18004 QR Code data URL using the `qrcode` library.
 */
export async function generateQrDataUrl(
  payload: QRConnectionPayload,
  width = 360
): Promise<string> {
  const encoded = encodeQrPayload(payload);
  return QRCode.toDataURL(encoded, {
    width,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#062417',
      light: '#ffffff',
    },
  });
}
