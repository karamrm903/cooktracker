import ffmpegStatic from 'ffmpeg-static';
import { execSync } from 'child_process';

let resolvedPath = null;

/**
 * Resolves the path to the ffmpeg executable.
 * Prioritizes a system-installed ffmpeg if present in PATH,
 * otherwise falls back cleanly to the project-level ffmpeg-static binary.
 */
export function getFfmpegPath() {
  if (resolvedPath) return resolvedPath;

  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    resolvedPath = 'ffmpeg';
    return resolvedPath;
  } catch {
    if (ffmpegStatic) {
      resolvedPath = ffmpegStatic;
      return resolvedPath;
    }
    return 'ffmpeg';
  }
}
