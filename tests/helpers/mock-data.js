function generateMockRating(overrides = {}) {
  return {
    song_id: 'QmVldGhvdmVufFN5bXBob255IE5vLiA1',
    artist: 'Beethoven',
    title: 'Symphony No. 5',
    rating_type: 'thumbs_up',
    user_id: 'user_test123',
    ...overrides
  };
}

function generateMockSongData(overrides = {}) {
  return {
    artist: 'Bach',
    title: 'Brandenburg Concerto No. 3',
    album: 'Brandenburg Concertos',
    bit_depth: 24,
    sample_rate: 48000,
    date: '1721',
    ...overrides
  };
}

function generateMockUserId(suffix = '123') {
  return `user_test${suffix}`;
}

function generateMockSongId(artist, title) {
  return Buffer.from(artist + '|' + title).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

module.exports = {
  generateMockRating,
  generateMockSongData,
  generateMockUserId,
  generateMockSongId
};
