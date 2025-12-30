# Radio Calico - Project Information

This file contains project-specific information and preferences for development.

## Development Server

**Default web server:** Express.js (Node.js)
- **Start command:** `npm start` or `npm run dev`
- **Port:** 3000
- **URL:** http://localhost:3000
- **Static files:** Served from `./public` directory

## Project Structure

```
radiocalico/
├── public/              # Static files served by Express
│   └── index.html      # HLS Radio Player
├── server.js           # Express server with SQLite integration
├── database.db         # SQLite database
├── package.json        # Node.js dependencies and scripts
└── node_modules/       # Dependencies
```

## Radio Player

Located at: `public/index.html`

**Stream URL:** https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8

**Features:**
- HLS lossless stream playback
- Uses hls.js library for broad browser support
- Volume controls
- Play/Pause functionality
- Live status indicator
- Error handling and auto-recovery

**Access:** http://localhost:3000/index.html (when server is running)

## API Endpoints

The Express server provides the following endpoints:

- `GET /` - Server welcome page
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/test-db` - Test database connection

## Database

- **Type:** SQLite
- **File:** `./database.db`
- **Tables:**
  - `users` (id, name, email, created_at)

## Dependencies

- **express** ^5.2.1 - Web server framework
- **sqlite3** ^5.1.7 - SQLite database driver

## Notes

- Server runs on port 3000 by default
- Static files must be placed in the `public/` directory to be served
- Database connection is initialized on server start
