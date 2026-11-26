# MABAR UNO — Android Offline Multiplayer Card Game

Aplikasi permainan kartu **MABAR UNO** (Main Bareng UNO) yang dirancang untuk berjalan secara **offline** di Android dengan antarmuka **mobile-responsive** (Portrait di Menu & Single Player, Portrait/Landscape di Multiplayer 2–4 pemain, Landscape di Multiplayer 5–8 pemain), arsitektur modular React + TypeScript game engine, penyimpanan lokal, serta lapisan jaringan multiplayer native Android (Wi-Fi LAN & Wi-Fi Direct).

---

## Ringkasan Fitur Utama

- **Orientasi Layar Dinamis & Pengaturan Preferensi**:
  - **Main Menu & Single Player**: Portrait sebagai orientasi utama dengan kartu tangan besar, kontrol `>= 48dp` di bagian bawah, dan tata letak padat tanpa scroll halaman.
  - **Multiplayer 2–4 Pemain**: Mendukung Portrait maupun Landscape secara fleksibel.
  - **Multiplayer 5–8 Pemain**: Otomatis beralih ke Landscape agar seluruh kursi lawan tetap jelas.
  - **Tanpa Restart Match**: Perubahan orientasi dikelola oleh plugin native `UnoOrientationPlugin.kt` + `android:configChanges` di `AndroidManifest.xml` sehingga state pertandingan tidak hilang, disertai opsi manual (**Otomatis / Portrait / Landscape**) di menu **Pengaturan**.
- **Single Player (vs BOT)**:
  - **2–8 pemain** (1 manusia + 1–7 BOT) dengan tingkat kesulitan **Mudah**, **Normal**, dan **Sulit**.
  - Aturan **Classic UNO** dan **House Rules** (`Stacking +2`, `Stacking +4`, tumpuk silang `+2`/`+4`, penalti lupa tekan `UNO!`).
- **Multiplayer Offline Wi-Fi LAN & Wi-Fi Direct**:
  - **Server WebSocket Lokal Native Android**: `LocalWsServer.kt` & `UnoLocalServerPlugin.kt` (`org.java-websocket:Java-WebSocket`) berjalan di perangkat Host lewat Hotspot HP, router lokal, atau grup Wi-Fi Direct tanpa internet maupun cloud.
  - **Wi-Fi Direct (`WifiP2pManager`)**: `UnoWifiDirectPlugin.kt` mendukung *peer discovery*, *Group Owner formation*, koneksi peer, izin runtime Android 6–15 (`ACCESS_FINE_LOCATION` / `NEARBY_WIFI_DEVICES`), serta integrasi ke IP Group Owner (`192.168.49.1`).
  - **Lobby, Host Spectator, QR Code Asli & Reconnect**: Room ID, Kode Room Manual, QR Persistent & QR Single Game (token sekali pakai), pemindai QR kamera nyata (`jsqr`), isolasi kartu privat (`getClientVisibleState`), heartbeat, dan *reconnectToken*.

---

## Struktur Proyek

```text
.github/workflows/
└── android-build.yml        # Workflow CI build Debug APK otomatis via GitHub Actions
android/                     # Project Android Capacitor lengkap & siap dibuild di Android Studio / Gradle
├── build.gradle             # Konfigurasi AGP 8.13.0 & Kotlin Gradle Plugin 2.1.20
├── variables.gradle         # minSdk 24, compileSdk 36, targetSdk 36
└── app/
    ├── build.gradle         # Java 21, Kotlin stdlib, & org.java-websocket:Java-WebSocket:1.5.7
    └── src/main/
        ├── AndroidManifest.xml
        └── java/com/unoarena/game/
            ├── MainActivity.kt
            ├── lan/
            │   ├── LocalWsServer.kt
            │   └── UnoLocalServerPlugin.kt
            ├── wifidirect/
            │   └── UnoWifiDirectPlugin.kt
            └── ui/
                └── UnoOrientationPlugin.kt
android-native/              # Salinan sumber plugin Kotlin native & referensi manifest
src/
├── components/              # FrontPerspectiveTable, UnoCard, PlayerHand, OpponentSeat, RealQrCodeDisplay, modal
├── engine/                  # Logika game UNO murni (types, deck, rules, botAi, gameEngine)
├── multiplayer/             # HostRoomManager, LanWebSocketClient, qrCodec, wifiDirectHelpers, & nativeBridge
├── screens/                 # Splash, MainMenu, ModeSelect, Lobby/WifiDirect/Host/Join/QrScanner, GameBoard, Settings, Result
├── storage/                 # Adapter localStorage (preferensi, orientasi, & riwayat pertandingan)
└── utilities/               # orientationManager, soundEngine, & cardHelpers
tests/                       # Pengujian otomatis engine UNO, Wi-Fi LAN WebSocket, QR, Wi-Fi Direct, & orientasi
```

---

## Menjalankan & Pengujian Lokal (Web)

```bash
npm install
npm run dev       # Jalankan aplikasi web di port 3000
npm test          # Jalankan pengujian unit engine UNO, LAN WebSocket, QR, & orientasi
npm run lint      # Validasi TypeScript (tsc --noEmit)
npm run build     # Build bundle web ke folder dist/
```

---

## Panduan Build Android APK & Pengujian Multi-Perangkat

### Prasyarat Lingkungan Lokal
- **Node.js 20 atau 22** dan **npm**
- **JDK 21 (Temurin / OpenJDK 21)**
- **Android Studio** (dengan Android SDK Platform 36 & Android SDK Build-Tools terpasang)

### 1. Install Dependency
```bash
npm install
```

### 2. Build Frontend
```bash
npm run build
```

### 3. Sinkronisasi Capacitor ke Project Android
```bash
npx cap sync android
```
Perintah ini menyalin hasil `dist/` ke `android/app/src/main/assets/public` dan memperbarui konfigurasi `capacitor.config.json`.

### 4. Membuka Project di Android Studio
```bash
npx cap open android
```
Tunggu hingga Gradle selesai melakukan sinkronisasi dependency (`org.java-websocket:Java-WebSocket:1.5.7` & plugin Kotlin).

### 5. Build Debug APK
**Opsi A — Melalui Android Studio:**
- Pilih menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- Hasil APK berada di:
  `android/app/build/outputs/apk/debug/app-debug.apk`

**Opsi B — Melalui Terminal (Gradle Wrapper):**
```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```

**Opsi C — Build Otomatis via GitHub Actions:**
Push repositori ke GitHub (branch `main` atau `master`) atau jalankan manual lewat tab **Actions → Build MABAR UNO Android Debug APK → Run workflow**, lalu unduh artifact `mabar-uno-debug-apk`.

### 6. Build Release APK
Untuk menghasilkan APK rilis yang ditandatangani secara aman (jangan pernah menyimpan file `.jks` atau password keystore di repositori):
1. Di Android Studio pilih **Build > Generate Signed Bundle / APK...**
2. Pilih **APK**, lalu buat atau pilih keystore pribadi Anda di komputer lokal.
3. Pilih build variant **release** dan centang signature v1/v2.
4. Hasil berada di `android/app/build/outputs/apk/release/app-release.apk`.

### 7. Install APK ke HP Android
- **Melalui Kabel USB (ADB):**
  ```bash
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```
- **Manual:** Salin `app-debug.apk` ke HP Android, buka file tersebut dari File Manager, dan izinkan **Install from unknown sources / Instal aplikasi tidak dikenal**.

### 8. Menguji Multiplayer Offline pada 2 atau Lebih HP Android
1. **Pastikan seluruh HP terpasang APK MABAR UNO versi yang sama.**
2. **Uji Mode Wi-Fi LAN (Hotspot / Router Lokal):**
   - Nyalakan Hotspot Wi-Fi di **HP A** (atau hubungkan semua HP ke 1 router lokal; paket data/internet tidak diperlukan).
   - Pada **HP A**, buka **Multiplayer → Buat Room (Host)**, atur jumlah pemain (2–8), mode Host (Ikut Bermain / Spectator), dan aturan permainan.
   - Catat **IP & Port** (`ws://<ip>:8765`), **Kode Room Manual**, atau tampilkan **QR Code** (Persistent / Single Game).
   - Pada **HP B** (dan HP lain), hubungkan ke Wi-Fi **HP A**, lalu buka **Multiplayer → Scan QR Room** (izinkan akses Kamera) atau **Gabung Kode Room Manual**.
3. **Uji Mode Wi-Fi Direct (Tanpa Router/Hotspot Manual):**
   - Aktifkan **Wi-Fi** dan **Layanan Lokasi** di semua HP, lalu beri izin perangkat sekitar (`NEARBY_WIFI_DEVICES` / `ACCESS_FINE_LOCATION`) saat diminta.
   - Pada **HP A**: **Multiplayer → Kelola Wi-Fi Direct → Host · Group Owner → Bentuk Grup Wi-Fi Direct**, lalu lanjutkan ke **Buka Room & Server WebSocket**.
   - Pada **HP B**: **Multiplayer → Kelola Wi-Fi Direct → Pemain · Cari & Gabung Peer → Pindai Perangkat → Hubungkan** ke perangkat Host, lalu gabung via **QR Code** atau **Kode Room Manual** dengan IP Group Owner (`192.168.49.1`).
4. **Verifikasi Pengujian:**
   - Uji giliran bermain, kartu privat (kartu pemain B tidak terlihat di HP A), penalti lupa `UNO!`, putus-sambung (*reconnect* dengan QR/token), serta transisi orientasi (Portrait di Single Player/Menu, Portrait/Landscape di 2–4 pemain, Landscape di 5–8 pemain) tanpa merestart pertandingan.
