import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const FRAMES_DIR = '/tmp/impact_frames';
const OUTPUT_MP4 = '/Users/mac/Documents/Projects/impact-vault/impact_vault_demo.mp4';
const ARTIFACT_DIR = '/Users/mac/.gemini/antigravity/brain/f4518c8a-87ef-4bb3-b998-139f237b1b4f';

if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let frameCount = 0;
async function captureLoop(page, durationMs, fps = 10) {
  const interval = 1000 / fps;
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const framePath = path.join(FRAMES_DIR, `frame_${String(frameCount++).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath });
    await sleep(interval);
  }
}

async function run() {
  console.log('Launching browser for comprehensive live recorded demo...');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  console.log('Navigating to https://impact-vault-tau.vercel.app...');
  await page.goto('https://impact-vault-tau.vercel.app', { waitUntil: 'networkidle2' });

  // 1. Initial Overview & Metrics Banner
  console.log('1. Recording overview & metrics banner...');
  await captureLoop(page, 2000, 10);

  // 2. Click category filter chips
  console.log('2. Filtering categories...');
  const chips = await page.$$('.chip');
  if (chips.length > 2) {
    await chips[1].click(); // DeFi
    await captureLoop(page, 1500, 10);
    await chips[2].click(); // AI / Agents
    await captureLoop(page, 1500, 10);
    await chips[0].click(); // All Categories
    await captureLoop(page, 1200, 10);
  }

  // 3. Open First Campaign Detail Modal
  console.log('3. Opening Vault Detail Modal...');
  const detailBtns = await page.$$('button');
  for (const btn of detailBtns) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text && text.includes('View Full Vault')) {
      await btn.click();
      break;
    }
  }
  await captureLoop(page, 3000, 10);

  // Switch tabs inside modal
  const modalTabs = await page.$$('.modal .tab-btn');
  if (modalTabs.length >= 3) {
    console.log('Switching to Updates tab...');
    await modalTabs[1].click();
    await captureLoop(page, 2000, 10);

    console.log('Switching to Backer Ledger tab...');
    await modalTabs[2].click();
    await captureLoop(page, 2000, 10);

    console.log('Switching back to Roadmap tab...');
    await modalTabs[0].click();
    await captureLoop(page, 1800, 10);
  }

  // Close modal
  const closeBtn = await page.$('.modal button.ghost');
  if (closeBtn) {
    await closeBtn.click();
    await captureLoop(page, 1200, 10);
  }

  // 4. Open AI Criteria Assistant
  console.log('4. Opening AI Criteria Assistant...');
  const assistantBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find((b) => b.textContent.includes('Criteria Assistant'));
  });
  if (assistantBtn && assistantBtn.click) {
    await assistantBtn.click();
    await captureLoop(page, 2000, 10);

    // Type in prompt
    const textarea = await page.$('.modal textarea');
    if (textarea) {
      await textarea.type('Cross-chain automated liquidity routing oracle', { delay: 30 });
    }
    await captureLoop(page, 1500, 10);

    // Click Generate Draft Criteria
    const genBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.modal button'));
      return btns.find((b) => b.textContent.includes('Generate Verifiable Milestones'));
    });
    if (genBtn && genBtn.click) {
      await genBtn.click();
      await captureLoop(page, 3000, 10);

      // Click Import into wizard
      const importBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('.modal button.success'));
        return btns.find((b) => b.textContent.includes('Import Into Campaign Wizard'));
      });
      if (importBtn && importBtn.click) {
        await importBtn.click();
        await captureLoop(page, 3000, 10);
      }
    }
  }

  // Close creation wizard
  const cancelBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('.modal button.ghost'));
    return btns.find((b) => b.textContent.includes('Cancel'));
  });
  if (cancelBtn && cancelBtn.click) {
    await cancelBtn.click();
    await captureLoop(page, 1500, 10);
  }

  await browser.close();
  console.log(`Captured ${frameCount} high-resolution frames. Encoding to MP4...`);

  execSync(
    `/opt/homebrew/bin/ffmpeg -y -framerate 10 -i ${FRAMES_DIR}/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -vf "scale=1280:-2" -preset slow -crf 20 ${OUTPUT_MP4}`
  );

  const artifactMp4 = path.join(ARTIFACT_DIR, 'impact_vault_demo.mp4');
  fs.copyFileSync(OUTPUT_MP4, artifactMp4);
  console.log(`Comprehensive demo video saved to: ${OUTPUT_MP4} and ${artifactMp4}`);
}

run().catch(console.error);
