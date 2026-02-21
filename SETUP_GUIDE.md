# Panduan Pengaturan Playtube

Ikuti langkah-langkah di bawah ini untuk menghubungkan aplikasi Playtube dengan layanan pihak ketiga.

## 1. Menghubungkan ke Supabase (Google Auth)

1.  Buka [Supabase Dashboard](https://app.supabase.com/).
2.  Buat proyek baru.
3.  Pergi ke **Project Settings** > **API**.
4.  Salin `Project URL` dan `anon public key`.
5.  Buka file `public/script.js` di proyek ini.
6.  Ganti nilai `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dengan nilai yang Anda salin.
7.  Untuk Google Login:
    -   Pergi ke **Authentication** > **Providers** > **Google**.
    -   Aktifkan (Enable) Google Provider.
    -   Masukkan `Client ID` dan `Client Secret` dari Google Cloud Console.
    -   Tambahkan URL redirect yang disediakan Supabase ke Google Cloud Console.

## 2. Menghubungkan ke YouTube API (Pencarian & Komentar)

1.  Buka [Google Cloud Console](https://console.cloud.google.com/).
2.  Buat proyek baru atau pilih proyek yang sudah ada.
3.  Cari dan aktifkan **YouTube Data API v3**.
4.  Pergi ke **Credentials** > **Create Credentials** > **API Key**.
5.  Salin API Key tersebut.
6.  Buka file `.env` di root folder proyek ini.
7.  Ganti nilai `YOUTUBE_API_KEY` dengan API Key Anda.

## 3. Fitur Upload Video ke YouTube

Fitur upload pada aplikasi ini saat ini menggunakan logika simulasi di `server.js`. Untuk membuatnya benar-benar mengunggah ke channel YouTube user:
1.  Anda perlu mengimplementasikan OAuth 2.0 flow di backend menggunakan library `googleapis`.
2.  Minta scope `https://www.googleapis.com/auth/youtube.upload`.
3.  Gunakan token yang didapat dari user untuk melakukan `youtube.videos.insert`.

## 4. Cara Menjalankan

1.  Pastikan Node.js sudah terinstall.
2.  Jalankan `npm install`.
3.  Jalankan `npm start` atau `node server.js`.
4.  Buka `http://localhost:3000` di browser Anda.

---
Dibuat dengan ❤️ untuk komunitas Playtube.
