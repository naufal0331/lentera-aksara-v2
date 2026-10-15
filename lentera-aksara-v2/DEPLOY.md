# Deployment: Aiven (MySQL) → Render (backend) → Vercel (frontend)
Urutan: **1 Database → 2 Backend → 3 Frontend → 4 Hubungkan**. Cek paket gratis di situs resmi tiap layanan.

## 1. Aiven (MySQL)
1. console.aiven.io → Create service → **MySQL** → paket **Free** (cek kotak biaya, jangan Developer $5/bln). Tunggu **Running**.
2. Overview: catat Host, Port, User, Password, Database; unduh **CA certificate** (`ca.pem`).
3. Buat `backend/.env.cloud` (nama file tetap, tidak ikut GitHub):
   `DB_URL=mysql://USER:PASSWORD@HOST:PORT/defaultdb` (tanpa `?ssl-mode`), `DB_CA_FILE=<lokasi ca.pem>`, `SEED_PASSWORD=<password kuat>`
4. Di folder `backend`: `npm run db:import` lalu `npm run db:seed`.

## 2. Render (backend)
New → Web Service → repo. Root Directory `backend`, Build `npm install`, Start `npm start`, Instance Free.
Environment: `DB_URL`, `DB_CA` (isi lengkap ca.pem), `JWT_SECRET` (acak ≥32 karakter), `CLIENT_ORIGIN` (sementara `http://localhost:5173`).
Setelah Live: tambahkan `API_URL` = alamat Render. Uji `ALAMAT/api/health`.

## 3. Vercel (frontend)
Add New → Project → repo. Root Directory `frontend`, preset Vite. Environment: `VITE_API_URL` = alamat Render (tanpa `/` akhir). Deploy.

## 4. Hubungkan
Render → Environment: `CLIENT_ORIGIN` = alamat Vercel (tanpa `/` akhir dan tanpa jalur) → simpan, tunggu redeploy.

## Batasan
Render gratis tidur 15 menit (bangun ±1 menit) dan diskinya sementara, sehingga cover unggahan bisa hilang (solusi: Cloudinary). Aiven gratis bisa dimatikan otomatis bila lama tidak dipakai.
