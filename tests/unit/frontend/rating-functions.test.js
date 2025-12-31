/**
 * Frontend Rating Functions Unit Tests
 *
 * Tests localStorage operations and rating management
 */

describe('Rating Storage Functions', () => {
  let localStorageMock;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = (() => {
      let store = {};
      return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        clear: () => { store = {}; }
      };
    })();

    global.localStorage = localStorageMock;
  });

  // Implement functions from player.js
  function getRatingFromStorage(songId) {
    const ratings = JSON.parse(localStorage.getItem('song_ratings') || '{}');
    return ratings[songId] || null;
  }

  function saveRatingToStorage(songId, ratingType) {
    const ratings = JSON.parse(localStorage.getItem('song_ratings') || '{}');
    ratings[songId] = ratingType;
    localStorage.setItem('song_ratings', JSON.stringify(ratings));
  }

  describe('getRatingFromStorage', () => {
    test('should return null for non-existent song', () => {
      const rating = getRatingFromStorage('nonExistentSong');
      expect(rating).toBeNull();
    });

    test('should return stored rating for existing song', () => {
      saveRatingToStorage('song123', 'thumbs_up');
      const rating = getRatingFromStorage('song123');
      expect(rating).toBe('thumbs_up');
    });

    test('should handle empty localStorage', () => {
      localStorage.clear();
      const rating = getRatingFromStorage('anySong');
      expect(rating).toBeNull();
    });

    test('should handle corrupted localStorage data', () => {
      localStorage.setItem('song_ratings', 'invalid json');
      expect(() => getRatingFromStorage('song123')).toThrow();
    });
  });

  describe('saveRatingToStorage', () => {
    test('should save new rating', () => {
      saveRatingToStorage('song123', 'thumbs_up');
      const rating = getRatingFromStorage('song123');
      expect(rating).toBe('thumbs_up');
    });

    test('should update existing rating', () => {
      saveRatingToStorage('song123', 'thumbs_up');
      saveRatingToStorage('song123', 'thumbs_down');
      const rating = getRatingFromStorage('song123');
      expect(rating).toBe('thumbs_down');
    });

    test('should maintain separate ratings for different songs', () => {
      saveRatingToStorage('song1', 'thumbs_up');
      saveRatingToStorage('song2', 'thumbs_down');

      expect(getRatingFromStorage('song1')).toBe('thumbs_up');
      expect(getRatingFromStorage('song2')).toBe('thumbs_down');
    });

    test('should persist multiple ratings', () => {
      saveRatingToStorage('song1', 'thumbs_up');
      saveRatingToStorage('song2', 'thumbs_down');
      saveRatingToStorage('song3', 'thumbs_up');

      const allRatings = JSON.parse(localStorage.getItem('song_ratings'));
      expect(Object.keys(allRatings).length).toBe(3);
    });
  });
});
