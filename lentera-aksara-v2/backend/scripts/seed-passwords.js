import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/db.js';
const pw = process.env.SEED_PASSWORD || 'Password123!';   // untuk situs online, isi SEED_PASSWORD yang kuat
const h = await bcrypt.hash(pw, 12);
await db.query("UPDATE users SET password_hash=? WHERE password_hash='x'", [h]);
console.log('Selesai. Akun demo: admin@ / penulis@ / pembaca@lenteraaksara.test');
process.exit(0);
