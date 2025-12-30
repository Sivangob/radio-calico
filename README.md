# Radio Calico

A web-based HLS radio streaming application with an Express.js backend and SQLite database integration.

## Features

- **HLS Lossless Streaming** - High-quality audio streaming using HLS (HTTP Live Streaming)
- **Modern Web Player** - Browser-based player with hls.js for broad compatibility
- **Playback Controls** - Play/Pause, volume adjustment, and live status indicator
- **Error Handling** - Automatic recovery and robust error handling
- **REST API** - Express.js backend with SQLite database
- **User Management** - Basic user CRUD operations via API

## Live Stream

Stream URL: `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Sivangob/radio-calico.git
cd radio-calico
```

2. Install dependencies:
```bash
npm install
```

3. The SQLite database will be automatically initialized when you start the server.

## Usage

### Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start on **http://localhost:3000**

### Access the Radio Player

Open your browser and navigate to:
```
http://localhost:3000/index.html
```

## Project Structure

```
radiocalico/
├── public/                      # Static files served by Express
│   ├── index.html              # Main HTML page
│   ├── player.js               # Radio player logic and controls
│   ├── styles.css              # Player styling
│   └── RadioCalicoLogoTM.png   # Radio Calico logo
├── server.js                    # Express server with SQLite integration
├── database.db                  # SQLite database
├── package.json                 # Node.js dependencies and scripts
└── node_modules/                # Dependencies
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server welcome page |
| GET | `/api/users` | Get all users |
| POST | `/api/users` | Create a new user |
| GET | `/api/test-db` | Test database connection |

### Example API Usage

**Get all users:**
```bash
curl http://localhost:3000/api/users
```

**Create a new user:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'
```

## Technologies Used

- **Frontend:**
  - HTML5
  - CSS3
  - JavaScript
  - [hls.js](https://github.com/video-dev/hls.js/) - HLS player library

- **Backend:**
  - [Express.js](https://expressjs.com/) v5.2.1 - Web server framework
  - [SQLite3](https://www.npmjs.com/package/sqlite3) v5.1.7 - Database

## Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| name | TEXT | User's name |
| email | TEXT | User's email address |
| created_at | DATETIME | Timestamp of creation |

## Development

The server serves static files from the `public/` directory. The player consists of:

- **index.html** - Main HTML structure
- **styles.css** - Player styling and layout
- **player.js** - HLS player initialization and control logic

The SQLite database (`database.db`) is created automatically on first run.

## License

This project is open source and available under the MIT License.

## Contributing

Contributions, issues, and feature requests are welcome!
