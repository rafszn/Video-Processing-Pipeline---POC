# Video Processing Pipeline POC

A microservices-based video processing pipeline built to demonstrate asynchronous video processing with RabbitMQ, FFmpeg, MongoDB, and Cloudflare R2.

## Overview

Videos are uploaded directly to object storage, then processed asynchronously into multiple quality variants such as 1440p, 1080p, 720p, 480p, and 360p. RabbitMQ handles communication between processing stages, while the Outbox and Inbox patterns provide reliable event publishing and idempotent message processing.

## Stack

- Node.js / TypeScript
- Express
- RabbitMQ
- MongoDB / Mongoose
- FFmpeg
- Cloudflare R2

## Project Structure

The Media Service contains both the HTTP API and the video-processing worker, with separate entrypoints for each process.

> This project is a proof of concept for exploring microservices and distributed processing patterns and will evolve as development continues.

## Running the Project

The project is designed to run entirely through Docker Compose.

### Prerequisites

Make sure you have the following installed:

- Docker
- Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/rafszn/Video-Processing-Pipeline---POC.git
cd Video-Processing-Pipeline---POC
```

### 2. Create the environment file

An `.env.example` file is included in the repository with all required environment variables.

Create your local `.env` file from it:

```bash
cp .env.example .env
```

Then open `.env` and provide the required values.

The `.env` file should be located in the project root, alongside `docker-compose.yml`:

```text
Video-Processing-Pipeline---POC/
├── .env
├── .env.example
├── docker-compose.yml
└── ...
```

### 3. Start the application

Build and start all services with Docker Compose:

```bash
docker compose up --build
```

To run the services in detached mode:

```bash
docker compose up --build -d
```

Docker Compose will start the required services and their dependencies using the configuration defined in `docker-compose.yml`.

### 4. Stop the application

To stop the running containers:

```bash
docker compose down
```

To stop the containers and remove their associated volumes:

```bash
docker compose down -v
```

## Repository

[GitHub Repository](https://github.com/rafszn/Video-Processing-Pipeline---POC.git)
