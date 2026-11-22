const fs=require('node:fs'),file='web/index.html',raw=fs.readFileSync(file,'utf8');let h=raw.replace(/\r\n/g,'\n');
function r(a,b){if(!(typeof a==='string'?h.includes(a):a.test(h)))throw Error('Missing '+a);h=h.replace(a,()=>b);}
function section(first,last,value){const a=h.indexOf(first),b=h.indexOf(last,a+first.length);if(a<0||b<0)throw Error(first);h=h.slice(0,a)+value+h.slice(b);}
r('            <li>\n              <a class="nav-link" id="nav-settings"',[
'            <li><a class="nav-link" href="#translator" onclick="openTranslationModal(); return false"><span class="nav-icon"><i class="fa-solid fa-language" aria-hidden="true"></i></span><span>Translator</span></a></li>',
'            <li><a class="nav-link" href="#calculator" onclick="openCalculatorModal(); return false"><span class="nav-icon"><i class="fa-solid fa-calculator" aria-hidden="true"></i></span><span>Calculator</span></a></li>',
'            <li>',
'              <a class="nav-link" id="nav-settings"'
].join('\n'));
section('          <!-- Tab 3: App Security','        <div class="modal-actions-footer">',[
'          <div id="settings-tab-security" class="settings-tab-content" style="display: none;">',
'            <h3>App security</h3>',
'            <p>Fingerprint-only unlock is unavailable in the web app. Browsers let the device choose the verification method.</p>',
'            <button type="button" class="secondary-btn" onclick="closeModal(\'settings-modal\'); switchTab(\'vault\')">Open encrypted vault</button>',
'          </div>',
'          <div id="settings-tab-voice" class="settings-tab-content" style="display: none;">',
'            <h3>Voice commands</h3>',
'            <p>Use the search microphone for these commands. Add a phrase beside any command to use your own wording.</p>',
'            <form id="studio-voice-settings">',
'              <div id="studio-voice-command-list"></div>',
'              <button type="submit" class="primary-btn">Save commands</button>',
'              <p id="studio-voice-settings-status" role="status"></p>',
'            </form>',
'          </div>',
'        </div>',
''
].join('\n'));
r('            </button>\n          </div>\n\n          <!-- Tab 1:',[
'            </button>',
'            <button type="button" class="settings-tab-btn" id="tab-btn-voice" onclick="switchSettingsTab(\'voice\')">',
'              <i class="fa-solid fa-microphone" aria-hidden="true"></i> Voice commands',
'            </button>',
'          </div>','','          <!-- Tab 1:'
].join('\n'));
section('    <!-- 16. APP-WIDE BIOMETRIC / FINGERPRINT LOCK OVERLAY SCREEN -->','    <!-- 17.','');
const start=h.indexOf('              <p class="hero-sub"',h.indexOf('id="vault-locked-state"'));
const end=h.indexOf('id="vault-error-msg"',start);
const error=h.lastIndexOf('<',end);
if(start<0||end<0||error<0)throw Error('Vault form boundary missing');
h=h.slice(0,start)+[
'              <p class="hero-sub">Protect files in this browser with a vault passphrase.</p>',
'              <form class="vault-passphrase-form" onsubmit="event.preventDefault(); unlockVault()">',
'                <label class="form-label" for="vault-password-input">Vault passphrase</label>',
'                <input type="password" class="form-input" id="vault-password-input" required autocomplete="current-password">',
'                <div id="vault-confirm-group" hidden>',
'                  <label class="form-label" for="vault-password-confirm">Confirm new passphrase</label>',
'                  <input type="password" class="form-input" id="vault-password-confirm" autocomplete="new-password">',
'                </div>',
'                <button type="submit" class="primary-btn" id="vault-unlock-button" disabled>Unlock vault</button>',
'              </form>',
'              '
].join('\n')+h.slice(error);
r('    <script src="library-controls.js?v=1"></script>','    <script src="library-controls.js?v=1"></script>\n    <script src="vault-security.js?v=1"></script>');
r('    <script src="translator.js"></script>','    <script src="translator.js"></script>\n    <script src="music-command-parser.js"></script>\n    <script src="voice-settings.js?v=1"></script>\n    <script src="music-voice.js?v=1"></script>');
fs.writeFileSync(file,raw.includes('\r\n')?h.replace(/\n/g,'\r\n'):h);

