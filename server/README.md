# Nutrily Backend Server

The Express.js backend for Nutrily, responsible for processing video content, extracting frames/audio, and handling AI pipeline integrations.

## Features

- **Video Processing**: Downloads videos and extracts metadata via native `yt-dlp`.
- **Frame & Audio Extraction**: Samples video frames and audio tracks using native `ffmpeg`.
- **Image Processing**: Optimizes and transforms images using `sharp`.
- **AI Integrations**: 
  - Claude API (`@anthropic-ai`) for recipe extraction and vision parsing.
  - Groq Whisper for audio speech-to-text.
  - Google Cloud Vision for OCR on frames.
- **Supabase Integration**: Interacts directly with the Supabase Postgres database and public storage buckets.

## Tech Stack

- Node.js (ES Modules)
- Express.js
- Supabase JS Client (`@supabase/supabase-js`)
- Sharp
- Native `ffmpeg` and `yt-dlp` CLIs

## Getting Started

### 1. Prerequisites
Ensure `yt-dlp` is installed on your system:
```bash
brew install yt-dlp
```
*(Note: `ffmpeg` is bundled automatically at the project level via `ffmpeg-static`).*

### 2. Environment Variables
Copy the template and fill in your keys:
```bash
cp .env.example .env
```

### 3. Installation & Running
```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload on file changes)
npm run dev

# Run in production mode
npm start
```

### 4. Health Check
Once running, verify at:
`http://localhost:3001/health` (returns `{"ok": true}`)
