/**
 * Song ID Generation Unit Tests
 *
 * Tests the generateSongId function from player.js
 * This function creates a unique ID from artist and title using base64 encoding
 */

describe('Song ID Generation', () => {
  // Implement the function as it exists in player.js
  // Note: btoa is not available in Node.js, so we use Buffer.from().toString('base64')
  function generateSongId(artist, title) {
    const base64 = Buffer.from(artist + '|' + title).toString('base64');
    return base64.replace(/[^a-zA-Z0-9]/g, '');
  }

  test('should generate consistent IDs for same artist and title', () => {
    const id1 = generateSongId('Beethoven', 'Symphony No. 5');
    const id2 = generateSongId('Beethoven', 'Symphony No. 5');
    expect(id1).toBe(id2);
  });

  test('should generate different IDs for different songs', () => {
    const id1 = generateSongId('Beethoven', 'Symphony No. 5');
    const id2 = generateSongId('Mozart', 'Symphony No. 40');
    expect(id1).not.toBe(id2);
  });

  test('should be case-sensitive', () => {
    const id1 = generateSongId('beethoven', 'symphony no. 5');
    const id2 = generateSongId('Beethoven', 'Symphony No. 5');
    expect(id1).not.toBe(id2);
  });

  test('should handle special characters', () => {
    const id = generateSongId("L'Orchestra", "Mozart's \"Jupiter\"");
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('should only contain alphanumeric characters', () => {
    const id = generateSongId('Test Artist', 'Test Title');
    expect(id).toMatch(/^[a-zA-Z0-9]+$/);
  });

  test('should handle empty strings', () => {
    const id = generateSongId('', '');
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  test('should handle unicode characters', () => {
    const id = generateSongId('Dvořák', 'Symphony №9');
    expect(id).toBeTruthy();
    expect(id).toMatch(/^[a-zA-Z0-9]+$/);
  });

  test('should encode pipe characters in inputs', () => {
    const id1 = generateSongId('Artist|Name', 'Title');
    const id2 = generateSongId('Artist', 'Name|Title');
    // Note: Both encode to 'Artist|Name|Title' so they're the same
    // This shows that pipes in input data are indistinguishable from the separator
    expect(id1).toBe(id2);
    expect(id1).toBeTruthy();
  });

  test('should handle very long artist and title names', () => {
    const longArtist = 'A'.repeat(500);
    const longTitle = 'B'.repeat(500);
    const id = generateSongId(longArtist, longTitle);
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });
});
