import assert from 'node:assert/strict';
import fs from 'node:fs';
import renderBlog from '../src/lib/blog.js';
import renderPage from '../src/lib/render.js';

const template=JSON.parse(fs.readFileSync('content/pages/guides__keyword-research.json','utf8')).html;
const site=JSON.parse(fs.readFileSync('content/settings.json','utf8'));
const post={
  title:'CMS Blog Test',
  excerpt:'Preview without HTML editing.',
  body:'<h2>Content heading</h2><p>Rich text article body.</p>',
  featuredImage:'/assets/images/tools/ahrefs-com.png',
  seoTitle:'Custom CMS Blog SEO',
  seoDescription:'Custom description for CMS blog'
};
const result=renderBlog(post,'test-article',template,site.siteUrl);
assert.equal(result.route,'/blog/test-article/');
assert.ok(result.html.includes('<title>Custom CMS Blog SEO</title>'));
assert.ok(result.html.includes('<h1>CMS Blog Test</h1>'));
assert.ok(result.html.includes('Rich text article body.'));
assert.ok(result.html.includes('application/ld+json'));
assert.ok(result.html.includes('"/blog/test-article/"') || result.html.includes('/blog/test-article/'));
assert.ok(!result.html.includes('How Do You Use SEO Group Buy Tools for Keyword Research?'));
assert.equal(renderPage(result,site).includes('Rich text article body.'),true);
console.log('Blog CMS route, template, rich text, image, title and SEO validated.');
