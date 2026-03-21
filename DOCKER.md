# Docker Setup & Running Guide

## Prerequisites
- Docker installed on your system
- Docker Compose installed

## Quick Start

### 1. Ensure .env is Configured
Make sure your `.env` file has all required variables:
```
DATABASE_URL=mongodb://db:27017/letschat
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

### 2. Build and Run
```bash
# Build and start all services
docker-compose up --build

# For detached mode (run in background)
docker-compose up -d --build
```

### 3. Check Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f web      # Next.js app logs
docker-compose logs -f db       # MongoDB logs
```

### 4. Database Setup (Automatic)
Migrations run automatically when the container starts. If you need to manually run them:
```bash
docker-compose exec web npx prisma db push
```

### 5. Stop Services
```bash
# Stop all services gracefully
docker-compose down

# Stop and remove volumes (WARNING: loses data)
docker-compose down -v
```

## Important Notes
- All environment variables are loaded from `.env` file
- MongoDB uses a named volume `mongo_data` for persistence
- The app waits for MongoDB to be healthy before starting
- Port 3000 is exposed for the web app
- Port 27017 is exposed for MongoDB (remove in production)

## Troubleshooting

### Issue: `npm error ERESOLVE could not resolve`
- `@emoji-mart/react@1.1.1` doesn't support React 19
- Solution: Using `--legacy-peer-deps` flag in Dockerfile (already configured)
- The package works fine despite the peer dependency mismatch

### Issue: `mongo:7.0-alpine: not found`
- The Alpine variant of MongoDB 7.0 doesn't exist on Docker Hub
- Solution: Using `mongo:7.0` (standard image) instead

### Issue: Port already in use
```bash
# Change port in docker-compose.yml:
# Change "3000:3000" to "8000:3000" to use port 8000
```

### Issue: MongoDB connection refused
- Wait 10-15 seconds for MongoDB to initialize
- Check container health: `docker-compose ps`

## Production Deployment
Before deploying to production:
1. Set `NEXTAUTH_SECRET` to a secure random string
2. Update `NEXTAUTH_URL` to your production domain
3. Remove MongoDB port exposure from docker-compose.yml
4. Use environment-specific .env files
5. Set `restart: always` for critical services
6. Use managed database service instead of self-hosted MongoDB
