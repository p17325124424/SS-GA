# Rencana Implementasi: Privasi Super Admin & Penyederhanaan Login Pemain

Rencana ini menetapkan langkah-langkah untuk menyembunyikan seluruh tombol, label, dan penyebutan Super Admin (termasuk email `p17325124424`) dari tampilan publik aplikasi, memastikan panel pengelolaan data hanya dapat diakses secara otomatis saat pemilik akun resmi login, serta menyederhanakan dialog login hanya untuk pemain/pengguna dengan kolom murni "Nama Pengguna" dan "Kata Sandi" tanpa contoh kata sandi apapun.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan masukan dan jawaban Anda:
> 1. **Akses Super Admin Tersembunyi**: Tombol panel Super Admin **dihapus total dari tampilan publik**. Menu Super Admin hanya akan muncul secara otomatis di bilah navigasi dan menu pengguna **setelah Anda berhasil masuk menggunakan akun email admin resmi (`p17325124424@student.poltekkesbandung.ac.id`)**. Publik tidak akan melihat tombol, tab, badge, atau identitas admin sama sekali.
> 2. **Dialog Login Publik Sederhana**: Modal login publik **hanya menampilkan form login pemain**.
> 3. **Hanya Menjadi "Nama Pengguna"**: Label dan placeholder form login dibuat murni **"Nama Pengguna"** (dapat diisi dan di-update sesuai kebutuhan).
> 4. **Jangan Ada Contoh Password**: Form **"Kata Sandi"** bersih tanpa contoh password apapun (tidak ada placeholder 12345 atau teks contoh).

---

## 1. Overview & Core Concept

- **Tujuan Utama**: Menjamin privasi dan kerahasiaan identitas peneliti/pengelola data (`p17325124424@student.poltekkesbandung.ac.id`) sehingga anak-anak, orang tua, dan pengguna umum hanya melihat antarmuka permainan ramah anak (*child-friendly tooth brushing companion*), tanpa distraksi atau kebocoran peran administratif.
- **Pengalaman Pengguna Umum**: Pengguna hanya disuguhi form login pemain bersih (Nama Pengguna & Kata Sandi) untuk bermain game 2 menit, memantau streak, mengumpulkan bintang, dan membaca panduan.
- **Pengalaman Super Admin**: Saat admin masuk menggunakan otentikasi Google atau email admin, sistem secara internal mengenali email `p17325124424@student.poltekkesbandung.ac.id` dan memunculkan akses panel pengelolaan data secara otomatis di menu akun.

---

## 2. User Experience & Visual Design

### A. Antarmuka Publik (Bebas dari Jejak Admin)
1. **Bilah Navigasi Utama (Top Bar)**:
   - Menghapus tab navigasi `"Super Admin"` / `"Kelola Data"` dari daftar tab utama saat pengguna belum terotentikasi sebagai admin.
   - Tab navigasi publik yang terlihat hanya:
     - `🎮 Game 2 Menit`
     - `📅 Kalender Streak`
     - `🏆 Sikat & Lencana`
     - `📖 Tips & Ujian Online`
   - Tombol masuk di kanan atas berlabel santun: `[Masuk Akun]`.

2. **Dialog Login Pemain**:
   - Menghapus seluruh switcher tab: tab *"Super Admin"*, *"Google"*, dan *"Email Lain"* dihapus dari tampilan modal.
   - Form tunggal yang ramah anak:
     - Field **Nama Pengguna** (placeholder: "Nama Pengguna", dapat diisi/diupdate bebas).
     - Field **Kata Sandi** (placeholder: "Kata Sandi", **tanpa contoh password**, dilengkapi ikon mata buka/tutup).
     - Tombol aksi utama: `[🦷 Masuk & Simpan ke Database]`.
     - Link teks tersamar di bawah form (*"Atau masuk dengan Akun Google"*) untuk memfasilitasi admin melakukan sign-in Google tanpa mengekspos identitas email admin kepada publik.

3. **Footer Aplikasi**:
   - Menghapus teks atau atribusi email `p17325124424` dan label admin dari footer.
   - Footer hanya menampilkan informasi kesehatan: *GigiJuara PWA • Sahabat Senyum Sehat Anak Indonesia • PDGI 2 Menit*.

4. **Tampilan Eksklusif Saat Admin Login**:
   - Hanya ketika session Firebase Auth mendeteksi `p17325124424@student.poltekkesbandung.ac.id`:
     - Muncul indikator profil privat di sudut kanan atas.
     - Dropdown menu akun membuka opsi rahasia `[👑 Buka Pusat Kendali Data]`.
     - Mengarahkan ke Super Admin Panel untuk melihat rekap riwayat sikat gigi seluruh peserta, mengedit statistik, dan mengekspor CSV.

---

## 3. Key Product Decisions & Trade-Offs

| Keputusan | Pendekatan Terpilih | Alasan & Keuntungan |
| :--- | :--- | :--- |
| **Penyembunyian Tombol Admin** | Dihilangkan total dari DOM publik, hanya dirender saat `isSuper === true` | Memenuhi 100% permintaan kerahasiaan; mencegah rasa penasaran anak/pengguna lain untuk mengklik tombol admin. |
| **Otentikasi Admin** | Menggunakan tombol Google Sign-In minimalis/bersih di dasar form pemain atau login admin | Admin tetap dapat masuk dengan akun Google resminya tanpa perlu mengekspos alamat email admin di antarmuka publik. |
| **Nama Pengguna Dinamis** | Input hanya berlabel "Nama Pengguna" dan placeholder "Nama Pengguna" | Memberi kebebasan identitas pemain tanpa hardcode saran yang membingungkan. |
| **Tanpa Contoh Password** | Menghilangkan semua contoh password (seperti 12345) dari label/placeholder/helper text | Memastikan kerahasiaan dan kepatuhan penuh terhadap instruksi pengguna. |
| **Firestore Security Rules** | Tetap mempertahankan aturan keamanan ketat di sisi server | Meskipun UI disembunyikan, perlindungan database tetap absolut: hanya `p17325124424` yang dapat membaca daftar koleksi `/users`. |
