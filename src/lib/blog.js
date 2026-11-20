// Build new CMS blog entries using the existing two-level guide page design.
// Existing pages and their HTML are never changed.
const escapeText = v => String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escapeAttr = v => escapeText(v).replace(/"/g,'&quot;');
function meta(html,name,value,kind='name') {
  const re = new RegExp('(<meta\\s+'+kind+'="'+name+'"\\s+content=")[^"]*(")', 'i');
  return html.replace(re,(_,a,b)=>a+escapeAttr(value)+b);
}
export function renderBlog(post,slug,template,siteUrl='https://seogroupsbuytools.com') {
  if(!post || typeof post!=='object' || !template)throw new Error('Missing post or existing site template');
  const route='/blog/'+encodeURIComponent(slug)+'/';
  const title=String(post.title||slug.replace(/-/g,' '));
  const seoTitle=String(post.seoTitle||title+' | SEO Group Buy Tools');
  const description=String(post.seoDescription||post.excerpt||'');
  const canonical=siteUrl.replace(/\/$/,'')+route;
  let html=template.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+escapeText(seoTitle)+'</title>');
  for(const [kind,key,value] of [
    ['name','description',description],['property','og:title',seoTitle],['property','og:description',description],
    ['property','og:url',canonical],['name','twitter:title',seoTitle],['name','twitter:description',description]
  ])html=meta(html,key,value,kind);
  html=html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i,(_,a,b)=>a+escapeAttr(canonical)+b);
  html=html.replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/i,(_,a,b)=>a+'article'+b);
  html=html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i,'<h1>'+escapeText(title)+'</h1>');
  const excerpt=post.excerpt?'<p class="answer-snippet">'+escapeText(post.excerpt)+'</p>':'';
  const image=post.featuredImage?'<figure><img loading="lazy" alt="'+escapeAttr(title)+'" src="'+escapeAttr(post.featuredImage)+'" style="max-width:100%;height:auto"></figure>':'';
  const article='<main class="main-content content-article" role="main"><article class="content-section">'+excerpt+image+'<div class="article-body">'+String(post.body||'')+'</div></article></main>';
  html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i,article);
  // Existing source page's structured data describes keyword research, not this new post.
  html=html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,'');
  const schema=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:title,description,url:canonical,image:post.featuredImage||undefined});
  html=html.replace('</head>','<script type="application/ld+json">'+schema.replace(/</g,'\\u003c')+'</script></head>');
  return {route,title:seoTitle,description,html,seoTitle,seoDescription:description,originalSeoTitle:seoTitle,originalSeoDescription:description,isBlog:true};
}
export default renderBlog;
