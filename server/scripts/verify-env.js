#!/usr/bin/env node

/**
 * verify-env.js
 * Validates system CLI dependencies and .env files for both server and app.
 * Usage: node server/scripts/verify-env.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function checkCommand(command, name) {
  try {
    const version = execSync(`${command} --version 2>&1`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    console.log(` ${colors.green}✔${colors.reset} ${name.padEnd(12)}: Found (${version.slice(0, 40)})`);
    return true;
  } catch {
    console.log(` ${colors.red}✖${colors.reset} ${name.padEnd(12)}: Not found in PATH`);
    return false;
  }
}

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      vars[key] = val;
    }
  }
  return vars;
}

function checkEnvGroup(title, filePath, examplePath, requiredKeys, optionalKeys = []) {
  logHeader(title);
  if (!fs.existsSync(filePath)) {
    console.log(` ${colors.red}✖${colors.reset} Missing .env file: ${path.relative(rootDir, filePath)}`);
    console.log(`   Run: cp ${path.relative(rootDir, examplePath)} ${path.relative(rootDir, filePath)}`);
    return false;
  }

  console.log(` ${colors.green}✔${colors.reset} Found .env file: ${path.relative(rootDir, filePath)}`);
  const vars = parseEnv(filePath) || {};
  let allGood = true;

  console.log('\n  Required Variables:');
  for (const key of requiredKeys) {
    const val = vars[key];
    const isPlaceholder = !val || val.includes('your-') || val.includes('TODO');
    if (isPlaceholder) {
      console.log(`   ${colors.yellow}⚠${colors.reset} ${key.padEnd(32)}: Unset or placeholder`);
      allGood = false;
    } else {
      console.log(`   ${colors.green}✔${colors.reset} ${key.padEnd(32)}: Configured`);
    }
  }

  if (optionalKeys.length > 0) {
    console.log('\n  Optional / Integration Variables:');
    for (const key of optionalKeys) {
      const val = vars[key];
      const isConfigured = val && !val.includes('your-') && !val.includes('TODO');
      if (isConfigured) {
        console.log(`   ${colors.green}✔${colors.reset} ${key.padEnd(32)}: Configured`);
      } else {
        console.log(`   ${colors.cyan}-${colors.reset} ${key.padEnd(32)}: Not set (optional)`);
      }
    }
  }

  return allGood;
}

// 1. Check System CLIs & Project Binaries
logHeader('CLI Dependencies (Native / Non-Docker)');
const hasSystemFfmpeg = checkCommand('ffmpeg', 'ffmpeg');
let ffmpegAvailable = hasSystemFfmpeg;

if (!hasSystemFfmpeg) {
  // Check if ffmpeg-static is bundled or in package.json
  const serverPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'server/package.json'), 'utf-8'));
  if (serverPkg.dependencies?.['ffmpeg-static']) {
    console.log(` ${colors.green}✔${colors.reset} ${'ffmpeg'.padEnd(12)}: Handled at project level via ffmpeg-static`);
    ffmpegAvailable = true;
  }
}

const hasYtdlp = checkCommand('yt-dlp', 'yt-dlp');
const hasNode = checkCommand('node', 'node');

if (!hasYtdlp) {
  console.log(`\n ${colors.yellow}Action needed:${colors.reset} Install yt-dlp via Homebrew:`);
  console.log(`   brew install yt-dlp`);
}

// 2. Check Server Env
const serverEnvPath = path.join(rootDir, 'server/.env');
const serverExamplePath = path.join(rootDir, 'server/.env.example');
const serverRequired = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
];
const serverOptional = [
  'PORT',
  'GROQ_API_KEY',
  'GOOGLE_VISION_API_KEY',
  'PEXELS_API_KEY',
  'REVENUECAT_WEBHOOK_SECRET',
];
checkEnvGroup('Server Environment (server/.env)', serverEnvPath, serverExamplePath, serverRequired, serverOptional);

// 3. Check App Env
const appEnvPath = path.join(rootDir, 'app/.env');
const appExamplePath = path.join(rootDir, 'app/.env.example');
const appRequired = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];
const appOptional = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
  'EXPO_PUBLIC_YOUTUBE_API_KEY',
];
checkEnvGroup('Mobile App Environment (app/.env)', appEnvPath, appExamplePath, appRequired, appOptional);

console.log(`\n${colors.bold}========================================${colors.reset}\n`);
