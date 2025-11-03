import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'elearning_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database and tables
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('📝 Setting up database...');

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'elearning_db'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'elearning_db'}`);

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema.split(';').filter(statement => statement.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }

    console.log('✅ Base schema created successfully');

    // Apply migrations from /migrations folder
    const migrationsPath = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsPath)) {
      const migrationFiles = await readdir(migrationsPath);
      for (const file of migrationFiles.sort()) {
        if (file.endsWith('.sql')) {
          try {
            const migration = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
            const migrationStatements = migration.split(';').filter(statement => statement.trim());
            
            for (const statement of migrationStatements) {
              if (statement.trim()) {
                await connection.query(statement);
              }
            }
            console.log(`✅ Applied migration: ${file}`);
          } catch (err) {
            console.error(`❌ Error applying migration ${file}:`, err);
          }
        }
      }
    }
    
    // Test if tables exist
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📊 Available tables:', tables.map(t => Object.values(t)[0]).join(', '));

    // Ensure lessons.file_path column exists (for uploaded files)
    const dbName = process.env.DB_NAME || 'elearning_db';
    const [cols] = await connection.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'file_path'`,
      [dbName]
    );
    if (cols[0] && cols[0].cnt === 0) {
      console.log('Adding file_path column to lessons table');
      await connection.query('ALTER TABLE lessons ADD COLUMN file_path VARCHAR(255) NULL AFTER video_url');
    }
    // Ensure lessons.description column exists (for lesson descriptions)
    const [descCol] = await connection.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'description'`,
      [dbName]
    );
    if (descCol[0] && descCol[0].cnt === 0) {
      console.log('Adding description column to lessons table');
      await connection.query("ALTER TABLE lessons ADD COLUMN description VARCHAR(1000) NULL AFTER title");
    }

    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Export an async function that ensures database is initialized
export const getPool = async () => {
  try {
    await initializeDatabase();
    return pool;
  } catch (error) {
    console.error('Failed to get database pool:', error);
    throw error;
  }
};

export { pool };