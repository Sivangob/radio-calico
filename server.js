const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');

    // Create a sample table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create ratings table
    db.run(`CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id TEXT NOT NULL,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      rating_type TEXT NOT NULL CHECK(rating_type IN ('thumbs_up', 'thumbs_down')),
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(song_id, user_id)
    )`);
  }
});

// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Node.js + SQLite Server</title></head>
      <body>
        <h1>Welcome to your local web server!</h1>
        <p>Server is running with Node.js and SQLite</p>
        <h2>API Endpoints:</h2>
        <ul>
          <li>GET /api/users - Get all users</li>
          <li>POST /api/users - Create a new user</li>
          <li>GET /api/test-db - Test database connection</li>
        </ul>
      </body>
    </html>
  `);
});

// Test database connection
app.get('/api/test-db', (req, res) => {
  db.get('SELECT sqlite_version() as version', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        message: 'Database connected successfully',
        sqlite_version: row.version
      });
    }
  });
});

// Get client IP address
app.get('/api/client-ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             req.connection.socket.remoteAddress;
  res.json({ ip: ip });
});

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ users: rows });
    }
  });
});

// Create a new user
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        message: 'User created successfully',
        user: { id: this.lastID, name, email }
      });
    }
  });
});

// Get rating counts for a song
app.get('/api/ratings/:songId', (req, res) => {
  const songId = req.params.songId;

  db.all(
    'SELECT rating_type, COUNT(*) as count FROM ratings WHERE song_id = ? GROUP BY rating_type',
    [songId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        const ratings = {
          thumbs_up: 0,
          thumbs_down: 0
        };

        rows.forEach(row => {
          ratings[row.rating_type] = row.count;
        });

        res.json(ratings);
      }
    }
  );
});

// Submit a rating
app.post('/api/ratings', (req, res) => {
  const { song_id, artist, title, rating_type, user_id } = req.body;

  if (!song_id || !artist || !title || !rating_type || !user_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['thumbs_up', 'thumbs_down'].includes(rating_type)) {
    return res.status(400).json({ error: 'Invalid rating type' });
  }

  // Check if user has already rated this song
  db.get(
    'SELECT id, rating_type FROM ratings WHERE song_id = ? AND user_id = ?',
    [song_id, user_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (row) {
        // User has already rated this song
        if (row.rating_type === rating_type) {
          // Same rating, do nothing
          return res.status(400).json({ error: 'You have already rated this song' });
        } else {
          // Different rating, update it
          db.run(
            'UPDATE ratings SET rating_type = ? WHERE song_id = ? AND user_id = ?',
            [rating_type, song_id, user_id],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.json({ message: 'Rating updated successfully' });
            }
          );
        }
      } else {
        // Insert new rating
        db.run(
          'INSERT INTO ratings (song_id, artist, title, rating_type, user_id) VALUES (?, ?, ?, ?, ?)',
          [song_id, artist, title, rating_type, user_id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Rating submitted successfully', id: this.lastID });
          }
        );
      }
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});
