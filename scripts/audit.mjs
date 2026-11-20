import fs from 'node:fs';import path from 'node:path';
const routes=JSON.parse(fs.readFileSync('migration/url-map.json'));
let missing=[];for(const r of routes){const file=r.route==='/'?'dist/index.html':`dist/${r.route.slice(1)}index.html`;if(r.route!='/404/'&&!fs.existsSync(file))missing.push(r.route)}
console.log(JSON.stringify({expected:routes.length-1,missing},null,2));if(missing.length)process.exitCode=1;
