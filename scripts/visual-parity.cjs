const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const LIVE = 'https://seogroupsbuytools.com';
const PREVIEW = 'https://seogroupsbuytools-astro.oldbilalfadi.workers.dev';
const routes = ['/', '/seo-tools/', '/seo-tools/ahrefs/', '/seo-tools/semrush/', '/design-tools/', '/design-tools/canva-pro/', '/pricing/', '/faq/', '/how-it-works/'];
const sizes = [{name:'desktop', width:1440, height:900}, {name:'mobile', width:390, height:844}];
const out = 'audit-results/visual';
fs.mkdirSync(out,{recursive:true});
(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  for (const size of sizes) {
    const context = await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1, reducedMotion:'reduce'});
    for (const route of routes) {
      const name = (route==='/'?'home':route.replace(/^\/|\/$/g,'').replace(/\//g,'--'));
      const entry = {route,viewport:size.name};
      for (const [label,base] of [['live',LIVE],['preview',PREVIEW]]) {
        const page = await context.newPage();
        const failures = [];
        page.on('pageerror', e => failures.push(e.message));
        try {
          const response = await page.goto(base+route,{waitUntil:'networkidle',timeout:30000});
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({path:path.join(out,`${name}-${size.name}-${label}.png`),fullPage:true,animations:'disabled'});
          entry[label] = {status:response?.status(),title:await page.title(),h1:await page.locator('h1').allTextContents(),bodyHeight:await page.evaluate(()=>document.documentElement.scrollHeight),scrollWidth:await page.evaluate(()=>document.documentElement.scrollWidth),errors:failures};
        } catch(e) {entry[label] = {error:String(e)}}
        await page.close();
      }
      results.push(entry);
      console.log(size.name,route,JSON.stringify({live:entry.live?.status,preview:entry.preview?.status,liveHeight:entry.live?.bodyHeight,previewHeight:entry.preview?.bodyHeight}));
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync('audit-results/visual-results.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
