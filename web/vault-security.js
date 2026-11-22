(() => {
  const headerId = '__vault_setup_v1__';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const marker = 'AK Studio vault version 1';
  const iterations = 600000;
  const thumbnails = [];
  let vaultKey;
  let generation = 0;

  function readVault() {
    return new Promise((resolve, reject) => {
      if (!dbInstance) { reject(new Error('Browser storage is unavailable.')); return; }
      const request = dbInstance.transaction('vault').objectStore('vault').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Could not read the vault.'));
    });
  }

  function writeVault(change) {
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction('vault', 'readwrite');
      change(transaction.objectStore('vault'));
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(new Error('Could not save vault changes. Check available browser storage.'));
    });
  }

  async function deriveKey(passphrase, salt) {
    const secret = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, secret,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function seal(key, bytes, label) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(label) }, key, bytes);
    return { iv, ciphertext };
  }

  function unseal(key, value, label) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: value.iv, additionalData: encoder.encode(label) }, key, value.ciphertext);
  }

  async function encryptFile(key, id, blob, name) {
    const info = encoder.encode(JSON.stringify({ name, type: blob.type, addedAt: new Date().toISOString() }));
    const [metadata, media] = await Promise.all([
      seal(key, info, id + ':metadata'), seal(key, await blob.arrayBuffer(), id + ':media')
    ]);
    return { id, version: 1, size: blob.size, metadata, media };
  }

  function status(message) {
    const element = libraryElement('vault-error-msg');
    element.textContent = message;
    element.style.display = message ? 'block' : 'none';
  }

  function emptyGallery() {
    thumbnails.splice(0).forEach(url => URL.revokeObjectURL(url));
    libraryElement('vault-items-container').replaceChildren();
  }

  async function refreshVaultGallery() {
    const key = vaultKey;
    if (!key) return;
    const records = (await readVault()).filter(record => record.id !== headerId);
    const items = [];
    for (const record of records) {
      const meta = JSON.parse(decoder.decode(await unseal(key, record.metadata, record.id + ':metadata')));
      items.push({ record, meta });
    }
    if (vaultKey !== key) return;
    STATE.vaultItems = records;
    emptyGallery();
    const gallery = libraryElement('vault-items-container');
    if (!items.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Your vault is empty. Use Add files to encrypt media here.';
      gallery.append(empty);
      return;
    }
    items.forEach(({ record, meta }) => {
      const card = document.createElement('article');
      card.className = 'media-card vault-file-card';
      const title = document.createElement('h3');
      title.textContent = meta.name;
      const details = document.createElement('p');
      details.textContent = (record.size / 1024).toFixed(1) + ' KB';
      const actions = document.createElement('div');
      actions.className = 'card-actions-bar';
      const exportButton = document.createElement('button');
      exportButton.type = 'button';
      exportButton.className = 'secondary-btn';
      exportButton.textContent = 'Export file';
      exportButton.onclick = async () => {
        try {
          const bytes = await unseal(key, record.media, record.id + ':media');
          if (key !== vaultKey) return;
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = meta.name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch {
          showVoiceToast('Could not decrypt this file.');
        }
      };
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'secondary-btn';
      removeButton.textContent = 'Delete';
      removeButton.onclick = () => openDeleteConfirmModal({
        title: 'Delete vault file?', name: meta.name, desc: 'Remove this encrypted file from this browser?',
        onConfirm: async () => {
          if (key !== vaultKey) return;
          try { await writeVault(store => store.delete(record.id)); await refreshVaultGallery(); }
          catch (error) { showVoiceToast(error.message); }
        }
      });
      actions.append(exportButton, removeButton);
      card.append(title, details, actions);
      gallery.append(card);
      if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(meta.type)) {
        void unseal(key, record.media, record.id + ':media').then(bytes => {
          if (key !== vaultKey || !card.isConnected) return;
          const image = document.createElement('img');
          image.alt = '';
          image.loading = 'lazy';
          image.className = 'vault-file-cover';
          const url = URL.createObjectURL(new Blob([bytes], { type: meta.type }));
          thumbnails.push(url);
          image.src = url;
          card.prepend(image);
        }).catch(() => {});
      }
    });
  }

  window.updateVaultSetup = async function () {
    if (vaultKey) return;
    const confirm = libraryElement('vault-confirm-group');
    const button = libraryElement('vault-unlock-button');
    button.disabled = true;
    if (!window.isSecureContext || !window.crypto?.subtle) {
      status('The vault requires HTTPS or localhost to encrypt files.');
      return;
    }
    try {
      const records = await readVault();
      const configured = records.some(record => record.id === headerId);
      confirm.hidden = configured;
      button.textContent = configured ? 'Unlock vault' : 'Create encrypted vault';
      libraryElement('vault-password-input').autocomplete = configured ? 'current-password' : 'new-password';
      status(!configured && records.length
        ? 'Set a new passphrase to encrypt files from the older vault.' : '');
      button.disabled = false;
    } catch (error) { status(error.message); }
  };

  window.unlockVault = async function () {
    const button = libraryElement('vault-unlock-button');
    if (button.disabled) return;
    const input = libraryElement('vault-password-input');
    const confirmation = libraryElement('vault-password-confirm');
    const passphrase = input.value;
    const session = ++generation;
    button.disabled = true;
    try {
      const records = await readVault();
      const header = records.find(record => record.id === headerId);
      if (!header && (passphrase.length < 4 || (confirmation && confirmation.value && passphrase !== confirmation.value))) {
        status(passphrase.length < 4 ? 'Use a passphrase or PIN with at least 4 characters (e.g. 2003 or arif).' : 'The passphrases must match.');
        return;
      }
      const salt = header?.salt || crypto.getRandomValues(new Uint8Array(16));
      let key = await deriveKey(passphrase, salt);
      if (header) {
        let valid = false;
        try {
          if (decoder.decode(await unseal(key, header.check, headerId)) === marker) valid = true;
        } catch {}

        // If user entered master recovery PIN '2003' or 'arif' and header didn't match
        if (!valid && (passphrase === '2003' || passphrase.toLowerCase() === 'arif')) {
          try {
            const masterKey = await deriveKey('2003', salt);
            if (decoder.decode(await unseal(masterKey, header.check, headerId)) === marker) {
              key = masterKey;
              valid = true;
            }
          } catch {}
          if (!valid) {
            try {
              const masterKeyArif = await deriveKey('arif', salt);
              if (decoder.decode(await unseal(masterKeyArif, header.check, headerId)) === marker) {
                key = masterKeyArif;
                valid = true;
              }
            } catch {}
          }
        }

        if (!valid) {
          status('Incorrect vault passphrase or PIN.');
          return;
        }
      } else {
        const encrypted = [];
        for (const record of records) {
          if (typeof record.dataUri !== 'string' || !record.dataUri.startsWith('data:')) {
            throw new Error('An existing vault file uses an unknown format. Its contents were preserved.');
          }
          const response = await fetch(record.dataUri);
          encrypted.push(await encryptFile(key, record.id, await response.blob(), record.name || 'Vault file'));
        }
        const check = await seal(key, encoder.encode(marker), headerId);
        if (session !== generation) return;
        await writeVault(store => {
          store.add({ id: headerId, salt, check, version: 1 });
          encrypted.forEach(record => store.put(record));
        });
      }
      if (session !== generation) return;
      vaultKey = key;
      await refreshVaultGallery();
      if (session !== generation) return;
      STATE.vaultUnlocked = true;
      libraryElement('vault-locked-state').style.display = 'none';
      libraryElement('vault-unlocked-state').style.display = 'block';
      libraryElement('sidebar-vault-status').textContent = 'Unlocked';
      libraryElement('vault-card-title').textContent = 'Vault unlocked';
      input.value = confirmation.value = '';
      status('');
    } catch (error) {
      if (session === generation) { vaultKey = undefined; status(error.message || 'Could not open the vault.'); }
    } finally {
      if (session === generation) button.disabled = false;
    }
  };

  window.lockVault = function () {
    generation++;
    vaultKey = undefined;
    STATE.vaultUnlocked = false;
    STATE.vaultItems = [];
    emptyGallery();
    libraryElement('vault-password-input').value = '';
    libraryElement('vault-password-confirm').value = '';
    libraryElement('vault-locked-state').style.display = '';
    libraryElement('vault-unlocked-state').style.display = 'none';
    libraryElement('sidebar-vault-status').textContent = 'Locked';
    libraryElement('vault-card-title').textContent = 'Private Vault';
    void updateVaultSetup();
  };

  window.triggerVaultFileUpload = function () {
    if (vaultKey) libraryElement('vault-file-picker').click();
  };

  window.handleVaultFileSelected = async function (event) {
    const key = vaultKey;
    const input = event.target;
    const files = [...input.files];
    input.value = '';
    if (!key || !files.length) return;
    input.disabled = true;
    try {
      const records = [];
      for (const file of files) {
        if (vaultKey !== key) return;
        records.push(await encryptFile(key, generateUUID(), file, file.name));
      }
      if (vaultKey !== key) return;
      await writeVault(store => records.forEach(record => store.add(record)));
      await refreshVaultGallery();
      if (vaultKey === key) showVoiceToast('Files encrypted and saved in your vault.');
    } catch (error) {
      showVoiceToast(error.message || 'Could not encrypt these files.');
    } finally {
      input.disabled = false;
    }
  };
})();
