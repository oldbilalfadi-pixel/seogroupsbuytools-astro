import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root='content';
const plain=(s)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const esc=(s)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function buildEditor(page) {
  const html=page.html;
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  const re=/<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const out=[];
  for(const m of main.matchAll(re)){
    const value=plain(m[2]);
    if(!value || value.length>3000 || /<(script|style|svg|iframe)\b/i.test(m[2]))continue;
    if(out.some(x=>x.source===m[0]))continue;
    out.push({text:value,originalText:value,source:m[0],tag:m[1].toLowerCase()});
  }
  page.editorContent=out;
  page.links=[...main.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>!/<[a-z]/i.test(m[2]) && plain(m[2])).map(m=>({url:m[1],originalUrl:m[1],text:plain(m[2]),originalText:plain(m[2]),source:m[0]}));
  page.images=[...main.matchAll(/<img\b[^>]*>/gi)].map(m=>({source:m[0],src:m[0].match(/\bsrc="([^"]*)"/i)?.[1]||'',originalSrc:m[0].match(/\bsrc="([^"]*)"/i)?.[1]||'',alt:m[0].match(/\balt="([^"]*)"/i)?.[1]||'',originalAlt:m[0].match(/\balt="([^"]*)"/i)?.[1]||''}));
}

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
    page.links ??= [...page.html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>!/<[a-z]/i.test(m[2])).map((m,i)=>({url:m[1],originalUrl:m[1],text:plain(m[2]),originalText:plain(m[2]),source:m[0]}));
    page.images ??= [...page.html.matchAll(/<img\b[^>]*>/gi)].map(m=>({source:m[0],src:m[0].match(/\bsrc="([^"]*)"/i)?.[1]||'',originalSrc:m[0].match(/\bsrc="([^"]*)"/i)?.[1]||'',alt:m[0].match(/\balt="([^"]*)"/i)?.[1]||'',originalAlt:m[0].match(/\balt="([^"]*)"/i)?.[1]||''}));
    buildEditor(page);
    sections+=page.editorContent.length;
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
home.links ??= [...home.html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>!/<[a-z]/i.test(m[2])).map(m=>({url:m[1],originalUrl:m[1],text:plain(m[2]),originalText:plain(m[2]),source:m[0]}));
home.images ??= [...home.html.matchAll(/<img\b[^>]*>/gi)].map(m=>({source:m[0],src:m[0].match(/\bsrc="([^"]*)"/i)?.[1]||'',originalSrc:m[0].match(/\bsrc="([^"]*)"/i)?.[1]||'',alt:m[0].match(/\balt="([^"]*)"/i)?.[1]||'',originalAlt:m[0].match(/\balt="([^"]*)"/i)?.[1]||''}));
buildEditor(home);
fs.writeFileSync(homeFile,JSON.stringify(home,null,2)+'\n');
console.log(JSON.stringify({pages:changed+1,sections:sections+home.sections.length}));
