# Lentera Aksara — Terangi Imajinasi, Hidupkan Cerita.
Platform membaca dan menerbitkan novel online. React + Node.js/Express + MySQL.
Proyek ini berdiri sendiri: folder, database (`lentera_aksara_v2`), dan repo GitHub sebaiknya diberi nama baru.

```
lentera-aksara-v2/
├── backend/    API Express (auth, novel, bab, perpustakaan, penulis, admin)
├── frontend/   React + Vite (tema marun-emas-krem)
├── database/   schema.sql (lokal) dan schema-hosted.sql (database online)
└── DEPLOY.md   panduan Aiven + Render + Vercel
```

## Menjalankan di komputer (Windows)
1. Pasang **Node.js LTS** dan **XAMPP**; Start **MySQL**.
2. Ekstrak ke folder pendek tanpa spasi, mis. `C:\lentera-aksara-v2`, lalu buka di VS Code.
3. `http://localhost/phpmyadmin` → **Impor** → `database/schema.sql` (membuat database baru `lentera_aksara_v2`).
4. Backend (terminal di `backend`): `copy .env.example .env` → isi `JWT_SECRET` (teks acak ≥32 karakter) → `npm install` → `npm run seed` → `npm run dev`
5. Frontend (terminal baru di `frontend`): `npm install` → `npm run dev`
6. Buka `http://localhost:5173`

Akun demo (password `Password123!`, ganti sebelum online): `admin@`, `penulis@`, `pembaca@lenteraaksara.test`.
Novel yang diajukan penulis tampil setelah disetujui admin (Admin → Moderasi).

Online: lihat `DEPLOY.md`.
