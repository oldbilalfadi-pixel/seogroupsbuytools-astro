import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import renderPage from '../src/lib/render.js';
const files=['content/homepage.json',...['products','pages'].flatMap(dir=>fs.readdirSync('content/'+dir).filter(x=>x.endsWith('.json')).map(f=>'content/'+dir+'/'+f))];
const totals={pages:0,groups:0,editableText:0,buttons:0,images:0,prices:0,seo:0,hero:0};
for (const file of files) {
  const page=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(renderPage(page),page.html,'Unedited page HTML changed: '+file);
  assert.ok(Array.isArray(page.contentGroups), 'Missing CMS groups: '+file);
  for (const group of page.contentGroups) {
    if(group.headingSource) {
      const edited=structuredClone(page);
      const index=edited.contentGroups.indexOf(edited.contentGroups.find(g=>g.headingSource===group.headingSource));
      edited.contentGroups[index].heading='CMS HEADING VALIDATION';
      assert.ok(renderPage(edited).includes('CMS HEADING VALIDATION'),file+' heading edit');
    }
    for (const item of group.items) {
      assert.ok(item.text && item.source && page.html.includes(item.source),file+' empty CMS field');
    }
  }
  const item=page.contentGroups.flatMap(g=>g.items).find(e=>e.source && e.text);
  if(item) {
    const edit=structuredClone(page);
    edit.contentGroups.flatMap(g=>g.items).find(e=>e.source===item.source).text='CMS PARAGRAPH VALIDATION';
    assert.ok(renderPage(edit).includes('CMS PARAGRAPH VALIDATION'),file+' text edit');
  }
  if (page.buttons?.length) {
    const edit=structuredClone(page);
    edit.buttons[0].url='/cms-link-validation/';
    assert.ok(renderPage(edit).includes('href="/cms-link-validation/"'),file+' link edit');
    totals.buttons+=page.buttons.length;
  }
  if (page.mediaImages?.length) {
    const edit=structuredClone(page);
    edit.mediaImages[0].src='/assets/images/cms-image-validation.png';
    assert.ok(renderPage(edit).includes('src="/assets/images/cms-image-validation.png"'),file+' image edit');
    totals.images+=page.mediaImages.length;
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
  totals.pages++;
  totals.groups+=page.contentGroups.length;
  totals.editableText+=page.contentGroups.reduce((n,g)=>n+g.items.length+(g.headingSource?1:0),0);
}
assert.equal(totals.pages,72);
assert.ok(totals.groups>100 && totals.editableText>300 && totals.buttons>100 && totals.images>50 && totals.prices>10);
const cms=fs.readFileSync('.pages.yml','utf8');
assert.ok(!cms.includes('Section ID')&&!cms.includes('Original HTML')&&!cms.includes('editorContent'));
assert.ok(cms.includes('summary: "{heading}"') && cms.includes('name: priceValues'));
console.log('CMS validated:',JSON.stringify(totals));