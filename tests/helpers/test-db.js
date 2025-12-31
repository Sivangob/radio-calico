const sqlite3 = require('sqlite3').verbose();

class TestDatabase {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      // Create in-memory database
      this.db = new sqlite3.Database(':memory:', (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create ratings table
        this.db.run(`CREATE TABLE IF NOT EXISTS ratings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          song_id TEXT NOT NULL,
          artist TEXT NOT NULL,
          title TEXT NOT NULL,
          rating_type TEXT NOT NULL CHECK(rating_type IN ('thumbs_up', 'thumbs_down')),
          user_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(song_id, user_id)
        )`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async cleanup() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM ratings', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getDb() {
    return this.db;
  }
}

module.exports = TestDatabase;
