import fs from 'fs';
import mysql from 'mysql2/promise';
import { dbConfig, ssl } from '../src/db.js';
const c = await mysql.createConnection({ ...dbConfig(), ssl, multipleStatements: true });
await c.query(fs.readFileSync(new URL('../../database/schema-hosted.sql', import.meta.url), 'utf8'));
console.log('Tabel dan data contoh berhasil diimpor.');
process.exit(0);
