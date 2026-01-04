const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

class Database {
  constructor() {
    // Allow explicit DB_TYPE override, otherwise default based on NODE_ENV
    this.type = process.env.DB_TYPE || (process.env.NODE_ENV === 'production' ? 'postgres' : 'sqlite');
    this.client = null;
    this.pool = null;
  }

  async connect() {
    if (this.type === 'postgres') {
      return this.connectPostgres();
    } else {
      return this.connectSQLite();
    }
  }

  connectPostgres() {
    return new Promise((resolve, reject) => {
      this.pool = new Pool({
        host: process.env.POSTGRES_HOST || 'postgres',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'radiocalico',
        user: process.env.POSTGRES_USER || 'radiocalico',
        password: process.env.POSTGRES_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
      });

      // Test connection
      this.pool.query('SELECT version()', (err, result) => {
        if (err) {
          console.error('Error connecting to PostgreSQL:', err.message);
          this.pool.end(); // Clean up pool on connection error
          reject(err);
        } else {
          console.log('Connected to PostgreSQL database');
          console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
          resolve();
        }
      });
    });
  }

  connectSQLite() {
    return new Promise((resolve, reject) => {
      const DB_PATH = process.env.DB_PATH || './database.db';
      this.client = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.initializeSQLiteTables().then(resolve).catch(reject);
        }
      });
    });
  }

  initializeSQLiteTables() {
    return new Promise((resolve, reject) => {
      this.client.serialize(() => {
        this.client.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) return reject(err);
        });

        this.client.run(`CREATE TABLE IF NOT EXISTS ratings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          song_id TEXT NOT NULL,
          artist TEXT NOT NULL,
          title TEXT NOT NULL,
          rating_type TEXT NOT NULL CHECK(rating_type IN ('thumbs_up', 'thumbs_down')),
          user_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(song_id, user_id)
        )`, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  async query(sql, params = []) {
    if (this.type === 'postgres') {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } else {
      return new Promise((resolve, reject) => {
        this.client.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.type === 'postgres') {
      const result = await this.pool.query(sql, params);
      return result.rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        this.client.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  async run(sql, params = []) {
    if (this.type === 'postgres') {
      const result = await this.pool.query(sql, params);
      return {
        lastID: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    } else {
      return new Promise((resolve, reject) => {
        this.client.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  }

  async close() {
    if (this.type === 'postgres' && this.pool) {
      await this.pool.end();
      console.log('PostgreSQL connection pool closed');
    } else if (this.client) {
      return new Promise((resolve, reject) => {
        this.client.close((err) => {
          if (err) reject(err);
          else {
            console.log('SQLite connection closed');
            resolve();
          }
        });
      });
    }
  }

  getVersionQuery() {
    return this.type === 'postgres' ? 'SELECT version()' : 'SELECT sqlite_version() as version';
  }
}

module.exports = Database;
