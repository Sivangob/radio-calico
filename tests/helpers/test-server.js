const express = require('express');

function createTestApp(db) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // GET /api/ratings/:songId
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

  // POST /api/ratings
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

  return app;
}

module.exports = { createTestApp };
