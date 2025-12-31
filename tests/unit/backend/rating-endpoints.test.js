const request = require('supertest');
const TestDatabase = require('../../helpers/test-db');
const { createTestApp } = require('../../helpers/test-server');
const { generateMockRating } = require('../../helpers/mock-data');
const { assertRatingResponse, assertErrorResponse, assertSuccessResponse } = require('../../helpers/assertions');

describe('Rating Endpoints - Unit Tests', () => {
  let testDb;
  let app;
  let db;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.initialize();
    db = testDb.getDb();
    app = createTestApp(db);
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.cleanup();
  });

  describe('GET /api/ratings/:songId', () => {
    test('should return zero counts for new song', async () => {
      const response = await request(app)
        .get('/api/ratings/newSongId123')
        .expect(200);

      assertRatingResponse(response, 0, 0);
    });

    test('should return correct counts for song with ratings', async () => {
      const songId = 'testSong123';

      // Insert test data
      await new Promise((resolve) => {
        db.run(
          'INSERT INTO ratings (song_id, artist, title, rating_type, user_id) VALUES (?, ?, ?, ?, ?)',
          [songId, 'Artist1', 'Title1', 'thumbs_up', 'user1'],
          resolve
        );
      });

      await new Promise((resolve) => {
        db.run(
          'INSERT INTO ratings (song_id, artist, title, rating_type, user_id) VALUES (?, ?, ?, ?, ?)',
          [songId, 'Artist1', 'Title1', 'thumbs_up', 'user2'],
          resolve
        );
      });

      await new Promise((resolve) => {
        db.run(
          'INSERT INTO ratings (song_id, artist, title, rating_type, user_id) VALUES (?, ?, ?, ?, ?)',
          [songId, 'Artist1', 'Title1', 'thumbs_down', 'user3'],
          resolve
        );
      });

      const response = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);

      assertRatingResponse(response, 2, 1);
    });

    test('should only count ratings for specified song', async () => {
      // Insert ratings for different songs
      await new Promise((resolve) => {
        db.run(
          'INSERT INTO ratings (song_id, artist, title, rating_type, user_id) VALUES (?, ?, ?, ?, ?)',
          ['song1', 'Artist1', 'Title1', 'thumbs_up', 'user1'],
          resolve
        );
      });

      await new Promise((resolve) => {
        db.run(
          'INSERT INTO ratings (song_id, artist, title, rating_type, user_id) VALUES (?, ?, ?, ?, ?)',
          ['song2', 'Artist2', 'Title2', 'thumbs_down', 'user2'],
          resolve
        );
      });

      const response = await request(app)
        .get('/api/ratings/song1')
        .expect(200);

      assertRatingResponse(response, 1, 0);
    });
  });

  describe('POST /api/ratings', () => {
    test('should successfully insert new rating', async () => {
      const rating = generateMockRating();

      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(200);

      assertSuccessResponse(response, 'Rating submitted successfully');
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('number');
    });

    test('should reject rating with missing song_id', async () => {
      const rating = generateMockRating();
      delete rating.song_id;

      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(400);

      assertErrorResponse(response, 400, 'All fields are required');
    });

    test('should reject rating with missing artist', async () => {
      const rating = generateMockRating();
      delete rating.artist;

      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(400);

      assertErrorResponse(response, 400, 'All fields are required');
    });

    test('should reject rating with missing title', async () => {
      const rating = generateMockRating();
      delete rating.title;

      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(400);

      assertErrorResponse(response, 400, 'All fields are required');
    });

    test('should reject rating with missing rating_type', async () => {
      const rating = generateMockRating();
      delete rating.rating_type;

      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(400);

      assertErrorResponse(response, 400, 'All fields are required');
    });

    test('should reject rating with missing user_id', async () => {
      const rating = generateMockRating();
      delete rating.user_id;

      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(400);

      assertErrorResponse(response, 400, 'All fields are required');
    });

    test('should reject invalid rating_type', async () => {
      const rating = generateMockRating({ rating_type: 'invalid_type' });

      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(400);

      assertErrorResponse(response, 400, 'Invalid rating type');
    });

    test('should reject duplicate rating (same rating_type)', async () => {
      const rating = generateMockRating();

      // Submit first rating
      await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(200);

      // Submit duplicate rating
      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(400);

      assertErrorResponse(response, 400, 'You have already rated this song');
    });

    test('should update rating when user changes vote', async () => {
      const rating = generateMockRating({ rating_type: 'thumbs_up' });

      // Submit initial thumbs up
      await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(200);

      // Change to thumbs down
      const updatedRating = { ...rating, rating_type: 'thumbs_down' };
      const response = await request(app)
        .post('/api/ratings')
        .send(updatedRating)
        .expect(200);

      assertSuccessResponse(response, 'Rating updated successfully');
    });

    test('should allow different users to rate the same song', async () => {
      const rating1 = generateMockRating({ user_id: 'user1' });
      const rating2 = generateMockRating({ user_id: 'user2' });

      const response1 = await request(app)
        .post('/api/ratings')
        .send(rating1)
        .expect(200);

      const response2 = await request(app)
        .post('/api/ratings')
        .send(rating2)
        .expect(200);

      expect(response1.body.id).not.toBe(response2.body.id);
    });

    test('should handle special characters in artist and title', async () => {
      const rating = generateMockRating({
        artist: "L'Orchestra di Piazza Vittorio",
        title: "Mozart's Symphony №41 \"Jupiter\""
      });

      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(200);

      assertSuccessResponse(response, 'Rating submitted successfully');
    });
  });
});
