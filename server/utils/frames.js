import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

const FRAME_EVERY_SECONDS = 5;
const MAX_FRAMES = 12;
const SCALE_WIDTH = 640;

const CACHE_DIR = path.join(os.tmpdir(), 'cooktracker-video-cache');
const activeDownloads = new Map(); // url -> Promise

export function getCacheFilePath(url) {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(CACHE_DIR, `${hash}.mp4`);
}

export async function downloadVideoToCache(url, cachePath) {
  if (activeDownloads.has(url)) {
    console.log(`[cache] Download already in progress for ${url}, waiting...`);
    await activeDownloads.get(url);
    return;
  }

  const downloadPromise = (async () => {
    console.log(`[cache] Downloading video to cache: ${url} -> ${cachePath}`);
    await execFileAsync('yt-dlp', [
      '--force-ipv4', '--no-playlist', '--socket-timeout', '60',
      '--no-check-certificates',
      '-f', 'worst/worstvideo+worstaudio',
      '-o', cachePath, url,
    ], { timeout: 180000 });
  })();

  activeDownloads.set(url, downloadPromise);
  try {
    await downloadPromise;
  } finally {
    activeDownloads.delete(url);
  }
}

export function cleanupCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes cache lifetime
    
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`[cache] Deleted expired cached file: ${file}`);
      }
    }
  } catch (err) {
    console.error('[cache] Cleanup failed:', err.message);
  }
}

export async function extractFrameFiles(url, tmpDir, {
  everySeconds = FRAME_EVERY_SECONDS,
  maxFrames = MAX_FRAMES,
  width = SCALE_WIDTH,
} = {}) {
  const videoPath = getCacheFilePath(url);

  if (!fs.existsSync(videoPath)) {
    await downloadVideoToCache(url, videoPath);
  } else {
    console.log(`[cache] Cache HIT: using cached video file ${videoPath}`);
  }

  const framePattern = path.join(tmpDir, 'frame%03d.jpg');

  await execFileAsync('ffmpeg', [
    '-y',
    '-i', videoPath,
    '-vf', `fps=1/${everySeconds},scale=${width}:-2`,
    '-frames:v', String(maxFrames),
    '-q:v', '3',
    framePattern,
  ], { timeout: 60_000 });

  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort();
  if (files.length === 0) throw new Error('ffmpeg produced no frames');
  return files.map(f => path.join(tmpDir, f));
}

export function makeTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function cleanTmpDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
