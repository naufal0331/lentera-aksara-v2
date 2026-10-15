   import 'dotenv/config';
   import bcrypt from 'bcryptjs';
   import { db } from '../src/db.js';
   const pw = process.env.SEED_PASSWORD || 'Password123!';
   const lemah = ['Password123!', 'password-kuat-pilihan-anda'];
   if (process.env.DB_URL && (lemah.includes(pw) || pw.length < 10)) {
     console.error('Untuk database online, isi SEED_PASSWORD yang kuat (min. 10 karakter).');
     process.exit(1);
   }
   const h = await bcrypt.hash(pw, 12);
   await db.query("UPDATE users SET password_hash=? WHERE email LIKE '%@lenteraaksara.test'", [h]);
   console.log('Selesai. Password akun demo diperbarui.');
   process.exit(0);
