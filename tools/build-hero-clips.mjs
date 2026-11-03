// Usage: FFMPEG=<path to ffmpeg.exe> node tools/build-hero-clips.mjs
// Cuts short, silent, web-ready loops from the Almanaques videos for the hero scenes:
//   assets/video/hero-almanaques-N.mp4 (480px wide, H.264, no audio, no metadata) + .webp poster
// Originals in Almanaques/ are never modified. Edit CLIPS to change which part of each video is used.
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const OUT = "assets/video";
const SECONDS = 8;

const CLIPS = [
  { file: "Almanaques/WhatsApp Video 2026-10-31 at 1.20.19 PM.mp4", start: 0 },  // store: new collection
  { file: "Almanaques/WhatsApp Video 2026-11-03 at 7.38.19 PM.mp4", start: 12 }, // models with "aquí publicidad"
  { file: "Almanaques/WhatsApp Video 2026-10-31 at 1.18.59 PM.mp4", start: 8 },  // "¡Separa ya! tus almanaques 2027"
];

const ff = args => execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args]);
mkdirSync(OUT, { recursive: true });

CLIPS.forEach(({ file, start }, i) => {
  const base = `${OUT}/hero-almanaques-${i + 1}`;
  ff(["-ss", String(start), "-t", String(SECONDS), "-i", file, "-map_metadata", "-1", "-an",
    "-vf", "scale=480:-2,fps=24", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
    "-profile:v", "main", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${base}.mp4`]);
  ff(["-i", `${base}.mp4`, "-frames:v", "1", "-vf", "scale=360:-2", "-c:v", "libwebp", "-quality", "72", `${base}.webp`]);
  console.log(`${base}.mp4 ${(statSync(`${base}.mp4`).size / 1024).toFixed(0)} KB, poster ${(statSync(`${base}.webp`).size / 1024).toFixed(0)} KB`);
});
