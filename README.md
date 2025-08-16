# Video Transcoding API

A TypeScript-based REST API for video transcoding, designed to test CPU-intensive workloads in cloud environments. The service allows users to upload videos and request transcoding to different qualities (1080p, 720p, etc.), making it ideal for benchmarking cloud compute instances under realistic media processing loads.

## Why?

Built to explore:
* CPU-intensive workloads in cloud environments
* REST API design with Hono

And.. my university assignment requires a test API

## Tech Stack

* **Runtime**: Node.js + TypeScript
* **API Framework**: Hono (lightweight, fast)
* **Caching**: Redis
* **Database**: PostgreSQL (metadata, job tracking)
* **Video Processing**: ffmpeg
* **Authentication**: JWT
* **Deployment**: Docker + Docker Compose

These are subject to changes for improvements.

## Core Features

- Video upload and metadata management
- Multi-quality transcoding (1080p → 720p/480p/etc.)
- Job status tracking and logs
- Role-based access (admin/user)
- CPU load testing utilities

## Quick Start

1. Environment setup:
```bash
# Create .env with your favourite passwords
PORT=3000
DATABASE_URL=postgres://superman:secret_to_your_heart@localhost:5432/video_app_db
JWT_SECRET=dev_only_change_in_prod
UPLOAD_DIR=./uploads
```

2. Start services:
```bash
# Start Postgres
docker compose up

# Run API (dev mode)
npm install
npm run dev
```

3. Default users:
- Admin: `admin@superman.com` / `admin123`
- User: `user@superman.com` / `user123`

## License

Copyright (c) 2024. All rights reserved.    

⚠️ This code is not ready. Please do not copy, distribute or use this code until December 2024.