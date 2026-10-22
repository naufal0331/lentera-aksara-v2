import 'dotenv/config';
import mysql from 'mysql2/promise';
import { dbConfig, ssl } from '../src/db.js';
// Menambah kolom tautan pada notifikasi di database yang sudah berjalan. Aman dijalankan berulang.
const c = await mysql.createConnection({ ...dbConfig(), ssl });
const [col] = await c.query("SHOW COLUMNS FROM notifications LIKE 'link'");
if (!col.length) await c.query("ALTER TABLE notifications ADD COLUMN link VARCHAR(255) NULL AFTER message");
console.log('Migrasi fitur selesai.');
process.exit(0);
