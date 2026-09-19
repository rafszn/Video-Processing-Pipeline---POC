# Video Processing Pipeline POC

A microservices-based video processing pipeline built to demonstrate asynchronous video processing with RabbitMQ, FFmpeg, MongoDB, and Cloudflare R2.

## Overview

Videos are uploaded directly to object storage, then processed asynchronously into multiple quality variants such as 1440p, 1080p, 720p, 480p, and 360p. RabbitMQ handles communication between processing stages, while the Outbox and Inbox patterns provide reliable event publishing and idempotent message processing.

## Stack

* Node.js / TypeScript
* Express
* RabbitMQ
* MongoDB / Mongoose
* FFmpeg
* Cloudflare R2

## Project Structure

The Media Service contains both the HTTP API and the video-processing worker, with separate entrypoints for each process.

> This project is a proof of concept for exploring microservices and distributed processing patterns and will evolve as development continues.
