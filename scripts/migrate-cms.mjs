import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const plain = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, ' ').trim();
const directories = ['content/products', 'content/pages'];
const files = ['content/homepage.json', ...directories.flatMap(d => fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => path.join(d, f)))];
function build(page) {
  const html = page.html;
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  // Headings and content appear in document order. CSS and markup remain in the original HTML.
  const entries = [];
  const re = /<(h[1-6]|p|li|button|td|th)\b[^>]*>[\s\S]*?<\/\1>/gi;
  for (const match of main.matchAll(re)) {
    const source = match[0], tag = match[1].toLowerCase();
    const start = source.indexOf('>')+1, end = source.lastIndexOf('</');
    const content = source.slice(start,end);
    const value = plain(content);
    if (!value || value.length > 5000 || /<(script|style|svg|iframe|form|textarea)\b/i.test(content)) continue;
    entries.push({tag,text:value,originalText:value,source});
  }
  const groups = [];
  let current = null;
  for (const entry of entries) {
    if (/^h[12]$/.test(entry.tag)) {
      current = {heading:entry.text,originalHeading:entry.text,headingSource:entry.source,items:[]};
      groups.push(current);
    } else {
      if (!current) {
        current={heading:'',originalHeading:'',headingSource:'',items:[]};
        groups.push(current);
      }
      current.items.push(entry);
    }
  }
  // Discard any purely empty sections; keep their original ordering.
  page.contentGroups = groups.filter(g=>g.heading || g.items.length);
  page.buttons = [...main.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .filter(m => plain(m[2]) && !/<(a|ul|li|div|span|svg|img)\b/i.test(m[2]))
    .map(m=>({text:plain(m[2]),originalText:plain(m[2]),url:m[1],originalUrl:m[1],source:m[0]}));
  page.mediaImages = [...main.matchAll(/<img\b[^>]*>/gi)].map(m=>({
    src:m[0].match(/\bsrc="([^"]*)"/i)?.[1] || '',
    originalSrc:m[0].match(/\bsrc="([^"]*)"/i)?.[1] || '',
    alt:m[0].match(/\balt="([^"]*)"/i)?.[1] || '',
    originalAlt:m[0].match(/\balt="([^"]*)"/i)?.[1] || '',
    source:m[0]
  }));
  page.priceValues = [...main.matchAll(/<(span|div)\b[^>]*class="[^"]*\b(?:price|price-tag|product-hero-price|pricing-price)\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi)]
    .map(m=>({value:plain(m[0].replace(/^<[^>]*>/,'').replace(/<\/[^>]*>$/,'')),originalValue:plain(m[0].replace(/^<[^>]*>/,'').replace(/<\/[^>]*>$/,'')),source:m[0]}))
    .filter(x=>x.value && x.value.length<100 && !/<[a-z]/i.test(x.source.replace(/^<[^>]*>/,'').replace(/<\/[^>]*>$/,'')));
}
let groups=0, items=0, images=0, buttons=0, prices=0;
for (const file of files) {
  const page=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.ok(page.html && page.route, file);
  page.seoTitle ??= page.title || '';
  page.seoDescription ??= page.description || '';
  page.originalPageTitle ??= page.title;
  page.originalSeoTitle ??= page.seoTitle;
  page.originalSeoDescription ??= page.seoDescription;
  if(page.hero && !page.originalHero) page.originalHero = structuredClone(page.hero);
  if (!Array.isArray(page.contentGroups)) build(page);
  if (!page.priceValues?.length) {
    const main=page.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||page.html;
    page.priceValues=[...main.matchAll(/<(span|div)\b[^>]*class="[^"]*\b(?:price|price-tag|product-hero-price|pricing-price)\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi)]
      .map(m=>({value:plain(m[0].replace(/^<[^>]*>/,'').replace(/<\/[^>]*>$/,'')),originalValue:plain(m[0].replace(/^<[^>]*>/,'').replace(/<\/[^>]*>$/,'')),source:m[0]}))
      .filter(x=>x.value&&x.value.length<100&&!/<[a-z]/i.test(x.source.replace(/^<[^>]*>/,'').replace(/<\/[^>]*>$/,'')));
  }
  // Price amounts inside designed cards and product hero blocks have nested markup.
  // Edit only the amount text so currency, /month suffix, and CSS remain untouched.
  const mainPrices=page.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||page.html;
  page.priceValues ??= [];
  for(const m of mainPrices.matchAll(/<span\b[^>]*class="[^"]*\bamount\b[^"]*"[^>]*>[^<]*<\/span>/gi)) {
    const value=plain(m[0].replace(/^<[^>]*>/,'').replace(/<\/span>$/,''));
    if(value && !page.priceValues.some(p=>p.source===m[0]))
      page.priceValues.push({value,originalValue:value,source:m[0]});
  }
  for(const m of mainPrices.matchAll(/<span\b[^>]*class="[^"]*\bproduct-hero-price\b[^"]*"[^>]*>([^<]+)/gi)) {
    const source=m[0],value=plain(m[1]);
    if(value && !page.priceValues.some(p=>p.source===source))
      page.priceValues.push({value,originalValue:value,source,mode:'prefix'});
  }
  if (!Array.isArray(page.cardLinks)) {
    const mainLinks=page.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||page.html;
    page.cardLinks=[...mainLinks.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .filter(m=>/<(img|svg|div|span|h[2-6])\b/i.test(m[2]) && m[0].length<20000)
      .map(m=>{
        const title=plain(m[2].match(/<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>/i)?.[1]
          || m[2].match(/<img\b[^>]*alt="([^"]*)"/i)?.[1] || m[2]).slice(0,100);
        return {label:title||'Card link',url:m[1],originalUrl:m[1],source:m[0]};
      });
  }
  for(const group of page.contentGroups) {
    if (group.headingSource) assert.ok(page.html.includes(group.headingSource),file+' heading');
    for(const entry of group.items) assert.ok(page.html.includes(entry.source),file+' entry');
  }
  groups+=page.contentGroups.length;
  items+=page.contentGroups.reduce((n,g)=>n+g.items.length,0);
  images+=page.mediaImages?.length||0;
  buttons+=page.buttons?.length||0;
  prices+=page.priceValues?.length||0;
  fs.writeFileSync(file,JSON.stringify(page,null,2)+'\n');
}

const settingsFile='content/settings.json';
const settings=JSON.parse(fs.readFileSync(settingsFile,'utf8'));
if(!settings.siteChrome) {
  const html=JSON.parse(fs.readFileSync('content/homepage.json','utf8')).html;
  const region = name => html.match(new RegExp('<'+name+'\\b[^>]*>[\\s\\S]*?<\\/'+name+'>','i'))?.[0]||'';
  const header=region('header'),footer=region('footer');
  const links = source => [...source.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .filter(m=>plain(m[2]) && !/<(img|svg|div|ul|li|span)\b/i.test(m[2]))
    .map(m=>({text:plain(m[2]),originalText:plain(m[2]),url:m[1],originalUrl:m[1]}));
  const logo = source => source.match(/<img\b[^>]*src="([^"]*)"[^>]*>/i)?.[1]||'';
  const footerText = plain(footer.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'');
  settings.siteChrome={
    headerLinks:links(header),footerLinks:links(footer),
    headerLogo:logo(header),originalHeaderLogo:logo(header),
    footerLogo:logo(footer),originalFooterLogo:logo(footer),
    footerText,originalFooterText:footerText
  };
}
settings.originalSiteName ??= settings.siteName;
fs.writeFileSync(settingsFile,JSON.stringify(settings,null,2)+'\n');

assert.equal(files.length,72);
console.log(JSON.stringify({pages:files.length,groups,items,images,buttons,prices,originalMarkupPreserved:true}));