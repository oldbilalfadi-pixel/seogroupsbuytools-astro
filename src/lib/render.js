// Pure, deterministic renderer for Pages CMS data; no HTML is rewritten unless a field changed.
const text = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const attr = s => text(s).replace(/"/g,'&quot;');
function innerReplace(source,value) {
  const start=source.indexOf('>')+1,end=source.lastIndexOf('</');
  if (start<1 || end<start) return source;
  return source.slice(0,start)+text(value)+source.slice(end);
}
function replaceOriginal(html, source, replacement) {
  if (!source || !html.includes(source)) return html;
  return html.replace(source,replacement);
}
function seoMeta(html,name,value,kind='name') {
  const re=new RegExp('(<meta\\s+'+kind+'="'+name+'"\\s+content=")[^"]*(")', 'i');
  return html.replace(re, (_,a,b)=>a+attr(value)+b);
}
export function renderPage(page) {
  let html=page.html;
  if (typeof page.title === 'string' && page.originalPageTitle !== undefined && page.title!==page.originalPageTitle) {
    html=html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i,m=>innerReplace(m,page.title));
  }
  for(const group of page.contentGroups||[]) {
    if (group.headingSource && typeof group.heading==='string' && group.heading!==group.originalHeading)
      html=replaceOriginal(html,group.headingSource,innerReplace(group.headingSource,group.heading));
    for(const item of group.items||[]) {
      if (!item.source || typeof item.text!=='string' || item.text===item.originalText) continue;
      html=replaceOriginal(html,item.source,innerReplace(item.source,item.text));
    }
  }
  for(const price of page.priceValues||[]) {
    if (!price.source || price.value===price.originalValue) continue;
    html=replaceOriginal(html,price.source,innerReplace(price.source,price.value));
  }
  for(const link of page.buttons||[]) {
    if (!link.source || (link.text===link.originalText && link.url===link.originalUrl)) continue;
    let updated=link.source;
    if(link.url!==link.originalUrl) updated=updated.replace('href="'+link.originalUrl+'"','href="'+attr(link.url)+'"');
    if(link.text!==link.originalText) updated=innerReplace(updated,link.text);
    html=replaceOriginal(html,link.source,updated);
  }
  for(const image of page.mediaImages||[]) {
    if (!image.source || (image.src===image.originalSrc && image.alt===image.originalAlt)) continue;
    let updated=image.source;
    if(image.src!==image.originalSrc) updated=updated.replace('src="'+image.originalSrc+'"','src="'+attr(image.src)+'"');
    if(image.alt!==image.originalAlt) {
      if(updated.includes('alt="')) updated=updated.replace('alt="'+image.originalAlt+'"','alt="'+attr(image.alt)+'"');
      else updated=updated.replace(/\/?>$/,m=>' alt="'+attr(image.alt)+'"'+m);
    }
    html=replaceOriginal(html,image.source,updated);
  }
  if (page.seoTitle && page.seoTitle!==page.originalSeoTitle && page.seoTitle!==page.title) {
    html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+text(page.seoTitle)+'</title>');
    html=seoMeta(html,'og:title',page.seoTitle,'property');
    html=seoMeta(html,'twitter:title',page.seoTitle);
  }
  if (page.seoDescription && page.seoDescription!==page.originalSeoDescription && page.seoDescription!==page.description) {
    html=seoMeta(html,'description',page.seoDescription);
    html=seoMeta(html,'og:description',page.seoDescription,'property');
    html=seoMeta(html,'twitter:description',page.seoDescription);
  }
  if (page.route==='/' && page.hero) {
    const original=page.originalHero||{};
    const hero=page.hero;
    const changed=Object.keys(hero).some(key=>hero[key]!==original[key]);
    if(changed && Object.keys(original).length) {
      const heading=text(hero.headingBefore)+'<span class="hero-highlight">'+text(hero.headingHighlight)+'</span>'+text(hero.headingAfter);
      html=html.replace(/(<h1>)[\s\S]*?(<\/h1>)/i,(_,a,b)=>a+heading+b);
      html=html.replace(/(<p class="hero-live-desc">)[\s\S]*?(<\/p>)/i,(_,a,b)=>a+text(hero.description)+b);
    }
  }
  return html;
}
export default renderPage;
