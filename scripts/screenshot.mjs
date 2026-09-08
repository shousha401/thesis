/**
 * Captures a page at a real device width. Used to regenerate docs/screens/.
 *
 *   node scripts/screenshot.mjs <url> <out.png> <width> <height> [dpr] [mobile]
 *
 * e.g. with the site running on :3000
 *   node scripts/screenshot.mjs http://localhost:3000/ docs/screens/home-390.png 390 844 2 true
 *   node scripts/screenshot.mjs http://localhost:3000/ docs/screens/home-1440.png 1440 900 1 false
 *
 * Why this exists rather than `chrome --screenshot --window-size=390,844`:
 * Chrome on Windows will not make a window narrower than 500px, so that command
 * silently lays the page out at 500px and crops the image to 390 - which looks
 * exactly like a horizontal-overflow bug that is not there. This drives Chrome
 * over the DevTools protocol and sets device metrics properly instead.
 *
 * No dependencies: Node 22 has a global WebSocket.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [url, out, w, h, dpr = '2', mobile = 'true'] = process.argv.slice(2);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  '--window-size=1200,900',
  'about:blank',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a debugging target');
}

const page = await targets();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

await new Promise((r) => ws.addEventListener('open', r, { once: true }));

await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: Number(dpr),
  mobile: mobile === 'true',
});
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(3500); // fonts, images and the marquee's first frame

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync(out, Buffer.from(shot.data, 'base64'));

const metrics = await send('Runtime.evaluate', {
  expression: 'JSON.stringify({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth })',
  returnByValue: true,
});
console.log(`${out}  ${metrics.result.value}`);

ws.close();
chrome.kill();
