# Music Top 10 Electronic Tracks Dashboard
# Makefile for managing Docker containers

# Configuration
NETWORK_NAME = music-net
VOLUME_NAME = mongo-data
PROJECT_NAME = music-top10

# Container names
MONGO_CONTAINER = $(PROJECT_NAME)-mongo
BACKEND_CONTAINER = $(PROJECT_NAME)-backend  
FRONTEND_CONTAINER = $(PROJECT_NAME)-frontend

# Image names
MONGO_IMAGE = $(PROJECT_NAME)/mongo
BACKEND_IMAGE = $(PROJECT_NAME)/backend
FRONTEND_IMAGE = $(PROJECT_NAME)/frontend

# Default target
.PHONY: help
help:
	@echo "Music Top 10 Electronic Tracks Dashboard - Docker Management"
	@echo ""
	@echo "Available targets:"
	@echo "  network     Create the shared Docker network (idempotent)"
	@echo "  build       Build all 3 images"
	@echo "  up          Start containers in correct order: mongo → backend → frontend"
	@echo "  down        Stop and remove all containers"
	@echo "  clean       Destroy containers + volumes (full reset)"
	@echo "  logs        Tail logs from all 3 containers"
	@echo "  rebuild     Rebuild a single service: make rebuild svc=backend"
	@echo ""
	@echo "Usage:"
	@echo "  make network && make build && make up"
	@echo ""
	@echo "Application will be available at: http://localhost:5173"

# Create the shared Docker network (idempotent)
.PHONY: network
network:
	@echo " Creating Docker network: $(NETWORK_NAME)"
	@docker network create $(NETWORK_NAME) 2>/dev/null || echo "  Network $(NETWORK_NAME) already exists"

# Build all 3 images
.PHONY: build
build: build-mongo build-backend build-frontend

.PHONY: build-mongo
build-mongo:
	@echo "  Building MongoDB image..."
	@docker build -t $(MONGO_IMAGE) ./mongo

.PHONY: build-backend
build-backend:
	@echo "Building backend image..."
	@docker build -t $(BACKEND_IMAGE) ./server

.PHONY: build-frontend
build-frontend:
	@echo "Building frontend image..."
	@docker build -t $(FRONTEND_IMAGE) ./client

# Start containers in correct order: mongo → backend → frontend
.PHONY: up
up: network
	@echo "Starting Music Top 10 Dashboard..."
	@echo " Removing existing project containers (if any)..."
	@docker rm -f $(FRONTEND_CONTAINER) $(BACKEND_CONTAINER) $(MONGO_CONTAINER) 2>/dev/null || true
	
	@echo "Starting MongoDB container..."
	@docker run -d \
		--name $(MONGO_CONTAINER) \
		--network $(NETWORK_NAME) \
		--hostname mongo \
		--volume $(VOLUME_NAME):/data/db \
		--restart unless-stopped \
		$(MONGO_IMAGE)
	
	@echo " Waiting for MongoDB to be ready..."
	@sleep 5
	
	@echo "Starting backend container..."
	@docker run -d \
		--name $(BACKEND_CONTAINER) \
		--network $(NETWORK_NAME) \
		--publish 5000:5000 \
		--env MONGO_URI=mongodb://mongo:27017/music \
		--env PORT=5000 \
		--env CACHE_TTL_SECONDS=3600 \
		--restart unless-stopped \
		$(BACKEND_IMAGE)
	
	@echo " Waiting for backend to be ready..."
	@sleep 3
	
	@echo " Starting frontend container..."
	@docker run -d \
		--name $(FRONTEND_CONTAINER) \
		--network $(NETWORK_NAME) \
		--publish 5173:5173 \
		--env VITE_API_BASE_URL=http://localhost:5000 \
		--restart unless-stopped \
		$(FRONTEND_IMAGE)
	
	@echo ""
	@echo " All containers started successfully!"
	@echo " Application available at: http://localhost:5173"
	@echo "API available at: http://localhost:5000"
	@echo ""
	@echo "Use 'make logs' to view container logs"
	@echo "Use 'make down' to stop all containers"

# Stop and remove all containers
.PHONY: down
down:
	@echo " Stopping all containers..."
	@docker stop $(FRONTEND_CONTAINER) $(BACKEND_CONTAINER) $(MONGO_CONTAINER) 2>/dev/null || true
	@docker rm $(FRONTEND_CONTAINER) $(BACKEND_CONTAINER) $(MONGO_CONTAINER) 2>/dev/null || true
	@echo " All containers stopped and removed"

# Destroy containers + volumes (full reset)
.PHONY: clean
clean: down
	@echo " Cleaning up everything..."
	@echo "Removing Docker volume: $(VOLUME_NAME)"
	@docker volume rm $(VOLUME_NAME) 2>/dev/null || true
	@echo "Removing Docker images..."
	@docker rmi $(FRONTEND_IMAGE) $(BACKEND_IMAGE) $(MONGO_IMAGE) 2>/dev/null || true
	@echo "Removing Docker network: $(NETWORK_NAME)"
	@docker network rm $(NETWORK_NAME) 2>/dev/null || true
	@echo " Full cleanup completed"

# Tail logs from all 3 containers
.PHONY: logs
logs:
	@echo " Showing logs from all containers (Ctrl+C to exit)..."
	@docker logs -f $(MONGO_CONTAINER) & \
	docker logs -f $(BACKEND_CONTAINER) & \
	docker logs -f $(FRONTEND_CONTAINER) & \
	wait

# Rebuild a single service: make rebuild svc=backend
.PHONY: rebuild
rebuild:
	@if [ -z "$(svc)" ]; then \
		echo "Error: Please specify a service to rebuild"; \
		echo "Usage: make rebuild svc=<mongo|backend|frontend>"; \
		exit 1; \
	fi
	@echo "Rebuilding $(svc) service..."
	@docker stop $(PROJECT_NAME)-$(svc) 2>/dev/null || true
	@docker rm $(PROJECT_NAME)-$(svc) 2>/dev/null || true
	@make build-$(svc)
	@echo " Restart the containers with: make up"

# Individual container management
.PHONY: start-mongo start-backend start-frontend
start-mongo:
	@docker start $(MONGO_CONTAINER) || echo "Container not found. Run 'make up' first."

start-backend:
	@docker start $(BACKEND_CONTAINER) || echo "Container not found. Run 'make up' first."

start-frontend:
	@docker start $(FRONTEND_CONTAINER) || echo "Container not found. Run 'make up' first."

.PHONY: stop-mongo stop-backend stop-frontend
stop-mongo:
	@docker stop $(MONGO_CONTAINER) || echo "Container not running."

stop-backend:
	@docker stop $(BACKEND_CONTAINER) || echo "Container not running."

stop-frontend:
	@docker stop $(FRONTEND_CONTAINER) || echo "Container not running."

# Status check
.PHONY: status
status:
	@echo "Container Status:"
	@echo ""
	@docker ps --filter "name=$(PROJECT_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers found"
	@echo ""
	@docker network ls --filter "name=$(NETWORK_NAME)" --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" || echo "No network found"
	@echo ""
	@docker volume ls --filter "name=$(VOLUME_NAME)" --format "table {{.Name}}\t{{.Driver}}" || echo "No volume found"

# Development helpers
.PHONY: shell-mongo shell-backend shell-frontend
shell-mongo:
	@docker exec -it $(MONGO_CONTAINER) mongosh music || echo "Container not running. Start with 'make up'"

shell-backend:
	@docker exec -it $(BACKEND_CONTAINER) /bin/sh || echo "Container not running. Start with 'make up'"

shell-frontend:
	@docker exec -it $(FRONTEND_CONTAINER) /bin/sh || echo "Container not running. Start with 'make up'"

# Health checks
.PHONY: health
health:
	@echo "Health Check:"
	@echo ""
	@echo "MongoDB:"
	@docker exec $(MONGO_CONTAINER) mongosh --eval "db.adminCommand('ismaster')" music 2>/dev/null || echo "MongoDB not healthy"
	@echo ""
	@echo "Backend:"
	@curl -s http://localhost:5000/health | jq . 2>/dev/null || echo "Backend not healthy"
	@echo ""
	@echo "Frontend:"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ | grep -q "200" && echo " Frontend healthy" || echo "Frontend not healthy"