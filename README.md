# Top 10 Electronic Tracks Dashboard

A personal, containerized full-stack web application that fetches, enriches, caches, and streams the **US Top 10 Electronic songs** from Apple's public RSS and iTunes Lookup APIs. Built for single-user personal use with a clean dashboard interface and inline audio player.

![Music Dashboard](https://img.shields.io/badge/Music-Dashboard-00d4ff?style=for-the-badge&logo=music&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47a248?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ed?style=for-the-badge&logo=docker&logoColor=white)

## Features

- **Real-time Top 10** - Displays current Apple US Top 10 Electronic tracks
- **Audio Previews** - 30-second track previews with built-in player
- **Smart Caching** - MongoDB caches results for 1 hour to reduce API calls
- **Auto-refresh** - Hourly automatic updates + manual refresh button
- **Beautiful UI** - Clean dark theme with ShadCN UI components
- **Responsive** - Works on desktop, tablet, and mobile
- **Containerized** - 3 independent Docker containers
- **Fast Setup** - One command deployment

## Architecture

```
Frontend (Vite + React)     Backend (Express + Node.js)     Database
┌─────────────────────┐    ┌───────────────────────────┐    ┌─────────────┐
│                     │    │                           │    │             │
│  localhost:5173     │◄───┤  localhost:5000           │◄───┤  MongoDB    │
│                     │    │                           │    │  (internal) │
│  • Track List       │    │  • Apple RSS Fetcher     │    │             │
│  • Audio Player     │    │  • iTunes Lookup         │    │  • TTL Cache│
│  • ShadCN UI        │    │  • MongoDB Cache         │    │  • Track DB │
│                     │    │  • Cron Scheduler        │    │             │
└─────────────────────┘    └───────────────────────────┘    └─────────────┘
```

### Container Communication

- **Frontend** (`:5173`) → calls → **Backend** (`:5000`) → queries → **MongoDB** (internal)
- All containers communicate via shared Docker network `music-net`
- MongoDB is not exposed to host (security best practice)

## Quick Start

### Prerequisites

- Docker (v20+)
- Make (optional, for convenience commands)
- 8GB RAM minimum
- Internet connection (to fetch Apple Music data)

### 1. Clone & Setup

```bash
git clone <your-repo>
cd top10
```

### 2. Run with Make (Recommended)

```bash
# Create network, build images, and start containers
make network && make build && make up
```

### 3. Or Run with Docker Commands

```bash
# Create network
docker network create music-net

# Build images
docker build -t music-top10/mongo ./mongo
docker build -t music-top10/backend ./server
docker build -t music-top10/frontend ./client

# Start containers
docker run -d --name music-top10-mongo --network music-net --hostname mongo --volume mongo-data:/data/db music-top10/mongo
docker run -d --name music-top10-backend --network music-net -p 5000:5000 --env MONGO_URI=mongodb://mongo:27017/music music-top10/backend
docker run -d --name music-top10-frontend --network music-net -p 5173:5173 --env VITE_API_BASE_URL=http://localhost:5000 music-top10/frontend
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Available Make Commands

| Command                    | Description                                  |
| -------------------------- | -------------------------------------------- |
| `make help`                | Show all available commands                  |
| `make network`             | Create shared Docker network                 |
| `make build`               | Build all 3 container images                 |
| `make up`                  | Start all containers in correct order        |
| `make down`                | Stop and remove all containers               |
| `make clean`               | Full cleanup (containers + volumes + images) |
| `make logs`                | View logs from all containers                |
| `make status`              | Show container/network/volume status         |
| `make health`              | Run health checks on all services            |
| `make rebuild svc=backend` | Rebuild a specific service                   |

### Development Commands

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `make shell-backend`  | Access backend container shell  |
| `make shell-frontend` | Access frontend container shell |
| `make shell-mongo`    | Access MongoDB shell            |

## Usage

### Basic Navigation

1. **View Tracks**: The top 10 electronic tracks load automatically
2. **Play Music**: Click play button on any track for 30-second preview
3. **Player Controls**: Use bottom player for play/pause/skip controls
4. **Manual Refresh**: Click refresh button to fetch latest data

### API Endpoints

| Endpoint          | Method | Description                     |
| ----------------- | ------ | ------------------------------- |
| `/api/tracks`     | GET    | Get all tracks (cached or live) |
| `/api/tracks/:id` | GET    | Get single track by ID          |
| `/api/refresh`    | POST   | Force refresh from Apple APIs   |
| `/api/health`     | GET    | Service health check            |

### Cache Behavior

- **Fresh Data**: Served if cached data is < 1 hour old
- **Stale Data**: Triggers fresh API fetch from Apple
- **Auto-refresh**: Every hour via cron job
- **Manual Refresh**: Bypasses cache entirely

## Tech Stack

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **ShadCN UI** - Component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend

- **Node.js 22** - Runtime
- **Express 4** - Web framework
- **TypeScript** - Type safety
- **Mongoose 8** - MongoDB ODM
- **Axios** - HTTP client
- **Node-cron** - Job scheduler

### Database

- **MongoDB 7** - Document database
- **TTL Caching** - 1-hour cache expiry

### Infrastructure

- **Docker** - Containerization
- **Alpine Linux** - Lightweight base images
- **Make** - Build automation

## Project Structure

```
top10/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── lib/           # Utilities & API
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── routes.ts      # API endpoints
│   │   ├── track.ts       # Mongoose model
│   │   ├── apple.ts       # Apple API integration
│   │   └── cache.ts       # Cache logic
│   ├── Dockerfile
│   └── package.json
├── mongo/
│   └── Dockerfile         # MongoDB container
├── Makefile              # Container management
├── README.md
└── PRD.md               # Product requirements
```

## Configuration

### Environment Variables

| Variable            | Container | Default                       | Description         |
| ------------------- | --------- | ----------------------------- | ------------------- |
| `MONGO_URI`         | backend   | `mongodb://mongo:27017/music` | MongoDB connection  |
| `PORT`              | backend   | `5000`                        | Backend server port |
| `CACHE_TTL_SECONDS` | backend   | `3600`                        | Cache TTL (1 hour)  |
| `VITE_API_BASE_URL` | frontend  | `http://localhost:5000`       | API base URL        |

### Ports

- **5173** - Frontend (Vite dev server)
- **5000** - Backend (Express API)
- **27017** - MongoDB (internal only)

## Troubleshooting

### Container Issues

```bash
# Check container status
make status

# View logs
make logs

# Health checks
make health

# Full restart
make down && make up
```

### Common Problems

**Frontend not loading:**

- Check if backend is running: `curl http://localhost:5000/health`
- Verify environment variables in frontend container

**Backend connection errors:**

- Ensure MongoDB container is running first
- Check network connectivity: `docker network ls`
- Verify MongoDB is accessible at `mongo:27017`

**API rate limiting:**

- Apple APIs may have rate limits
- Cache reduces API calls (1 hour TTL)
- Manual refresh triggers immediate API call

**Audio not playing:**

- Check browser console for CORS errors
- Verify preview URLs are valid
- Some tracks may not have preview URLs

## Monitoring

### Health Checks

- **Frontend**: HTTP 200 on port 5173
- **Backend**: `/health` endpoint returns DB status
- **MongoDB**: Connection state monitoring

### Logs

```bash
# All container logs
make logs

# Individual container logs
docker logs music-top10-frontend
docker logs music-top10-backend
docker logs music-top10-mongo
```

## Security Notes

- **No Authentication**: Personal single-user application
- **MongoDB**: No auth required (internal network only)
- **CORS**: Configured for localhost development
- **Ports**: Only frontend (5173) and backend (5000) exposed

## Performance

### Caching Strategy

- **1-hour TTL** on track data
- **Aggressive caching** to minimize Apple API calls
- **Background refresh** every hour
- **Fallback** to stale data if APIs fail

### Resource Usage

- **Frontend**: ~100MB RAM (Vite dev server)
- **Backend**: ~150MB RAM (Node.js + Express)
- **MongoDB**: ~200MB RAM (with data)
- **Total**: ~450MB RAM, minimal CPU

## Updates & Maintenance

### Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and restart
make clean && make network && make build && make up
```

### Data Backup

```bash
# Backup MongoDB data
docker exec music-top10-mongo mongodump --db music --out /backup

# Restore MongoDB data
docker exec music-top10-mongo mongorestore /backup
```

## Future Enhancements

- [ ] Volume controls in player
- [ ] Playlist creation and favorites
- [ ] Multiple genres support
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Progressive Web App (PWA)
- [ ] Docker Compose support
- [ ] Kubernetes deployment
- [ ] CI/CD pipeline

## License

This project is for personal use. Apple Music data is used in accordance with Apple's terms of service.

## Contributing

This is a personal project, but suggestions and improvements are welcome via issues and pull requests.

---

**Built for music lovers who want to discover the latest electronic tracks**
