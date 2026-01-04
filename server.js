const express = require('express');
const path = require('path');
const Database = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize database
const database = new Database();
let db;

async function initializeDatabase() {
  try {
    await database.connect();
    db = database;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Radio Calico Server</title></head>
      <body>
        <h1>Welcome to Radio Calico!</h1>
        <p>Server is running with Node.js and ${process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite'}</p>
        <h2>API Endpoints:</h2>
        <ul>
          <li>GET /api/users - Get all users</li>
          <li>POST /api/users - Create a new user</li>
          <li>GET /api/test-db - Test database connection</li>
          <li>GET /api/db-metrics - Get database connection pool metrics</li>
          <li>GET /api/client-ip - Get client IP address</li>
          <li>GET /api/ratings/:songId - Get rating counts for a song</li>
          <li>POST /api/ratings - Submit or update a rating</li>
        </ul>
      </body>
    </html>
  `);
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const versionQuery = db.getVersionQuery();
    const result = await db.get(versionQuery, []);
    res.json({
      message: 'Database connected successfully',
      database_type: db.type,
      version: result.version
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Database metrics endpoint (for monitoring)
app.get('/api/db-metrics', async (req, res) => {
  try {
    if (db.type === 'postgres' && db.pool) {
      res.json({
        database_type: 'postgres',
        pool: {
          total: db.pool.totalCount,
          idle: db.pool.idleCount,
          waiting: db.pool.waitingCount
        }
      });
    } else if (db.type === 'sqlite') {
      res.json({
        database_type: 'sqlite',
        message: 'SQLite does not use connection pooling'
      });
    } else {
      res.status(503).json({ error: 'Database not connected' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get client IP address
app.get('/api/client-ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] ||
             req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             req.connection?.socket?.remoteAddress;
  res.json({ ip: ip });
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM users', []);
    res.json({ users: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const sql = db.type === 'postgres'
      ? 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id'
      : 'INSERT INTO users (name, email) VALUES (?, ?)';
    const params = [name, email];
    const result = await db.run(sql, params);

    res.json({
      message: 'User created successfully',
      user: { id: result.lastID, name, email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get rating counts for a song
app.get('/api/ratings/:songId', async (req, res) => {
  const songId = req.params.songId;

  try {
    const sql = db.type === 'postgres'
      ? 'SELECT rating_type, COUNT(*) as count FROM ratings WHERE song_id = $1 GROUP BY rating_type'
      : 'SELECT rating_type, COUNT(*) as count FROM ratings WHERE song_id = ? GROUP BY rating_type';
    const rows = await db.query(sql, [songId]);

    const ratings = {
      thumbs_up: 0,
      thumbs_down: 0
    };
    rows.forEach(row => {
      ratings[row.rating_type] = parseInt(row.count);
    });
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a rating
app.post('/api/ratings', async (req, res) => {
  const { song_id, artist, title, rating_type, user_id } = req.body;

  if (!song_id || !artist || !title || !rating_type || !user_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['thumbs_up', 'thumbs_down'].includes(rating_type)) {
    return res.status(400).json({ error: 'Invalid rating type' });
  }

  try {
    // Check if user has already rated this song
    const selectSql = db.type === 'postgres'
      ? 'SELECT id, rating_type FROM ratings WHERE song_id = $1 AND user_id = $2'
      : 'SELECT id, rating_type FROM ratings WHERE song_id = ? AND user_id = ?';

    const existingRating = await db.get(selectSql, [song_id, user_id]);

    if (existingRating) {
      // User has already rated this song
      if (existingRating.rating_type === rating_type) {
        return res.status(400).json({ error: 'You have already rated this song' });
      } else {
        // Different rating, update it
        const updateSql = db.type === 'postgres'
          ? 'UPDATE ratings SET rating_type = $1 WHERE song_id = $2 AND user_id = $3'
          : 'UPDATE ratings SET rating_type = ? WHERE song_id = ? AND user_id = ?';

        await db.run(updateSql, [rating_type, song_id, user_id]);
        return res.json({ message: 'Rating updated successfully' });
      }
    } else {
      // Insert new rating
      const insertSql = db.type === 'postgres'
        ? 'INSERT INTO ratings (song_id, artist, title, rating_type, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id'
        : 'INSERT INTO ratings (song_id, artist, title, rating_type, user_id) VALUES (?, ?, ?, ?, ?)';

      const result = await db.run(insertSql, [song_id, artist, title, rating_type, user_id]);
      return res.json({ message: 'Rating submitted successfully', id: result.lastID });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${db.type}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  try {
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down...');
  try {
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
