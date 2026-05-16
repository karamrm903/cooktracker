import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

const FRAME_EVERY_SECONDS = 5;
const MAX_FRAMES = 12;
const SCALE_WIDTH = 640;

export async function extractFrameFiles(url, tmpDir, {
  everySeconds = FRAME_EVERY_SECONDS,
  maxFrames = MAX_FRAMES,
  width = SCALE_WIDTH,
} = {}) {
  await execFileAsync('yt-dlp', [
    '--force-ipv4', '--no-playlist', '--socket-timeout', '60',
    '-f', 'best', '-o', path.join(tmpDir, 'video.mp4'), url,
  ], { timeout: 180000 });

  const videoPath = path.join(tmpDir, 'video.mp4');
  const framePattern = path.join(tmpDir, 'frame%03d.jpg');

  await execFileAsync('ffmpeg', [
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
