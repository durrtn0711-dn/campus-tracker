# Campus Tracker V11 — Panduan pemasangan

Paket upgrade untuk aplikasi lama berbasis HTML, JavaScript, GitHub Pages dan Supabase. Tema dan ikon babi tetap dipertahankan, tanpa dark mode.

## A. Update aplikasi (wajib)

1. Cadangkan repository GitHub dan database Supabase terlebih dahulu. Jangan menghapus project atau tabel lama.
2. Di Supabase > SQL Editor, buka query baru, salin seluruh `update5.sql`, lalu Run. Migrasi ini mengasumsikan schema.sql dan update1 sampai update4 sudah pernah diterapkan. Tidak ada perintah penghapusan data lama. **Jangan jalankan kembali update4.sql.**
3. Upload dan replace file `index.html`, `sw.js`, `config.js`, `manifest.json`, `icon-192.png`, `icon-512.png` serta file baru `offline.js`, `push.js`, `push-config.js` ke folder GitHub Pages yang sama. Config tetap memakai anon key project lama. Tidak perlu mengubah URL Supabase.
4. Commit, pastikan GitHub Pages selesai deploy, lalu buka aplikasi online. Reload halaman setelah service worker baru terpasang. Jika tampilan lama masih muncul, tutup dan buka kembali aplikasi; jangan bersihkan site data bila masih ada perubahan offline yang belum tersinkron.
5. Login seperti biasa. Cek Dashboard, menu Akademik, Planner, Keuangan, Lainnya. Atur semester di Lainnya > Setting. Pengaturan semester bersifat per perangkat.

## B. Mengaktifkan Web Push (wajib agar notifikasi saat aplikasi ditutup berfungsi)

Paket menyediakan source code dan konfigurasi, tetapi server belum dipasang. Lakukan bagian ini satu kali. Perlu HTTPS (GitHub Pages sudah menyediakan HTTPS), browser dengan Web Push, izin notifikasi, dan koneksi internet untuk menerima pesan. Untuk iPhone/iPad, gunakan iOS/iPadOS 16.4+ dan tambahkan web app ke Home Screen dahulu.

### 1. Buat VAPID keys dan secret Cron

Di komputer dengan Node.js/npm, buka terminal/CMD:

```sh
npx web-push generate-vapid-keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Simpan Public Key, Private Key dan random secret di tempat aman. Public Key saja boleh dimasukkan ke GitHub. Di `push-config.js`, isi:

```js
const CT_VAPID_PUBLIC='PUBLIC_KEY_YANG_DIHASILKAN';
```

Commit perubahan file tersebut ke GitHub. Jangan masukkan private key, cron secret atau service_role key ke GitHub/frontend.

### 2. Deploy Edge Function

Pilihan Dashboard: Supabase > Edge Functions > Deploy a new function > Via Editor (nama menu bisa berubah). Buat fungsi bernama `campus-push`, salin isi `supabase/functions/campus-push/index.ts` sebagai `index.ts`, kemudian deploy. Nonaktifkan pengaturan Verify JWT/legacy JWT untuk fungsi ini, karena request Cron diverifikasi sendiri lewat header `x-campus-secret`.

Pilihan CLI jika sudah memakai Supabase CLI: dari folder paket ini, jalankan:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy campus-push --no-verify-jwt
```

Ganti YOUR_PROJECT_REF dengan ref project Supabase milikmu. Jangan membuat project baru.

Di Edge Functions > Secrets, tambahkan empat secret (bukan di GitHub):

| Nama | Nilai |
|---|---|
| VAPID_PUBLIC_KEY | Public Key tadi |
| VAPID_PRIVATE_KEY | Private Key tadi |
| VAPID_SUBJECT | mailto:alamat-email-kamu |
| CT_CRON_SECRET | Random secret dari langkah 1 |

SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY adalah environment variables bawaan hosted Edge Functions. Fungsi menolak request tanpa CT_CRON_SECRET yang cocok, walaupun Verify JWT dinonaktifkan. Jangan kosongkan secret ini.

### 3. Jadwalkan Cron

Aktifkan extension pg_cron dan pg_net di Supabase Database > Extensions. Buat dua secret melalui Supabase Vault (Dashboard). Jika memakai SQL Editor, jalankan template berikut setelah mengganti placeholder dengan nilai asli; jangan commit nilai asli ke GitHub.

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co','ct_project_url');
select vault.create_secret('RANDOM_SECRET_YANG_SAMA','ct_cron_secret');
```

Nama secret harus persis sama, dan ct_cron_secret harus sama dengan CT_CRON_SECRET. Jika secret sudah ada, edit secret yang sama lewat Vault alih-alih membuat duplikat.

Salin dan jalankan `push-cron.sql` di SQL Editor. Job `campus-push-v11` akan mengecek tugas dan deadline setiap 5 menit. Di Dashboard Cron/Edge Function Logs, periksa status job dan respons 200. Untuk menghentikan job: `select cron.unschedule('campus-push-v11');`.

### 4. Tes push dari aplikasi

1. Buka aplikasi online, Lainnya > Setting > Push Notification > Aktifkan push. Izinkan notifikasi browser.
2. Klik Tes push. Tutup aplikasi; notifikasi tes dijadwalkan pada siklus Cron selanjutnya (sekitar 5 menit, bukan jaminan waktu pengiriman).
3. Buat tugas dengan deadline sekitar 45 menit ke depan dan status Belum. Cek bahwa notifikasi masuk sekali untuk tahap H-1 jam. Pengingat menggunakan tahap terdekat (H-7, H-3, H-1, H-1 jam), tidak mengirim ulang semua tahap yang sudah lewat. Perubahan tanggal deadline menghasilkan jadwal pengingat baru.
4. Perangkat lain harus mengaktifkan push sendiri. Klik notifikasi untuk menuju menu terkait. Notifikasi layar kunci tidak menampilkan judul tugas demi privasi.
5. Jika gagal, periksa VAPID keys, izin browser, endpoint, log fungsi, Cron, serta status database. Dukungan browser tidak universal. Endpoint dibatasi pada penyedia push yang dikenal; fungsi dibatasi 500 subscription per pemanggilan untuk skala personal, belum didesain untuk layanan banyak pengguna.

## C. Tes Offline Mode

1. Login online pada perangkat pribadi, buka Dashboard dan menu yang ingin disimpan. Tunggu data muncul dan service worker aktif. Cache IndexedDB otomatis aktif untuk akun ini.
2. Putuskan koneksi internet. Buka ulang aplikasi dan coba lihat jadwal, tugas, deadline, nilai, absensi, memo. Buat atau edit tugas. Status di atas menunjukkan antrean.
3. Aktifkan internet kembali, buka aplikasi dan tunggu antrean menjadi nol. Bisa juga klik Sinkronkan di Setting. Cek data yang sama dari perangkat lain.
4. Offline menyimpan data akademik di perangkat tanpa enkripsi khusus; jangan aktifkan di browser publik/bersama. Nonaktifkan cache di Setting untuk menghapus data lokal. Vault, bukti pembayaran, registrasi akun, upload lampiran, dan backup server memerlukan internet.
5. Antrean dikirim ketika aplikasi terbuka dan sesi akun yang sama valid. Browser yang menutup aplikasi tidak dijanjikan melakukan background sync. Jangan logout, hapus data browser, atau edit bersamaan dari beberapa tab saat antrean belum kosong. Konflik edit antarperangkat mengikuti perubahan terakhir yang berhasil dikirim; tidak ada conflict-resolution UI. Kesalahan SQL/RLS dapat menahan antrean dan harus ditangani sebelum logout. Cache dapat dibersihkan oleh browser/OS.
6. Jika sesi habis dan offline, data lokal mungkin tetap bisa dibuka dari perangkat yang sebelumnya login. Ini bukan autentikasi baru; sambungkan internet dan login kembali untuk sinkronisasi.

## D. Yang berubah / batasan

- Dashboard akses cepat, lima grup navigasi, status online dan antrean.
- Semester aktif, periode kelas di kalender/dashboard, simulasi IPK, filter pilihan saat impor kurikulum. Progres SKS di atas E adalah indikasi sementara, bukan validasi ketentuan kelulusan UT. Absensi cepat baru menggunakan ID jadwal dan tanggal; data absensi historis tanpa ID jadwal tidak dihapus atau digabung otomatis.
- Offline data akademik dan memo, cache shell PWA, sinkronisasi antrean. Belum mencakup transaksi keuangan dan lampiran.
- Push notification server H-7/H-3/H-1/H-1 jam; belum ada ringkasan pagi atau pengingat jadwal berulang.
- Vault mengunci ketika meninggalkan halaman/menyembunyikan aplikasi atau 2 menit idle; belum merupakan audit keamanan independen. Recovery key tidak lagi ditawarkan untuk dikirim lewat email.
- Perbaikan sebagian error handling, penghapusan file pembayaran yang lama, cache versi lama, dan pengingat yang berubah setelah tanggal diedit.
- Fitur tahap berikutnya: finance lengkap, pusat dokumen, tracker tutorial UT, checklist tugas, study tracker, restore backup, global search, integrasi kalender, dan opsi recovery vault lebih lengkap. Dark mode sengaja tidak ditambahkan.

## E. Validasi dan rollback

Sintaks JavaScript diperiksa dengan Node.js; TypeScript fungsi ditranspile untuk validasi sintaks. Uji end-to-end browser lokal tidak dapat berjalan karena akses server localhost diblokir oleh lingkungan pengujian. Tidak ada perubahan yang dilakukan pada repository atau Supabase asli. Uji integrasi online/offline, RLS dan pengiriman push setelah deploy masih wajib dilakukan pada perangkat sendiri. V11 adalah paket siap dipasang untuk pengujian, bukan jaminan production-ready.

Rollback: sinkronkan perubahan terlebih dahulu, nonaktifkan job Cron, lalu pulihkan file frontend dari commit sebelumnya. Tabel dan kolom baru dapat tetap ada. Jangan menghapus tabel untuk rollback tanpa backup. Jika ada antrean yang gagal, jangan hapus site data sampai perubahan dipulihkan.

Referensi: https://supabase.com/docs/guides/functions/schedule-functions ; https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe
