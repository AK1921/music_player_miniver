(() => {
  const editor = document.getElementById('custom-palette-editor');
  const modal = editor.closest('.modal-overlay');
  const form = editor.querySelector('form');
  const preview = editor.querySelector('#palette-preview');
  const paste = form.querySelector('#custom-palette-paste-input');
  const footer = modal.querySelector('#palette-footer');
  const status = footer.querySelector('#custom-palette-status');
  const actions = footer.querySelector('[data-palette-actions]');
  const confirmation = footer.querySelector('[data-palette-confirmation]');
  const confirmationText = footer.querySelector('#palette-confirmation-text');
  const applyButton = footer.querySelector('[data-palette-action="apply"]');
  const confirmButton = footer.querySelector('[data-palette-confirm]');
  const fields = [...form.querySelectorAll('[data-palette-field]')].map(element => ({
    role: element.dataset.paletteField,
    hex: element.querySelector('input[type="text"]'),
    picker: element.querySelector('input[type="color"]')
  }));
  const sidebarField = fields.find(field => field.role === 'sidebar');
  let reviewedPalette;
  let requestedAction;
  let draft;
  let draftEdited;

  function clearReview() {
    reviewedPalette = undefined;
    requestedAction = undefined;
    confirmation.hidden = true;
    actions.hidden = false;
  }

  function setDraft(colors, message = '', edited = false) {
    draft = normalizeCustomPalette(colors);
    draftEdited = edited;
    for (const { role, hex, picker } of fields) {
      hex.value = picker.value = draft[role] ?? getPaletteSidebarColor(draft);
      hex.removeAttribute('aria-invalid');
    }
    writeCustomPaletteTokens(preview, draft);
    clearReview();
    status.textContent = message;
  }

  function resetToSaved(message = '') {
    paste.value = '';
    paste.removeAttribute('aria-invalid');
    setDraft(getSavedCustomPalette(), message);
  }

  function readPastedColors(text) {
    const value = text.match(/coolors\.co\/(?:palette\/)?([^?#\s]+)/i)?.[1]?.replaceAll('-', ' ') || text;
    const matches = [...value.matchAll(/(?:^|[^\w#])(#?(?:[0-9a-f]{6}|[0-9a-f]{3}))(?!\w)/gi)];
    if (!matches.length) return null;
    const [primary, accent, background, card, sidebar] = matches.slice(0, 5).map(match => normalizePaletteHex(match[1]));
    const bg = background || (isColorDark(primary) ? CUSTOM_PALETTE_DEFAULTS.bg : '#F8FAFC');
    return {
      primary,
      accent: accent || CUSTOM_PALETTE_DEFAULTS.accent,
      bg,
      surface: card || adjustColorBrightness(bg, isColorDark(bg) ? 10 : -6),
      sidebar
    };
  }

  function loadPaste(reportError) {
    const parsed = readPastedColors(paste.value.trim());
    if (!parsed) {
      if (reportError) {
        paste.setAttribute('aria-invalid', 'true');
        status.textContent = 'Enter hex colors such as #6366F1 or a Coolors link.';
        paste.focus();
      }
      return false;
    }
    paste.removeAttribute('aria-invalid');
    setDraft(parsed, reportError ? 'Colors loaded into the preview.' : '', true);
    if (reportError) paste.value = '';
    return true;
  }

  paste.addEventListener('input', () => {
    draftEdited = true;
    paste.removeAttribute('aria-invalid');
    clearReview();
    status.textContent = '';
    loadPaste(false);
  });
  form.querySelector('[data-palette-load]').addEventListener('click', () => loadPaste(true));

  for (const { role, hex, picker } of fields) {
    const update = value => {
      draftEdited = true;
      paste.value = '';
      paste.removeAttribute('aria-invalid');
      status.textContent = '';
      clearReview();
      const color = normalizePaletteHex(value);
      if (!color) return;
      draft[role] = color;
      picker.value = color;
      hex.removeAttribute('aria-invalid');
      if (role === 'bg' && !draft.sidebar && sidebarField) {
        sidebarField.hex.value = sidebarField.picker.value = getPaletteSidebarColor(draft);
      }
      writeCustomPaletteTokens(preview, draft);
    };
    hex.addEventListener('input', () => update(hex.value));
    picker.addEventListener('input', () => {
      hex.value = picker.value.toUpperCase();
      update(hex.value);
    });
  }

  form.querySelector('[data-palette-sidebar-auto]').addEventListener('click', () => {
    paste.value = '';
    paste.removeAttribute('aria-invalid');
    draftEdited = true;
    delete draft.sidebar;
    sidebarField.hex.value = sidebarField.picker.value = getPaletteSidebarColor(draft);
    sidebarField.hex.removeAttribute('aria-invalid');
    clearReview();
    writeCustomPaletteTokens(preview, draft);
    status.textContent = 'Sidebar now follows the background color.';
  });

  form.querySelectorAll('[data-palette-preset]').forEach(button => {
    button.addEventListener('click', () => {
      paste.value = '';
      paste.removeAttribute('aria-invalid');
      setDraft(readPastedColors(button.dataset.palettePreset), button.textContent + ' loaded into the preview.', true);
    });
  });
  form.querySelector('[data-palette-discard]').addEventListener('click', () => resetToSaved('Draft discarded.'));
  form.querySelector('[data-palette-reset]').addEventListener('click', () => {
    paste.value = '';
    paste.removeAttribute('aria-invalid');
    setDraft(CUSTOM_PALETTE_DEFAULTS, 'Defaults loaded into the preview.', true);
  });

  modal.addEventListener('click', event => {
    if (event.target.closest('.palette-card[data-pal]')) resetToSaved('Preset theme applied to Studio.');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const action = event.submitter || applyButton;
    if (action.dataset.paletteAction === 'exit' && !draftEdited) {
      closeModal('settings-modal');
      return;
    }
    if (paste.value.trim() && !loadPaste(true)) return;
    for (const { hex } of fields) {
      if (normalizePaletteHex(hex.value)) continue;
      hex.setAttribute('aria-invalid', 'true');
      status.textContent = 'Enter a three- or six-digit hex color.';
      hex.focus();
      return;
    }
    reviewedPalette = { ...draft };
    requestedAction = action;
    const exit = requestedAction.dataset.paletteAction === 'exit';
    confirmationText.textContent = exit
      ? 'Apply this theme, save it, and close Settings?'
      : 'Apply and save this theme across Studio?';
    confirmButton.textContent = exit ? 'Confirm & exit' : 'Apply and save';
    actions.hidden = true;
    confirmation.hidden = false;
    status.textContent = '';
    confirmButton.focus();
  });
  footer.querySelector('[data-palette-keep-editing]').addEventListener('click', () => {
    const action = requestedAction;
    clearReview();
    action?.focus();
  });
  confirmButton.addEventListener('click', () => {
    if (!reviewedPalette) return;
    const exit = requestedAction.dataset.paletteAction === 'exit';
    try {
      applyCustomPalette(reviewedPalette);
    } catch {
      status.textContent = 'Could not save the theme. Check that browser storage is available and try again.';
      return;
    }
    resetToSaved('Palette applied to Studio.');
    if (exit) closeModal('settings-modal');
    else applyButton.focus();
  });

  const sampleCards = preview.querySelector('[data-palette-cards]');
  for (const category of ['hindi', 'telugu']) {
    const track = REAL_SONGS_CATALOG.find(item => item.category === category && item.artwork);
    if (!track) continue;
    const card = document.createElement('div');
    card.className = 'palette-preview-card';
    card.dataset.paletteArea = 'surface';
    const cover = document.createElement('div');
    cover.className = 'palette-preview-cover';
    const image = document.createElement('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = '';
    image.addEventListener('error', () => { image.hidden = true; });
    image.src = track.artwork;
    cover.append(image);
    const title = document.createElement('strong');
    title.textContent = track.title;
    title.title = track.title;
    card.append(cover, title);
    sampleCards.append(card);
  }

  new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'class') && modal.classList.contains('show')) {
      resetToSaved();
    } else if (modal.dataset.settingsTab !== 'palettes') {
      clearReview();
    }
  }).observe(modal, { attributes: true, attributeFilter: ['class', 'data-settings-tab'] });
  resetToSaved();
})();
