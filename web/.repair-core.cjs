const fs=require('node:fs'),file='web/app.js',original=fs.readFileSync(file,'utf8');
let a=original.replace(/\r\n/g,'\n');
function r(needle,replacement) {
 if(!a.includes(needle))throw Error(needle);
 a=a.replace(needle,()=>replacement);
}
function cut(start,end,replacement='') {
 const i=a.indexOf(start),j=a.indexOf(end,i+start.length);
 if(i<0||j<0)throw Error(start);a=a.slice(0,i)+replacement+a.slice(j);
}
r("  const file = STATE.localFiles.find(f => f.id === STATE.movingFileId);\n  if (!file) return;",
"  const file = STATE.localFiles.find(f => f.id === STATE.movingLocalFileId || f.id === STATE.movingFileId);\n  if (!file) return;\n  if (targetFolderId && !STATE.customFolders.some(folder => folder.id === targetFolderId &&\n      (folder.category === 'all' || folder.category === file.category))) {\n    showVoiceToast('Choose an available folder for this media type.');\n    return;\n  }");
r('  file.folderId = targetFolderId || null;\n\n  if (dbInstance) {\n    const tx = dbInstance.transaction(\'local_files\', \'readwrite\');\n    tx.objectStore(\'local_files\').put(file);',
"  if (dbInstance) {\n    const tx = dbInstance.transaction('local_files', 'readwrite');\n    tx.objectStore('local_files').put({ ...file, folderId: targetFolderId || null });\n    tx.onabort = () => showVoiceToast('Could not move the file.');");
r("  if (input) input.value = file.name;\n  openModal('edit-file-modal');",
"  if (input) input.value = file.name;\n  document.getElementById('edit-file-cover').value = '';\n  openModal('edit-file-modal');");
cut('async function saveFileRename() {','function deleteLocalFile(id) {',[
'async function saveFileRename(button) {',
"  const name = document.getElementById('edit-file-name-input').value.trim();",
"  if (!name) { showVoiceToast('Enter a file name.'); return; }",
'  const id = STATE.editingLocalFileId;',
'  button.disabled = true;',
'  try {',
"    const cover = await readLibraryCover(document.getElementById('edit-file-cover').files[0]);",
'    const file = STATE.localFiles.find(item => item.id === id);',
'    if (!file || STATE.editingLocalFileId !== id) return;',
'    if (file.cloudId) {',
'      const updates = { name, title: name };',
'      if (cover) updates.thumbnail_path = cover;',
'      if (!await updateCloudFile(file, updates)) return;',
'    } else {',
"      if (!dbInstance) throw new Error('Browser storage is unavailable.');",
'      await new Promise((resolve, reject) => {',
"        const tx = dbInstance.transaction('local_files', 'readwrite');",
"        tx.objectStore('local_files').put({ ...file, name, coverUrl: cover || file.coverUrl });",
'        tx.oncomplete = resolve;',
"        tx.onabort = () => reject(new Error('Could not update this file.'));",
'      });',
'      await loadLocalFiles();',
'    }',
"    closeModal('edit-file-modal');",
"    showVoiceToast('Media details saved.');",
'  } catch (error) {',
'    showVoiceToast(error.message);',
'  } finally {',
'    button.disabled = false;',
'  }',
'}','',''
].join('\n'));
r('f.id === STATE.movingLocalFileId || f.id === STATE.movingFileId','f.id === STATE.movingFileId');
const before="          <button class=\"icon-action-btn\" onclick=\"confirmDeleteDownload('${item.id}')\"";
r(before, [
"          <button type=\"button\" class=\"icon-action-btn\" onclick=\"openDownloadedMetadata('${item.id}')\" title=\"Edit audio details\" aria-label=\"Edit audio details\">",
"            <i class=\"fa-solid fa-pen\" aria-hidden=\"true\"></i>",
"          </button>",
before].join('\n'));
const vaultStart=a.indexOf('function lockAppWithFingerprintNow()');
const vaultEnd=a.indexOf('function resolveTrackById(',vaultStart);
if(vaultStart<0||vaultEnd<0||vaultEnd-vaultStart>10000)throw Error('Vault boundary');
a=a.slice(0,vaultStart)+a.slice(vaultEnd);
r("function switchTab(tab) {\n","function switchTab(tab) {\n  if (STATE.currentTab === 'vault' && tab !== 'vault') lockVault();\n");
r("  } else if (tab === 'online') {\n    renderOnlineCards(onlineTracksList);","  } else if (tab === 'vault') {\n    void updateVaultSetup();\n  } else if (tab === 'online') {\n    renderOnlineCards(onlineTracksList);");
r("  ['storage', 'palettes', 'security'].forEach","  ['storage', 'palettes', 'security', 'voice'].forEach");
cut('function toggleAppBiometricLock(enabled) {','// ==============================================================================', '');
r('  checkAppBiometricLockOnStartup();\n','');
const escapeLockStart=a.indexOf('    // 1. Close biometric lock if open');
const escapeLockEnd=a.indexOf('    // 2. Close video theater if open',escapeLockStart);
if(escapeLockStart>=0&&escapeLockEnd>=0)a=a.slice(0,escapeLockStart)+a.slice(escapeLockEnd);
cut('const VOICE_COMMANDS = {','function filterDownloaded(type) {',[
'function togglePersistentMic() {',
'  window.toggleMusicVoice();',
'}','',''
].join('\n'));
fs.writeFileSync(file,a);

