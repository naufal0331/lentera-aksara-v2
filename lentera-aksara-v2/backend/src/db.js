import fs from 'fs';
import mysql from 'mysql2/promise';
// Koneksi: isi DB_URL (mis. MYSQL_PUBLIC_URL dari Railway) ATAU DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
export const dbConfig = () => process.env.DB_URL ? { uri: process.env.DB_URL } : {
  host: process.env.DB_HOST, port: +process.env.DB_PORT || 3306, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME };
// SSL opsional untuk penyedia yang mewajibkannya (mis. Aiven): DB_CA atau DB_CA_FILE
const ca = process.env.DB_CA ? process.env.DB_CA.replace(/\\n/g, '\n') : process.env.DB_CA_FILE ? fs.readFileSync(process.env.DB_CA_FILE) : undefined;
export const ssl = ca ? { ca } : undefined;
export const db = mysql.createPool({ ...dbConfig(), waitForConnections: true, connectionLimit: 10, ssl });
