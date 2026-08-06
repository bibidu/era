#!/usr/bin/env node
/**
 * 生成纵深 PC 工作台 720p 短预览视频（默认 4s）。
 *
 *   node scripts/generate-motion-preview.mjs
 *   node scripts/generate-motion-preview.mjs --out public/motion/desk-depth-preview.mp4
 *
 * 运动参数可用 --description-file 覆盖（或环境变量）；画面按默认 dolly-in 纵深推进渲染。
 */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const WIDTH = 1280
const HEIGHT = 720
const FPS = 24
const DURATION_SEC = 4

function parseArgs(argv) {
  const out = {
    out: path.join(ROOT, 'public/motion/desk-depth-preview.mp4'),
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out') out.out = path.resolve(ROOT, argv[++i])
    else if (a === '--help' || a === '-h') out.help = true
  }
  return out
}

function sceneHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<style>
  html, body {
    margin: 0;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: #070b12;
    font-family: "SF Pro Text", "PingFang SC", "Noto Sans SC", sans-serif;
  }
  #stage {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    perspective: 900px;
    perspective-origin: 50% 42%;
    overflow: hidden;
    background: radial-gradient(ellipse at 50% 20%, #1a2740 0%, #070b12 70%);
  }
  #world {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    will-change: transform;
  }
  .layer {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
  }
  .sky {
    background:
      radial-gradient(circle at 72% 28%, rgba(120,160,255,0.22), transparent 28%),
      linear-gradient(180deg, #0c1424 0%, #101a2c 55%, #0a1018 100%);
  }
  .window {
    position: absolute;
    left: 8%;
    top: 8%;
    width: 34%;
    height: 42%;
    border-radius: 10px;
    border: 3px solid rgba(180,200,230,0.18);
    background:
      linear-gradient(180deg, rgba(40,70,120,0.55), rgba(10,16,28,0.2)),
      radial-gradient(circle at 70% 30%, rgba(255,220,160,0.35), transparent 24%);
    box-shadow: inset 0 0 40px rgba(0,0,0,0.35);
    transform: translateZ(-220px) scale(1.15);
  }
  .city {
    position: absolute;
    left: 12%;
    bottom: 18%;
    width: 70%;
    height: 38%;
    background:
      linear-gradient(90deg,
        transparent 0 8%, #1d2a40 8% 14%, transparent 14% 22%,
        #243352 22% 28%, transparent 28% 40%,
        #1a2740 40% 47%, transparent 47% 58%,
        #2a3a58 58% 66%, transparent 66% 78%,
        #1c2b44 78% 86%, transparent 86%);
    opacity: 0.7;
    transform: translateZ(-200px);
  }
  .shelf {
    position: absolute;
    right: 5%;
    top: 12%;
    width: 22%;
    height: 58%;
    border-radius: 8px;
    background: linear-gradient(180deg, #2a2218, #1a140e);
    box-shadow: 0 20px 40px rgba(0,0,0,0.45);
    transform: translateZ(-90px) rotateY(-8deg);
    overflow: hidden;
  }
  .book {
    position: absolute;
    left: 10%;
    right: 10%;
    height: 10%;
    border-radius: 2px;
  }
  .desk {
    position: absolute;
    left: 8%;
    right: 8%;
    bottom: 0;
    height: 46%;
    background:
      linear-gradient(180deg, #3a2a1c 0%, #2a1d14 40%, #1a120c 100%);
    transform: rotateX(62deg) translateZ(-20px);
    transform-origin: 50% 100%;
    box-shadow: 0 -30px 80px rgba(0,0,0,0.5);
  }
  .desk-grain {
    position: absolute;
    inset: 0;
    opacity: 0.18;
    background-image: repeating-linear-gradient(
      90deg,
      rgba(255,220,180,0.08) 0 2px,
      transparent 2px 7px
    );
  }
  .monitor {
    position: absolute;
    left: 50%;
    top: 18%;
    width: 42%;
    height: 48%;
    transform: translateX(-50%) translateZ(20px);
  }
  .bezel {
    position: absolute;
    inset: 0;
    border-radius: 14px;
    background: #12161c;
    box-shadow:
      0 25px 50px rgba(0,0,0,0.55),
      0 0 0 2px rgba(255,255,255,0.06);
  }
  .screen {
    position: absolute;
    left: 3.5%;
    right: 3.5%;
    top: 4%;
    bottom: 10%;
    border-radius: 6px;
    background:
      linear-gradient(180deg, #0d1b2a, #0a1622);
    overflow: hidden;
    box-shadow: inset 0 0 40px rgba(56,189,248,0.12);
  }
  .code-line {
    height: 10px;
    margin: 10px 18px;
    border-radius: 3px;
    opacity: 0.85;
  }
  .glow {
    position: absolute;
    inset: 8% 10% 18% 10%;
    background: radial-gradient(ellipse at 50% 40%, rgba(56,189,248,0.22), transparent 70%);
    pointer-events: none;
  }
  .stand {
    position: absolute;
    left: 50%;
    bottom: -8%;
    width: 18%;
    height: 10%;
    transform: translateX(-50%);
    background: linear-gradient(180deg, #2a3038, #15191f);
    border-radius: 4px;
  }
  .keyboard {
    position: absolute;
    left: 50%;
    bottom: 14%;
    width: 36%;
    height: 9%;
    transform: translateX(-50%) translateZ(70px) rotateX(55deg);
    border-radius: 8px;
    background: linear-gradient(180deg, #2b313a, #171b21);
    box-shadow: 0 18px 30px rgba(0,0,0,0.45);
  }
  .keys {
    position: absolute;
    inset: 12% 6%;
    background-image:
      repeating-linear-gradient(90deg, #3a424e 0 8%, transparent 8% 11%),
      repeating-linear-gradient(180deg, #3a424e 0 28%, transparent 28% 40%);
    opacity: 0.7;
    border-radius: 4px;
  }
  .lamp {
    position: absolute;
    left: 18%;
    bottom: 28%;
    width: 10%;
    height: 28%;
    transform: translateZ(40px);
  }
  .lamp-arm {
    position: absolute;
    left: 45%;
    bottom: 0;
    width: 8px;
    height: 70%;
    background: #8a8f98;
    border-radius: 4px;
    transform: rotate(-18deg);
  }
  .lamp-head {
    position: absolute;
    left: 10%;
    top: 0;
    width: 70%;
    height: 28%;
    border-radius: 40% 40% 20% 20%;
    background: #c9ced6;
    box-shadow: 0 0 40px rgba(255,214,150,0.55);
  }
  .lamp-pool {
    position: absolute;
    left: 12%;
    bottom: 22%;
    width: 28%;
    height: 18%;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(255,214,150,0.28), transparent 70%);
    transform: translateZ(30px) rotateX(70deg);
  }
  .mug {
    position: absolute;
    right: 22%;
    bottom: 24%;
    width: 5.5%;
    height: 10%;
    border-radius: 6px 6px 10px 10px;
    background: linear-gradient(180deg, #d7dde7, #9aa3b2);
    transform: translateZ(55px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.35);
  }
  .label {
    position: absolute;
    left: 24px;
    bottom: 18px;
    color: rgba(226,232,240,0.55);
    font-size: 14px;
    letter-spacing: 0.04em;
    transform: translateZ(90px);
  }
</style>
</head>
<body>
  <div id="stage">
    <div id="world">
      <div class="layer sky"></div>
      <div class="layer">
        <div class="window"></div>
        <div class="city"></div>
      </div>
      <div class="layer">
        <div class="shelf">
          ${Array.from({ length: 8 }, (_, i) => {
            const colors = ['#7c3a2d', '#355c7d', '#2f5d50', '#8b5a2b', '#4b3f72', '#6b2d5b', '#3f5e46', '#7a4e2d']
            return `<div class="book" style="top:${10 + i * 10}%;background:${colors[i]}"></div>`
          }).join('')}
        </div>
      </div>
      <div class="layer">
        <div class="desk"><div class="desk-grain"></div></div>
      </div>
      <div class="layer">
        <div class="lamp-pool"></div>
        <div class="lamp">
          <div class="lamp-head"></div>
          <div class="lamp-arm"></div>
        </div>
        <div class="monitor">
          <div class="bezel">
            <div class="screen">
              <div class="code-line" style="width:62%;background:#38bdf8"></div>
              <div class="code-line" style="width:78%;background:#94a3b8"></div>
              <div class="code-line" style="width:45%;background:#34d399"></div>
              <div class="code-line" style="width:70%;background:#f59e0b"></div>
              <div class="code-line" style="width:55%;background:#a78bfa"></div>
              <div class="code-line" style="width:82%;background:#64748b"></div>
              <div class="code-line" style="width:40%;background:#38bdf8"></div>
              <div class="glow"></div>
            </div>
          </div>
          <div class="stand"></div>
        </div>
        <div class="mug"></div>
        <div class="keyboard"><div class="keys"></div></div>
      </div>
      <div class="label">MOTION LAB · DESK DEPTH</div>
    </div>
  </div>
  <script>
    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    window.__setProgress = (t) => {
      const e = easeInOut(Math.min(1, Math.max(0, t)));
      // 起点稍远偏左上 → 终点推进到显示器工作区
      const z = -160 + e * 220;      // dolly in
      const x = -36 + e * 48;       // 轻微右移
      const y = -18 + e * 34;       // 轻微下沉
      const rotY = 6 - e * 8;
      const rotX = 4 - e * 3;
      const world = document.getElementById('world');
      world.style.transform =
        'translate3d(' + x + 'px,' + y + 'px,' + z + 'px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
    };
    window.__setProgress(0);
  </script>
</body>
</html>`
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited ${code}`))
    })
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log('Usage: node scripts/generate-motion-preview.mjs [--out path]')
    return
  }

  await mkdir(path.dirname(args.out), { recursive: true })
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'era-motion-'))
  const htmlPath = path.join(tmp, 'scene.html')
  await writeFile(htmlPath, sceneHtml(), 'utf8')

  const totalFrames = FPS * DURATION_SEC
  console.log(`Rendering ${totalFrames} frames @ ${WIDTH}x${HEIGHT}…`)

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    })
    await page.goto(`file://${htmlPath}`, { waitUntil: 'load' })
    for (let i = 0; i < totalFrames; i++) {
      const t = i / (totalFrames - 1)
      await page.evaluate((p) => window.__setProgress(p), t)
      const framePath = path.join(tmp, `frame-${String(i).padStart(4, '0')}.png`)
      await page.screenshot({ path: framePath, type: 'png' })
      if (i % 12 === 0 || i === totalFrames - 1) {
        console.log(`  frame ${i + 1}/${totalFrames}`)
      }
    }
  } finally {
    await browser.close()
  }

  console.log('Encoding mp4…')
  await run('ffmpeg', [
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    path.join(tmp, 'frame-%04d.png'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-crf',
    '18',
    '-movflags',
    '+faststart',
    '-an',
    args.out,
  ])

  await rm(tmp, { recursive: true, force: true })
  console.log(`Wrote ${args.out}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
