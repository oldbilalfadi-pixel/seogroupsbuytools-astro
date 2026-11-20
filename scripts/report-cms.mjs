import fs from 'node:fs';
import path from 'node:path';
const files=['content/homepage.json',...['products','pages'].flatMap(dir=>fs.readdirSync('content/'+dir).filter(f=>f.endsWith('.json')).map(f=>'content/'+dir+'/'+f))];
const lines=['# Website CMS Editing Report','','All original HTML, CSS, URLs, prices and images remain unchanged until an editor changes the associated field. Every entry below corresponds to the existing Pages CMS editors, not a newly invented page.','','## Field types','', '- **Product details** — name, short description, price, product image, checkout button and key features (Products only)','- **Content sections** — section heading, paragraphs, feature lists, FAQ question/answer content and table cell text','- **Hero, pricing and visual sections** — visible headers, descriptions and card features outside the article','- **Prices** — individual displayed pricing amounts','- **Buttons and destinations** — text and URL for normal buttons','- **Product cards and visual links** — destination URLs for existing visual cards','- **Images** — image source and alternative text','- **Badges, stats and small labels** — plain-text labels not already covered by another field','- **SEO** — title and meta description','- **Site settings** — shared menu, footer text, logos and links','','## Every page and its editable sections',''];
let totals={pages:0,headings:0,paragraphs:0,prices:0,images:0,buttons:0,cards:0,labels:0,products:0};
for(const file of files) {
  const page=JSON.parse(fs.readFileSync(file,'utf8'));
  totals.pages++;
  if(page.productHero)totals.products++;
  const content=[...(page.outsideGroups||[]),...(page.contentGroups||[])];
  lines.push('### '+page.route+' — '+page.title,'','**Editors:** '+[
    page.productHero?'Product details':'',
    content.length?'Content sections':'',
    page.priceValues?.length?'Prices':'',
    page.buttons?.length?'Buttons and destinations':'',
    page.cardLinks?.length?'Product cards':'',
    page.mediaImages?.length?'Images':'',
    page.labelTexts?.length?'Badges and small labels':'',
    'SEO title / description'
  ].filter(Boolean).join(' · '),'');
  if(page.productHero)lines.push('- **Product details:** '+page.productHero.name+' — name, description, price, image, Buy Now button, '+(page.productHero.features?.length||0)+' features');
  for(const group of content) {
    const name=(group.heading||group.items?.[0]?.text||'Other content').replace(/\s+/g,' ').slice(0,120);
    lines.push('- **'+name.replace(/\*/g,'')+'** — heading '+(group.headingSource?'editable':'not applicable')+', '+(group.items?.length||0)+' individually editable text items');
    totals.headings+=group.headingSource?1:0;
    totals.paragraphs+=group.items?.length||0;
  }
  for(const [field,key] of [['priceValues','prices'],['mediaImages','images'],['buttons','buttons'],['cardLinks','cards'],['labelTexts','labels']])totals[key]+=page[field]?.length||0;
  lines.push('');
}
lines.splice(7,0,'**Pages:** '+totals.pages+' (including the existing 404 source entry). **Products:** '+totals.products+'. **Headings:** '+totals.headings+'. **Text entries:** '+totals.paragraphs+'. **Prices:** '+totals.prices+'. **Images:** '+totals.images+'. **Buttons:** '+totals.buttons+'. **Cards:** '+totals.cards+'. **Small labels:** '+totals.labels+'.');
fs.writeFileSync('content/CMS-EDITABLE-CONTENT-REPORT.md',lines.join('\n')+'\n');
console.log('Report generated:',JSON.stringify(totals));