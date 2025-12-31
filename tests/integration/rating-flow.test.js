const request = require('supertest');
const TestDatabase = require('../helpers/test-db');
const { createTestApp } = require('../helpers/test-server');
const { generateMockRating, generateMockUserId } = require('../helpers/mock-data');

describe('Rating Flow - Integration Tests', () => {
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

  describe('Complete rating workflow', () => {
    test('should handle complete new rating flow', async () => {
      const songId = 'integrationTestSong1';
      const userId = generateMockUserId('flow1');
      const rating = generateMockRating({
        song_id: songId,
        user_id: userId,
        rating_type: 'thumbs_up'
      });

      // Step 1: Check initial ratings (should be zero)
      let response = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(0);
      expect(response.body.thumbs_down).toBe(0);

      // Step 2: Submit rating
      response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(200);
      expect(response.body.message).toBe('Rating submitted successfully');

      // Step 3: Verify rating was saved
      response = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(1);
      expect(response.body.thumbs_down).toBe(0);
    });

    test('should handle rating change workflow', async () => {
      const songId = 'integrationTestSong2';
      const userId = generateMockUserId('flow2');

      // Submit initial thumbs up
      await request(app)
        .post('/api/ratings')
        .send(generateMockRating({
          song_id: songId,
          user_id: userId,
          rating_type: 'thumbs_up'
        }))
        .expect(200);

      // Verify thumbs up
      let response = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(1);
      expect(response.body.thumbs_down).toBe(0);

      // Change to thumbs down
      await request(app)
        .post('/api/ratings')
        .send(generateMockRating({
          song_id: songId,
          user_id: userId,
          rating_type: 'thumbs_down'
        }))
        .expect(200);

      // Verify change
      response = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(0);
      expect(response.body.thumbs_down).toBe(1);
    });

    test('should handle multiple users rating same song', async () => {
      const songId = 'integrationTestSong3';
      const users = [
        generateMockUserId('multi1'),
        generateMockUserId('multi2'),
        generateMockUserId('multi3'),
        generateMockUserId('multi4')
      ];

      // Three users vote thumbs up
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/ratings')
          .send(generateMockRating({
            song_id: songId,
            user_id: users[i],
            rating_type: 'thumbs_up'
          }))
          .expect(200);
      }

      // One user votes thumbs down
      await request(app)
        .post('/api/ratings')
        .send(generateMockRating({
          song_id: songId,
          user_id: users[3],
          rating_type: 'thumbs_down'
        }))
        .expect(200);

      // Verify final counts
      const response = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(3);
      expect(response.body.thumbs_down).toBe(1);
    });

    test('should prevent duplicate voting', async () => {
      const songId = 'integrationTestSong4';
      const userId = generateMockUserId('dup1');
      const rating = generateMockRating({
        song_id: songId,
        user_id: userId,
        rating_type: 'thumbs_up'
      });

      // First vote succeeds
      await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(200);

      // Duplicate vote fails
      const response = await request(app)
        .post('/api/ratings')
        .send(rating)
        .expect(400);
      expect(response.body.error).toBe('You have already rated this song');

      // Verify count is still 1
      const getResponse = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);
      expect(getResponse.body.thumbs_up).toBe(1);
    });

    test('should isolate ratings between different songs', async () => {
      const userId = generateMockUserId('iso1');
      const song1 = 'isolationTestSong1';
      const song2 = 'isolationTestSong2';

      // Rate song 1 as thumbs up
      await request(app)
        .post('/api/ratings')
        .send(generateMockRating({
          song_id: song1,
          user_id: userId,
          rating_type: 'thumbs_up'
        }))
        .expect(200);

      // Rate song 2 as thumbs down
      await request(app)
        .post('/api/ratings')
        .send(generateMockRating({
          song_id: song2,
          user_id: userId,
          rating_type: 'thumbs_down',
          artist: 'Different Artist',
          title: 'Different Title'
        }))
        .expect(200);

      // Verify song 1 ratings
      let response = await request(app)
        .get(`/api/ratings/${song1}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(1);
      expect(response.body.thumbs_down).toBe(0);

      // Verify song 2 ratings
      response = await request(app)
        .get(`/api/ratings/${song2}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(0);
      expect(response.body.thumbs_down).toBe(1);
    });
  });

  describe('Edge cases and error scenarios', () => {
    test('should handle rapid successive rating changes', async () => {
      const songId = 'rapidChangeSong';
      const userId = generateMockUserId('rapid1');

      // Rapidly change rating back and forth
      await request(app)
        .post('/api/ratings')
        .send(generateMockRating({
          song_id: songId,
          user_id: userId,
          rating_type: 'thumbs_up'
        }))
        .expect(200);

      await request(app)
        .post('/api/ratings')
        .send(generateMockRating({
          song_id: songId,
          user_id: userId,
          rating_type: 'thumbs_down'
        }))
        .expect(200);

      await request(app)
        .post('/api/ratings')
        .send(generateMockRating({
          song_id: songId,
          user_id: userId,
          rating_type: 'thumbs_up'
        }))
        .expect(200);

      // Final state should be thumbs up
      const response = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(1);
      expect(response.body.thumbs_down).toBe(0);
    });

    test('should handle concurrent ratings from different users', async () => {
      const songId = 'concurrentSong';
      const users = Array.from({ length: 10 }, (_, i) =>
        generateMockUserId(`concurrent${i}`)
      );

      // Submit ratings concurrently
      const promises = users.map((userId, index) =>
        request(app)
          .post('/api/ratings')
          .send(generateMockRating({
            song_id: songId,
            user_id: userId,
            rating_type: index % 2 === 0 ? 'thumbs_up' : 'thumbs_down'
          }))
      );

      await Promise.all(promises);

      // Verify all ratings were recorded
      const response = await request(app)
        .get(`/api/ratings/${songId}`)
        .expect(200);
      expect(response.body.thumbs_up).toBe(5);
      expect(response.body.thumbs_down).toBe(5);
    });
  });
});
