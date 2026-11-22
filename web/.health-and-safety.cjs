const fs=require('node:fs');let a=fs.readFileSync('web/app.js','utf8').replace(/\r\n/g,'\n');
function r(x,y){if(!a.includes(x))throw Error(x);a=a.replace(x,()=>y);}
r("onclick=\"openPhotoLightbox('${escapeHtml(imgSrc)}', '${escapeHtml(file.name)}')\"",
"onclick=\"openPhotoLightbox(${escapeHtml(JSON.stringify(imgSrc))}, ${escapeHtml(JSON.stringify(file.name))})\"");
r("  if (!str) return '';\n  return str.replace(/&/g,", "  if (str == null) return '';\n  return String(str).replace(/&/g,");
const x=a.indexOf('function autoFixDuplicates()'),y=a.indexOf('function autoFixMissingArtwork',x);
if(x<0||y<0)throw Error('Missing health routines');
a=a.slice(0,x)+[
'async function autoFixDuplicates() {',
"  if (!crypto.subtle) { showVoiceToast('Audio comparison requires HTTPS or localhost.'); return; }",
'  const byDigest = new Map();',
'  const used = new Set(STATE.playlists.flatMap(playlistTrackIds));',
'  const ordered = [...STATE.downloadedTracks].sort((a, b) => Number(used.has(b.id)) - Number(used.has(a.id)));',
'  const duplicates = [];',
'  try {',
'    for (const item of ordered) {',
'      const source = mediaSource(offlineAudioTrack(item));',
'      if (!source) continue;',
'      const content = source instanceof Blob ? await source.arrayBuffer() : await (await fetch(source)).arrayBuffer();',
"      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', content))).join(',');",
'      if (byDigest.has(digest) && !used.has(item.id)) duplicates.push(item.id);',
'      else byDigest.set(digest, item.id);',
'    }',
"    if (!duplicates.length) { showVoiceToast('No identical, unreferenced downloads were found.'); return; }",
"    if (!confirm('Remove ' + duplicates.length + ' identical downloaded copies? One copy and tracks used in playlists will be kept.')) return;",
'    let removed = 0;',
'    for (const id of duplicates) { if (await removeDownloadFromDB(id)) removed++; }',
'    refreshOfflineLibrary();',
'    scanLibraryHealth();',
"    showVoiceToast('Removed ' + removed + ' duplicate downloads.');",
"  } catch { showVoiceToast('Could not compare all downloaded audio files.'); }",
'}','',''
].join('\n')+a.slice(y);
r("  const tracks = [...STATE.downloadedTracks, ...STATE.localFiles];","  const tracks = [...STATE.downloadedTracks, ...STATE.localFiles.filter(file => file.category === 'audio')];");
r("let missingArtwork = tracks.filter(t => !t.artwork || t.artwork.includes('placeholder')).length;",
"const missingArtwork = tracks.filter(t => !libraryCover(t.artwork || t.coverUrl) || (t.artwork || t.coverUrl).includes('placeholder')).length;");
r("if (seenTitles.has(key)) duplicates++;","if (key && seenTitles.has(key)) duplicates++;");
r("${duplicates} duplicates found","${duplicates} repeated titles");
r("  if (!currentSupabaseUser) { openSupabaseAccountModal(); return; }\n  void refreshCloudLibrary();","  if (!currentSupabaseUser) { closeModal('cross-sync-modal'); openSupabaseAccountModal(); return; }\n  void refreshCloudLibrary();");
fs.writeFileSync('web/app.js',a);

