import 'dotenv/config';
import mysql from 'mysql2/promise';
import { dbConfig, ssl } from '../src/db.js';
// Menambah dukungan komik ke database yang sudah ada. Aman dijalankan berulang.
const c = await mysql.createConnection({ ...dbConfig(), ssl });
const [col] = await c.query("SHOW COLUMNS FROM novels LIKE 'type'");
if (!col.length) await c.query("ALTER TABLE novels ADD COLUMN type ENUM('novel','comic') NOT NULL DEFAULT 'novel' AFTER author_id");
await c.query(`CREATE TABLE IF NOT EXISTS chapter_pages(
  id INT AUTO_INCREMENT PRIMARY KEY, chapter_id INT NOT NULL, position INT NOT NULL, image_url VARCHAR(500) NOT NULL,
  KEY(chapter_id,position), FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE)`);
console.log('Migrasi komik selesai.');
process.exit(0);
