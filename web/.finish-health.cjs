const fs=require('node:fs');let a=fs.readFileSync('web/app.js','utf8').replace(/\r\n/g,'\n');
const first=a.indexOf('function autoFixMissingArtwork()'),last=a.indexOf('// ==============================================================================',first);
if(first<0||last<0)throw Error('Missing health functions');
a=a.slice(0,first)+[
'async function updateDownloadDetails(transform, summary) {',
'  let saved = 0;',
'  for (const original of [...STATE.downloadedTracks]) {',
'    const current = STATE.downloadedTracks.find(track => track.id === original.id);',
'    const updated = current && transform(current);',
'    if (updated && await saveDownloadToDB(updated)) saved++;',
'  }',
'  refreshOfflineLibrary();',
'  scanLibraryHealth();',
'  showVoiceToast(summary(saved));',
'}','',
'function autoFixMissingArtwork() {',
'  void updateDownloadDetails(track => {',
"    const cover = libraryCover(track.artwork);",
"    if (cover && !cover.includes('placeholder')) return null;",
'    return { ...track, artwork: offlineArtwork };',
"  }, count => 'Added default artwork to ' + count + ' download(s).');",
'}','',
'function autoFixMetadata() {',
'  void updateDownloadDetails(track => {',
"    const currentTitle = String(track.title || track.fileName || '');",
"    const title = currentTitle.replace(/_/g, ' ').replace(/\\.(mp3|mp4|wav|m4a)$/i, '')",
"      .replace(/\\b(?:320kbps|1080p)\\b/gi, '').replace(/\\s+/g, ' ').trim();",
'    return title && title !== currentTitle ? { ...track, title } : null;',
"  }, count => 'Cleaned ' + count + ' downloaded title(s).');",
'}','','',
].join('\n')+a.slice(last);
fs.writeFileSync('web/app.js',a);

