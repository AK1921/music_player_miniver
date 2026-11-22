const fs=require('node:fs'),file='web/server.js';
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const x=s.indexOf('const DATA_DIR ='),y=s.indexOf('function fetchTranslation(',x);
if(x<0||y<0)throw Error('Missing old shared store');
s=s.slice(0,x)+"const CLOUD_TRANSLATION_KEY = process.env.GOOGLE_CLOUD_TRANSLATION_KEY?.trim();\n\n"+s.slice(y);
const a=s.indexOf('  // Cross-Browser Centralized Data Synchronization API'),b=s.indexOf('  fs.stat(filePath',a);
if(a<0||b<0)throw Error('Missing old sync endpoint');
s=s.slice(0,a)+[
"  if (pathname.startsWith('/api/') || pathname.startsWith('/vendor/')) {",
"    res.writeHead(404, { 'Content-Type': MIME_TYPES['.json'] }).end(JSON.stringify({ error: 'Unknown API endpoint.' }));",
"    return;",
"  }",
"  let reqUrl;",
"  try { reqUrl = pathname === '/' ? '/index.html' : decodeURIComponent(pathname); }",
"  catch { res.writeHead(400).end(); return; }",
"  const segments = reqUrl.split('/').filter(Boolean);",
"  if (reqUrl.includes('\\\\') || reqUrl.includes('\\0') || segments.some(part => part.startsWith('.')) || segments[0]?.toLowerCase() === 'data') {",
"    res.writeHead(404).end();",
"    return;",
"  }",
"  const filePath = path.resolve(PUBLIC_DIR, '.' + reqUrl);",
"  const relativePath = path.relative(PUBLIC_DIR, filePath);",
"  if (relativePath === '..' || relativePath.startsWith('..' + path.sep) || path.isAbsolute(relativePath)) {",
"    res.writeHead(404).end();",
"    return;",
"  }",
"",
].join('\n')+'\n'+s.slice(b);
s=s.replace('Private Vault: Master PIN 2003 or arif','Private Vault: local AES-GCM encryption');
fs.writeFileSync(file,s);

