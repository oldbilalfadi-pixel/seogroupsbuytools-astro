import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import renderPage from '../src/lib/render.js';
const files=['content/homepage.json',...['products','pages'].flatMap(dir=>fs.readdirSync('content/'+dir).filter(x=>x.endsWith('.json')).map(f=>'content/'+dir+'/'+f))];
const site=JSON.parse(fs.readFileSync('content/settings.json','utf8'));
const totals={pages:0,groups:0,outsideGroups:0,editableText:0,buttons:0,cards:0,images:0,prices:0,seo:0,hero:0,global:0,products:0,productFields:0,labels:0};
for (const file of files) {
  const page=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(renderPage(page,site),page.html,'Unedited page HTML changed: '+file);
  assert.ok(Array.isArray(page.outsideGroups), 'Missing outside CMS groups: '+file);
  assert.ok(Array.isArray(page.contentGroups), 'Missing CMS groups: '+file);
  for (const group of [...page.contentGroups,...page.outsideGroups]) {
    if(group.headingSource) {
      const edited=structuredClone(page);
      const target=[...edited.contentGroups,...edited.outsideGroups].find(g=>g.headingSource===group.headingSource);
      assert.ok(target,file+' missing heading');
      target.heading='CMS HEADING VALIDATION';
      assert.ok(renderPage(edited).includes('CMS HEADING VALIDATION'),file+' heading edit');
    }
    for (const item of group.items) {
      assert.ok(item.text && item.source && page.html.includes(item.source),file+' empty CMS field');
    }
  }
  const item=[...page.contentGroups,...page.outsideGroups].flatMap(g=>g.items).find(e=>e.source && e.text);
  if(item) {
    const edit=structuredClone(page);
    [...edit.contentGroups,...edit.outsideGroups].flatMap(g=>g.items).find(e=>e.source===item.source).text='CMS PARAGRAPH VALIDATION';
    assert.ok(renderPage(edit).includes('CMS PARAGRAPH VALIDATION'),file+' text edit');
  }
  if(file.startsWith('content/products/')) {
    const h=page.productHero;
    assert.ok(h&&h.name&&h.description&&h.buttonUrl, file+' missing product details');
    for(const [field,marker] of [['name','CMS PRODUCT NAME'],['description','CMS PRODUCT SUMMARY'],['price','CMS PRODUCT PRICE'],['buttonLabel','CMS BUY BUTTON'],['buttonUrl','/cms-product-checkout/'],['image','/assets/images/cms-product.png']]){
      const edit=structuredClone(page);
      edit.productHero[field]=marker;
      assert.ok(renderPage(edit,site).includes(marker),file+' '+field+' edit');
      totals.productFields++;
    }
    if(h.features?.length){
      const edit=structuredClone(page);
      edit.productHero.features[0].text='CMS FEATURE VALIDATION';
      assert.ok(renderPage(edit,site).includes('CMS FEATURE VALIDATION'),file+' feature edit');
      totals.productFields++;
    }
    totals.products++;
  }
  if (page.buttons?.length) {
    const edit=structuredClone(page);
    edit.buttons[0].url='/cms-link-validation/';
    assert.ok(renderPage(edit).includes('href="/cms-link-validation/"'),file+' link edit');
    totals.buttons+=page.buttons.length;
  }
  if (page.cardLinks?.length) {
    const edit=structuredClone(page);
    edit.cardLinks[0].url='/cms-card-validation/';
    assert.ok(renderPage(edit,site).includes('href="/cms-card-validation/"'),file+' card edit');
    totals.cards+=page.cardLinks.length;
  }
  if (page.mediaImages?.length) {
    const edit=structuredClone(page);
    edit.mediaImages[0].src='/assets/images/cms-image-validation.png';
    assert.ok(renderPage(edit).includes('src="/assets/images/cms-image-validation.png"'),file+' image edit');
    totals.images+=page.mediaImages.length;
  }
  if(page.labelTexts?.length) {
    for(const label of page.labelTexts) {
      assert.equal(page.html.slice(label.sourceOffset,label.sourceOffset+label.source.length),label.source,file+' badge mapped incorrectly');
    }
    const target=page.labelTexts.find(label=>label.text && label.sourceOffset>=0);
    if(target) {
      const edit=structuredClone(page);
      edit.labelTexts.find(l=>l.sourceOffset===target.sourceOffset).text='CMS BADGE VALIDATION';
      assert.ok(renderPage(edit,site).includes('CMS BADGE VALIDATION'),file+' badge edit');
    }
    totals.labels+=page.labelTexts.length;
  }
  if (page.priceValues?.length) {
    const edit=structuredClone(page);
    edit.priceValues[0].value='$98765';
    assert.ok(renderPage(edit).includes('$98765'),file+' price edit');
    totals.prices+=page.priceValues.length;
  }
  if (page.html.includes('<title>')) {
    const edit=structuredClone(page);
    edit.seoTitle='CMS SEO TITLE VALIDATION';
    assert.ok(renderPage(edit).includes('<title>CMS SEO TITLE VALIDATION</title>'),file+' SEO title');
    totals.seo++;
  }
  if (page.hero && page.originalHero) {
    const edit=structuredClone(page);
    edit.hero.headingHighlight='CMS HERO VALIDATION';
    assert.ok(renderPage(edit).includes('CMS HERO VALIDATION'),file+' hero edit');
    totals.hero++;
  }
  if (page.html.includes('<header') && site.siteChrome?.headerLinks?.length) {
    const edited=structuredClone(site);
    edited.siteChrome.headerLinks[0].text='CMS MENU VALIDATION';
    assert.ok(renderPage(page,edited).includes('CMS MENU VALIDATION'),file+' menu edit');
    totals.global++;
  }
  if (page.html.includes('<footer') && site.siteChrome?.footerText) {
    const edited=structuredClone(site);
    edited.siteChrome.footerText='CMS FOOTER VALIDATION';
    assert.ok(renderPage(page,edited).includes('CMS FOOTER VALIDATION'),file+' footer edit');
  }
  totals.pages++;
  totals.groups+=page.contentGroups.length+page.outsideGroups.length;
  totals.outsideGroups+=page.outsideGroups.length;
  totals.editableText+=[...page.contentGroups,...page.outsideGroups].reduce((n,g)=>n+g.items.length+(g.headingSource?1:0),0);
}
assert.equal(totals.pages,72);
assert.equal(totals.products,30);
assert.ok(totals.productFields>=180);
assert.ok(totals.groups>100 && totals.outsideGroups>20 && totals.editableText>500 && totals.buttons>100 && totals.cards>50 && totals.images>50 && totals.prices>10 && totals.labels>20);
assert.ok(site.siteChrome?.headerLinks.length>5 && site.siteChrome?.footerLinks.length>5);
for(const file of ['content/homepage.json','content/pages/pricing.json','content/products/seo-tools__ahrefs.json']){
  assert.ok(JSON.parse(fs.readFileSync(file,'utf8')).priceValues.length>0,'Pricing fields missing: '+file);
}
const cms=fs.readFileSync('.pages.yml','utf8');
assert.ok(!cms.includes('Section ID')&&!cms.includes('Original HTML')&&!cms.includes('editorContent'));
assert.ok(cms.includes('summary: "{heading}"') && cms.includes('name: priceValues') && cms.includes('name: cardLinks') && cms.includes('name: outsideGroups') && cms.includes('name: productHero') && cms.includes('name: labelTexts'));
console.log('CMS validated:',JSON.stringify(totals));