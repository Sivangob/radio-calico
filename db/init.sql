-- Radio Calico Database Schema for PostgreSQL
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  song_id VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  rating_type VARCHAR(20) NOT NULL CHECK(rating_type IN ('thumbs_up', 'thumbs_down')),
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(song_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ratings_song_id ON ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_song_user ON ratings(song_id, user_id);
