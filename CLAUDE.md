# Radio Calico - Project Information

This file contains project-specific information and preferences for development.

## Development Options

Radio Calico can be run in two ways:

### 1. Docker (Recommended)

**Start command:** `docker compose up` or `docker compose up -d`
- **Port:** 3000
- **URL:** http://localhost:3000
- **Database:** Persisted in named volume `radiocalico-db-dev` at `/app/data/database.db`
- **Hot reloading:** Enabled via nodemon
- **Volumes:** Source code mounted for live changes

### 2. Local Node.js

**Start command:** `npm start` or `npm run dev`
- **Port:** 3000
- **URL:** http://localhost:3000
- **Database:** Local file `./database.db`
- **Static files:** Served from `./public` directory

## Project Structure

```
radiocalico/
├── public/                      # Static files served by Express
│   ├── index.html              # HLS Radio Player
│   ├── player.js               # Radio player logic
│   ├── styles.css              # Player styling
│   └── RadioCalicoLogoTM.png   # Radio Calico logo
├── server.js                    # Express server with SQLite integration
├── database.db                  # SQLite database (local development only)
├── Dockerfile                   # Multi-stage Docker build
├── docker-compose.yml           # Development Docker config
├── docker-compose.prod.yml      # Production Docker config
├── .dockerignore                # Docker build exclusions
├── .env.example                 # Environment variables template
├── package.json                 # Node.js dependencies and scripts
├── package-lock.json            # Locked dependency versions (required for Docker)
└── node_modules/                # Dependencies (local only, not in Docker)
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
- `GET /api/client-ip` - Get client IP address
- `GET /api/ratings/:songId` - Get rating counts for a song
- `POST /api/ratings` - Submit or update a rating

## Database

- **Type:** SQLite
- **Local file:** `./database.db`
- **Docker path:** `/app/data/database.db` (in named volume)
- **Tables:**
  - `users` (id, name, email, created_at)
  - `ratings` (id, song_id, artist, title, rating_type, user_id, created_at)

## Dependencies

### Production
- **express** ^5.2.1 - Web server framework
- **sqlite3** ^5.1.7 - SQLite database driver

### Development
- **jest** ^30.2.0 - Testing framework
- **supertest** ^7.1.4 - HTTP assertion library
- **@types/jest** ^30.0.0 - TypeScript definitions for Jest

## Environment Variables

Configuration via environment variables (see `.env.example`):

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - HTTP server port (default: 3000)
- `DB_PATH` - SQLite database file path

## Docker Development

### Quick Commands

```bash
# Start development environment
docker compose up

# Start in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop containers
docker compose down

# Rebuild after dependency changes
docker compose up --build

# Access container shell
docker compose exec radiocalico-dev sh

# Access database
docker compose exec radiocalico-dev sqlite3 /app/data/database.db
```

### Key Features

- **Hot reloading:** nodemon watches for file changes
- **Volume mounting:** Source code synced to container
- **Persistent data:** Database stored in named Docker volume
- **Isolated networking:** Dedicated bridge network for services

### Important Files

- `Dockerfile` - Multi-stage build (base → development/production)
- `docker-compose.yml` - Development configuration
- `.dockerignore` - Excludes node_modules, tests, logs from build context
- `package-lock.json` - Required for `npm ci` in Docker builds

## Testing

Run tests with Jest:

```bash
# Local
npm test
npm run test:watch
npm run test:coverage

# Docker
docker compose exec radiocalico-dev npm test
```

## Notes

- Server runs on port 3000 by default
- Static files must be placed in the `public/` directory to be served
- Database connection is initialized on server start
- For comprehensive Docker documentation, see `README-DOCKER.md`
- When adding npm packages, run `npm install` to update `package-lock.json` (required for Docker)
