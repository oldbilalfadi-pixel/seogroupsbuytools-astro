import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root='content';
const plain=(s)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const esc=(s)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let changed=0, sections=0;
for(const group of ['products','pages']){
  const dir=path.join(root,group);
  for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){
    const file=path.join(dir,name), page=JSON.parse(fs.readFileSync(file,'utf8'));
    if(typeof page.html!=='string') continue;
    page.slug ??= name.slice(0,-5);
    page.seoTitle ??= page.title||'';
    page.seoDescription ??= page.description||'';
    page.sections ??= [];
    if(!page.sections.length){
      // Preserve the original complete HTML. Each section stores its exact source
      // tag so editing is an opt-in replacement and untouched pages remain identical.
      const re=/<(h[1-6]|p|li)\b[^>]*>[\s\S]*?<\/\1>/gi;
      const matches=[...page.html.matchAll(re)];
      const counts=new Map();
      for(const m of matches){
        const tag=m[1].toLowerCase(),n=(counts.get(tag)||0)+1;counts.set(tag,n);
        const inner=m[0].replace(/^<[^>]+>/,'').replace(/<\/[^>]+>$/,'');
        if(!inner.trim() || /<(script|style|svg|iframe)\b/i.test(inner)) continue;
        page.sections.push({key:tag+'-'+n,label:tag.toUpperCase()+' '+n,content:inner,original:inner,source:m[0]});
      }
    }
    for(const s of page.sections){s.originalText ??= plain(s.original||s.content);s.text ??= s.originalText;}
    sections+=page.sections.length;
    fs.writeFileSync(file,JSON.stringify(page,null,2)+'\n');
    changed++;
  }
}
const homeFile=path.join(root,'homepage.json');
const home=JSON.parse(fs.readFileSync(homeFile,'utf8'));
home.slug ??= 'home';
home.seoTitle ??= home.title||'';
home.seoDescription ??= home.description||'';
home.sections ??= [];
if(!home.sections.length){
  const re=/<(h[1-6]|p|li)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const counts=new Map();
  for(const m of home.html.matchAll(re)){
    const tag=m[1].toLowerCase(),n=(counts.get(tag)||0)+1;counts.set(tag,n);
    const inner=m[0].replace(/^<[^>]+>/,'').replace(/<\/[^>]+>$/,'');
    if(inner.trim()&&!/<(script|style|svg|iframe)\b/i.test(inner))home.sections.push({key:tag+'-'+n,label:tag.toUpperCase()+' '+n,content:inner,original:inner,source:m[0]});
  }
}
for(const s of home.sections){s.originalText ??= plain(s.original||s.content);s.text ??= s.originalText;}
fs.writeFileSync(homeFile,JSON.stringify(home,null,2)+'\n');
console.log(JSON.stringify({pages:changed+1,sections:sections+home.sections.length}));
