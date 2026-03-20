import express from "express";
import cors from "cors";
import ytdlp from "yt-dlp-exec";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/metadata", async (req, res) => {
  try {
    const { url } = req.body;

    const info = await ytdlp(url, {
      dumpSingleJson: true,
      skipDownload: true,
    });

    res.json({
      title: info.title,
      description: info.description,
      uploader: info.uploader,
      duration: info.duration,
      tags: info.tags,
      webpage_url: info.webpage_url,
      fulltitle: info.fulltitle,
    });
  } catch (err) {
    console.error("METADATA ERROR:", err);
    res.status(500).json({ error: "yt-dlp metadata failed" });
  }
});

app.post("/frames", async (req, res) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cooktrack-"));
  const outputTemplate = path.join(tempDir, "video.%(ext)s");
  const framesDir = path.join(tempDir, "frames");
  fs.mkdirSync(framesDir);

  try {
    const { url } = req.body;

    await ytdlp(url, {
      output: outputTemplate,
      format: "mp4/best",
    });

    const downloaded = fs.readdirSync(tempDir).find((f) => f.startsWith("video."));
    if (!downloaded) {
      throw new Error("Downloaded video file not found");
    }

    const videoPath = path.join(tempDir, downloaded);

    execSync(
      `ffmpeg -i "${videoPath}" -vf "fps=1/2" -frames:v 6 "${path.join(framesDir, "frame-%02d.jpg")}"`,
      { stdio: "ignore" }
    );

    const frames = fs
      .readdirSync(framesDir)
      .filter((f) => f.endsWith(".jpg"))
      .sort()
      .map((file) => {
        const abs = path.join(framesDir, file);
        const b64 = fs.readFileSync(abs).toString("base64");
        return {
          filename: file,
          mimeType: "image/jpeg",
          base64: b64,
        };
      });

    res.json({ frames });
  } catch (err) {
    console.error("FRAMES ERROR:", err);
    res.status(500).json({ error: "frame extraction failed" });
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
});

app.listen(3001, () => {
  console.log("Metadata server running on port 3001");
});
