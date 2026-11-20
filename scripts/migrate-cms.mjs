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


function addProductHero(page) {
  if (page.productHero) return;
  const html=page.html;
  const sourceTag = re => html.match(re)?.[0] || '';
  const nameSource=sourceTag(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
  const descriptionSource=sourceTag(/<p\b[^>]*class="[^"]*\bproduct-hero-tagline\b[^"]*"[^>]*>[\s\S]*?<\/p>/i);
  const priceSource=sourceTag(/<span\b[^>]*class="[^"]*\bproduct-hero-price\b[^"]*"[^>]*>[^<]+/i);
  const imgSource=[...html.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0]).find(x=>/\bclass="[^"]*\bproduct-hero-image\b/i.test(x))||'';
  const buttonSource=[...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map(x=>x[0]).find(x=>/\bclass="[^"]*\bproduct-buy-btn\b/i.test(x))||'';
  const name=plain(nameSource),description=plain(descriptionSource);
  const price=plain(priceSource.replace(/^<[^>]*>/,''));
  const image=imgSource.match(/\bsrc="([^"]*)"/i)?.[1]||'';
  const imageAlt=imgSource.match(/\balt="([^"]*)"/i)?.[1]||'';
  const buttonLabel=plain(buttonSource),buttonUrl=buttonSource.match(/\bhref="([^"]*)"/i)?.[1]||'';
  const featureHtml=html.match(/<ul\b[^>]*class="[^"]*\bproduct-hero-trust\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/i)?.[1]||'';
  const features=[...featureHtml.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)].map(m=>({text:plain(m[0]),originalText:plain(m[0]),source:m[0]}));
  page.productHero={
    name,originalName:name,nameSource,
    description,originalDescription:description,descriptionSource,
    price,originalPrice:price,priceSource,
    image,originalImage:image,imageAlt,originalImageAlt:imageAlt,imageSource:imgSource,
    buttonLabel,originalButtonLabel:buttonLabel,buttonUrl,originalButtonUrl:buttonUrl,buttonSource,
    features
  };
  const remove=new Set([nameSource,descriptionSource,...features.map(x=>x.source)].filter(Boolean));
  page.outsideGroups=page.outsideGroups.map(g=>({
    ...g,
    headingSource:remove.has(g.headingSource) && g.heading===g.originalHeading ? '' : g.headingSource,
    heading:remove.has(g.headingSource) && g.heading===g.originalHeading ? '' : g.heading,
    items:g.items.filter(x=>!remove.has(x.source)||x.text!==x.originalText)
  })).filter(g=>g.heading || g.items.length);
  if(buttonSource)page.buttons=page.buttons.filter(x=>x.source!==buttonSource);
  if(imgSource)page.mediaImages=page.mediaImages.filter(x=>x.source!==imgSource);
  if(priceSource)page.priceValues=page.priceValues.filter(x=>x.source!==priceSource);
}


function addVisibleLabels(page) {
  const previous=Array.isArray(page.labelTexts)?page.labelTexts:[];
  const bodyMatch=page.html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body=bodyMatch?.[1]||page.html;
  const bodyStart=bodyMatch?bodyMatch.index+bodyMatch[0].indexOf('>')+1:0;
  // Mask uneditable chrome and scripts without changing offsets.
  const core=body.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi,m=>' '.repeat(m.length))
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi,m=>' '.repeat(m.length))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,m=>' '.repeat(m.length));
  const covered=[
    ...[...(page.contentGroups||[]),...(page.outsideGroups||[])].flatMap(g=>[g.headingSource,...g.items.map(e=>e.source)]),
    ...(page.priceValues||[]).map(p=>p.source),
    ...(page.buttons||[]).map(b=>b.source),
    ...(page.productHero?[page.productHero.nameSource,page.productHero.descriptionSource,page.productHero.priceSource,...page.productHero.features.map(f=>f.source)]:[])
  ].filter(Boolean);
  const occurrence=new Map(), labelTexts=[];
  for(const m of core.matchAll(/<(span|small|strong|em|label|div)\b[^>]*>([^<>]+)<\/\1>/gi)){
    const source=m[0],value=plain(m[2]),sourceOffset=bodyStart+m.index;
    if(!value||value.length>300||!/[\p{L}\p{N}$£€]/u.test(value))continue;
    if(covered.some(s=>s.includes(source)))continue;
    if(page.route==='/' && source.includes('hero-highlight'))continue;
    if(page.html.slice(sourceOffset,sourceOffset+source.length)!==source)continue;
    const ordinal=occurrence.get(source)||0;occurrence.set(source,ordinal+1);
    const old=previous.find(x=>x.sourceOffset===sourceOffset && x.source===source)||previous.find(x=>x.source===source&&x.ordinal===ordinal);
    labelTexts.push({text:old?.text??value,originalText:value,source,sourceOffset,ordinal});
  }
  page.labelTexts=labelTexts;
}

function addOutsideContent(page) {
  const body=page.html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || page.html;
  const core=body.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi,'')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi,'')
    .replace(/<main\b[^>]*>[\s\S]*?<\/main>/gi,'')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  if(!Array.isArray(page.outsideGroups)) {
    let group=null;
    page.outsideGroups=[];
    for(const m of core.matchAll(/<(h[1-6]|p|li|button|td|th)\b[^>]*>[\s\S]*?<\/\1>/gi)) {
      const source=m[0],tag=m[1].toLowerCase(),inner=source.slice(source.indexOf('>')+1,source.lastIndexOf('</'));
      const value=plain(inner);
      if(!value || value.length>5000 || /<(script|style|svg|iframe|form)\b/i.test(inner))continue;
      if(/^h[1-3]$/.test(tag)) {
        if(tag==='h1' && page.route==='/' && page.hero) continue; // managed by dedicated hero fields
        group={heading:value,originalHeading:value,headingSource:source,items:[]};
        page.outsideGroups.push(group);
      } else {
        if(!group) {group={heading:'',originalHeading:'',headingSource:'',items:[]};page.outsideGroups.push(group);}
        group.items.push({text:value,originalText:value,source,tag});
      }
    }
    page.outsideGroups=page.outsideGroups.filter(g=>g.heading||g.items.length);
  }
  page.buttons ??=[];
  for(const m of core.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    if(!plain(m[2])||/<(img|svg|div|ul|li|span)\b/i.test(m[2]))continue;
    if(!page.buttons.some(b=>b.source===m[0]))
      page.buttons.push({text:plain(m[2]),originalText:plain(m[2]),url:m[1],originalUrl:m[1],source:m[0]});
  }
  page.mediaImages ??=[];
  for(const m of core.matchAll(/<img\b[^>]*>/gi)) {
    if(page.mediaImages.some(img=>img.source===m[0]))continue;
    const src=m[0].match(/\bsrc="([^"]*)"/i)?.[1]||'',alt=m[0].match(/\balt="([^"]*)"/i)?.[1]||'';
    page.mediaImages.push({src,originalSrc:src,alt,originalAlt:alt,source:m[0]});
  }
  page.cardLinks ??=[];
  for(const m of core.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    if(!/<(img|svg|div|span|h[2-6])\b/i.test(m[2])||m[0].length>20000||page.cardLinks.some(card=>card.source===m[0]))continue;
    const label=plain(m[2].match(/<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>/i)?.[1]||m[2].match(/<img\b[^>]*alt="([^"]*)"/i)?.[1]||m[2]).slice(0,100);
    page.cardLinks.push({label:label||'Card',url:m[1],originalUrl:m[1],source:m[0]});
  }
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
  const mainPrices=page.html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]||page.html;
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
  addOutsideContent(page);
  if(file.startsWith('content/products/')) addProductHero(page);
  addVisibleLabels(page);
  for(const group of [...page.contentGroups,...page.outsideGroups]) {
    if (group.headingSource) assert.ok(page.html.includes(group.headingSource),file+' heading');
    for(const entry of group.items) assert.ok(page.html.includes(entry.source),file+' entry');
  }
  groups+=page.contentGroups.length+page.outsideGroups.length;
  items+=[...page.contentGroups,...page.outsideGroups].reduce((n,g)=>n+g.items.length,0);
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