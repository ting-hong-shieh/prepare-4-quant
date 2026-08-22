import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Screenshots of the running app. Written because for most of this project the
// screens were only ever verified as markup — the first time anyone actually
// looked at a rendered page it turned up four bugs in one screen.
//
//   npm run shots                 → ./shots/ against localhost:3000
//   npm run shots -- http://…     → somewhere else
//
// On a machine without the chromium system libraries and without sudo:
//   npx playwright install chromium --only-shell
//   mkdir -p /tmp/plibs && cd /tmp/plibs && apt-get download libnspr4 libnss3 libasound2t64
//   for d in *.deb; do dpkg-deb -x "$d" root; done
//   export LD_LIBRARY_PATH=/tmp/plibs/root/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH

const base = process.argv[2] ?? 'http://localhost:3000';
const outDir = path.join(process.cwd(), 'shots');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  // swiftshader so the WebGL scene renders without a GPU
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });

const problems = [];
page.on('pageerror', e => problems.push(`pageerror: ${e.message.split('\n')[0]}`));
page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 160)}`); });

async function shot(name, url, settle = 1500) {
  await page.goto(base + url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(settle);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log(`  ${name}.png  ←  ${url}`);
}

// The home screen needs longer: the 3D scene has to boot and settle.
await shot('home', '/', 5000);
await shot('review', '/review?all=1');

const res = await page.request.post(base + '/api/session', { data: {} });
if (res.ok()) {
  const { sessionId } = await res.json();
  await shot('drill', `/drill/${sessionId}`);
} else {
  console.log('  (skipped drill: could not create a session — is the bank empty?)');
}

await browser.close();

console.log(`\n→ ${outDir}`);
if (problems.length) {
  console.log('\n瀏覽器回報的問題:');
  for (const p of [...new Set(problems)].slice(0, 10)) console.log('  ' + p);
} else {
  console.log('沒有 console 或 page error。');
}
