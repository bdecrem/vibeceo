#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = process.argv[2] || 'https://webtoys.ai/public/webtoys-os';
const URL = baseUrl.includes('?') ? `${baseUrl}&nc=${Date.now()}` : `${baseUrl}?nc=${Date.now()}`;

function outPath(name) {
  const dir = path.join(process.cwd(), 'backups', 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  return path.join(dir, `${ts}_${name}.png`);
}

function outHtmlPath(name) {
  const dir = path.join(process.cwd(), 'backups', 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  return path.join(dir, `${ts}_${name}.html`);
}

async function clickIconByLabel(page, labelText) {
  // Find desktop icon with matching label text
  const handle = await page.$x(`//div[contains(@class,'desktop-icon')]//div[contains(@class,'label') and normalize-space(text())='${labelText}']`);
  if (handle.length) {
    await handle[0].click({ delay: 50 });
    return true;
  }
  return false;
}

async function main() {
  const launchOpts = {};
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    launchOpts.headless = 'new';
  } else {
    launchOpts.headless = 'new';
  }

  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // Diagnostics: surface console logs and request failures
  page.on('console', (msg) => {
    try { console.log('PAGE:', msg.type(), msg.text()); } catch {}
  });
  page.on('requestfailed', (req) => {
    console.warn('REQUEST FAILED:', req.url(), req.failure()?.errorText);
  });
  page.on('pageerror', (err) => {
    console.error('PAGE ERROR:', err.message);
  });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.screenshot({ path: outPath('after-goto'), fullPage: false });
  // Be tolerant: wait for one of several desktop markers
  const waited = await Promise.race([
    page.waitForSelector('#desktop', { timeout: 90000 }).then(() => 'desktop'),
    page.waitForSelector('.menu-bar', { timeout: 90000 }).then(() => 'menu-bar'),
    page.waitForSelector('.desktop-icon', { timeout: 90000 }).then(() => 'icon'),
    page.waitForSelector('#window-container', { timeout: 90000 }).then(() => 'window-container')
  ]).catch(() => null);
  if (!waited) throw new Error('Desktop UI not detected after 90s');
  await page.screenshot({ path: outPath('desktop'), fullPage: false });

  // Try open Notepad
  let opened = await clickIconByLabel(page, 'Notepad');
  if (!opened) {
    // Fallback: App Studio
    opened = await clickIconByLabel(page, 'App Studio');
  }
  if (!opened) {
    // Fallback: click first desktop icon
    const firstIcon = await page.$('.desktop-icon');
    if (firstIcon) await firstIcon.click({ delay: 50 });
  }

  // Wait for a window iframe to appear
  await page.waitForSelector('.desktop-window iframe', { timeout: 60000 });
  await page.screenshot({ path: outPath('window-opened'), fullPage: false });

  // Try opening a second window to verify layering
  await clickIconByLabel(page, 'App Studio');
  // Give it a moment
  await page.waitForTimeout(800);
  await page.screenshot({ path: outPath('two-windows'), fullPage: false });

  // Log basic window count
  const winCount = await page.$$eval('.desktop-window', els => els.length);
  console.log(`✅ Smoke test complete. Windows open: ${winCount}`);

  await browser.close();
}

main().catch(err => {
  console.error('❌ Puppeteer smoke failed:', err);
  process.exit(1);
});


