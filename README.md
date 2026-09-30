# Nutrily (Cooking Tracker)

Nutrily is a comprehensive full-stack application designed to help users track their meals, monitor caloric intake, and discover recipes using an AI-powered pipeline.

## Table of Contents
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup & Installation](#detailed-setup--installation)
  - [1. Environment & Pre-Flight Check](#1-environment--pre-flight-check)
  - [2. Supabase (Database & Auth)](#2-supabase-database--auth)
  - [3. Backend Server](#3-backend-server)
  - [4. Mobile Application](#4-mobile-application)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
  - [Supabase](#supabase-deployment)
  - [Backend Server](#backend-server-deployment)
  - [Mobile App (Android / iOS)](#mobile-app-android--ios)

---

## Architecture

The project is structured into three main directories, separating the frontend application, backend services, and database configuration:

- [**`app/`**](./app): The mobile frontend built with React Native and Expo (SDK 54). Features include offline-first caching, RevenueCat for in-app purchases, Google Sign-In, and Supabase integration.
- [**`server/`**](./server): A Node.js and Express.js backend dedicated to computationally heavy media processing and AI pipelines. It handles video downloading/processing via native `yt-dlp` and `ffmpeg`, OCR via Google Cloud Vision, audio transcription via Groq Whisper, and recipe intelligence via Anthropic Claude.
- [**`supabase/`**](./supabase): Database schema migrations (PostgreSQL), RLS policies, custom functions, and storage configurations.

---

## Prerequisites

To run this project locally without Docker, ensure you have:
- **Node.js** (v20+ recommended)
- **yt-dlp** (for video downloading):
  ```bash
  brew install yt-dlp
  ```
- *Note: `ffmpeg` is handled automatically at project level via `ffmpeg-static`!*
- *Note: Supabase CLI is handled automatically at project level via `npx supabase`!*
- **Android Studio / Xcode** (For building and running the mobile app natively on emulators/simulators)

---

## Quick Start

From the root directory, you can orchestrate both projects:

```bash
# 1. Verify your environment and required CLI tools
npm run verify:env

# 2. Install all dependencies across server and app
npm run install:all

# 3. In Terminal 1: Run the backend server with auto-reload
npm run dev:server

# 4. In Terminal 2: Run the Expo mobile app
npm run dev:app
```

---

## Detailed Setup & Installation

### 1. Environment & Pre-Flight Check

Copy the environment templates in both `server/` and `app/`:

```bash
cp server/.env.example server/.env
cp app/.env.example app/.env
```

Run the built-in diagnostic tool to see which variables are configured:
```bash
npm run verify:env
```

### 2. Supabase (Database & Auth)

We use Supabase for PostgreSQL database, authentication, and file storage.

1. Create a project at [supabase.com](https://supabase.com).
2. Retrieve your **Project URL**, **anon key**, and **service_role key** from **Project Settings → API**.
3. Link your local repository to your remote project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
4. Push migrations to your remote database:
   ```bash
   supabase db push
   ```
   *(Alternatively: you can run the SQL files in `supabase/migrations/` directly in the Supabase Dashboard SQL Editor).*

### 3. Backend Server

The Express.js server runs natively on Node.js and executes `ffmpeg` and `yt-dlp` directly on your host machine.

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Ensure your `server/.env` is configured:
   ```env
   PORT=3001
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   GROQ_API_KEY=your-groq-api-key
   GOOGLE_VISION_API_KEY=your-google-vision-api-key
   PEXELS_API_KEY=your-pexels-api-key
   REVENUECAT_WEBHOOK_SECRET=your-secret
   ```
3. Start the development server (with file watching):
   ```bash
   npm run dev
   ```
4. Verify server health: visit `http://localhost:3001/health` (should return `{"ok": true}`).

### 4. Mobile Application

The React Native application is built using Expo (SDK 54).

1. Navigate to the app directory:
   ```bash
   cd app
   ```
2. Ensure your `app/.env` is configured:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXPO_PUBLIC_API_URL=http://localhost:3001
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_key
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your_key
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. Press `i` to open in the iOS simulator or `a` for the Android emulator.

---

## Development Workflow

- **Root Convenience**:
  - `npm run dev:server` boots the backend with auto-reload.
  - `npm run dev:app` boots the Expo Metro bundler.
  - `npm run typecheck:app` verifies TypeScript safety across the mobile codebase.
- **Database Schema**: Make changes by generating a new migration file via `supabase migration new <name>`. Apply changes with `supabase db push`.
- **Testing Server Logic**: The server contains a `scripts/` directory with test scripts (e.g. `seed-recipes.js`, `poc-upload.js`, `verify-env.js`).

---

## Deployment

### Supabase Deployment

Push migrations to your production Supabase project:
```bash
supabase link --project-ref your-production-project-ref
supabase db push
```

### Backend Server Deployment

The backend server is standard Node.js (ES modules). You can deploy it directly to services such as Render, Railway, AWS EC2, or DigitalOcean Droplets. Ensure that the host environment has `ffmpeg` and `yt-dlp` installed in its `$PATH`.

### Mobile App (Android / iOS)

We use Expo for local builds or EAS (Expo Application Services) for cloud builds.

**Android Build:**
1. Configure keystore in `app/android/gradle.properties`.
2. Build local release APK:
   ```bash
   cd app/android
   ./gradlew assembleRelease
   ```
   *Or with EAS:*
   ```bash
   eas build --platform android --profile production
   ```

**iOS Build:**
1. Open `app/ios/Nutrily.xcworkspace` in Xcode.
2. Select your signing team and provisioning profile.
3. Build or archive to TestFlight / App Store.
   *Or with EAS:*
   ```bash
   eas build --platform ios --profile production
   ```
