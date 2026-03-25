# Official MongoDB 7 image
FROM mongo:7

# Add metadata
LABEL maintainer="music-top10-app" \
      description="MongoDB database for Top 10 Electronic Tracks Dashboard" \
      version="1.0.0"

# Create data directory (MongoDB default)
# Note: /data/db is already the default in mongo image, but being explicit
VOLUME ["/data/db"]

# No authentication needed for personal local use
# MongoDB will be accessible only within the Docker network

# Expose MongoDB default port (internal to Docker network only)
EXPOSE 27017

# Use the default mongo entrypoint
# The base mongo image handles everything we need
