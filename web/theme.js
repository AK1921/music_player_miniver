(() => {
  const names = {
    'frost-opal': 'Frost Opal',
    'nordic-slate': 'Nordic Slate',
    'champagne-gold': 'Champagne Ivory',
    'mint-emerald': 'Mint Emerald',
    'sakura-rose': 'Sakura Rose',
    'neon-cyberpunk': 'Neon Cyberpunk',
    'matrix-emerald': 'Matrix Emerald',
    'midnight-oled': 'Midnight OLED',
    'sunset-ember': 'Sunset Ember',
    'ice-glitch': 'Ice Glitch',
    'crimson-blood': 'Crimson Blood',
    custom: 'Custom palette',
  };
  const defaultColors = ['#5B45B4', '#087F78'];
  const root = document.documentElement;
  const form = document.getElementById('custom-theme-form');
  const fields = [...form.querySelectorAll('input')];
  const valid = color => /^#[0-9a-f]{6}$/i.test(color);

  function readColors() {
    try {
      const colors = JSON.parse(localStorage.getItem('ak_custom_theme'));
      if (Array.isArray(colors) && colors.length === 2 && colors.every(valid)) return colors;
    } catch { /* Recover from invalid stored colors. */ }
    return defaultColors;
  }

  function readableColor(hex) {
    let channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16));
    const linear = n => (n / 255 <= 0.04045 ? n / 3294.6 : ((n / 255 + 0.055) / 1.055) ** 2.4);
    const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    while (luminance(channels) > 0.13) channels = channels.map(channel => Math.floor(channel * 0.94));
    return `rgb(${channels.join(', ')})`;
  }

  window.setTheme = themeId => {
    themeId = Object.hasOwn(names, themeId) ? themeId : 'frost-opal';
    root.dataset.theme = themeId;
    localStorage.setItem('ak_web_theme', themeId);
    localStorage.removeItem('ak_color_palette');
    if (themeId === 'custom') {
      const [primary, accent] = readColors();
      root.style.setProperty('--custom-primary', primary);
      root.style.setProperty('--custom-accent', accent);
      root.style.setProperty('--custom-primary-ink', readableColor(primary));
      root.style.setProperty('--custom-accent-ink', readableColor(accent));
    }
    document.getElementById('current-theme-name').textContent = names[themeId];
    document.querySelectorAll('.palette-card').forEach(card => {
      card.classList.toggle('active', card.dataset.pal === themeId);
    });
    document.getElementById('theme-menu').classList.remove('show');
    document.getElementById('btn-theme-toggle').setAttribute('aria-expanded', 'false');
  };

  window.restoreWebTheme = () => {
    setTheme(localStorage.getItem('ak_color_palette') || localStorage.getItem('ak_web_theme'));
  };

  form.addEventListener('toggle', () => {
    if (!form.open) return;
    const colors = readColors();
    fields.forEach((field, index) => { field.value = colors[index]; });
  });
  form.querySelector('button').addEventListener('click', () => {
    const colors = fields.map(field => {
      const raw = field.value.trim();
      return raw.startsWith('#') ? raw : '#' + raw;
    });
    const invalid = colors.findIndex(color => !valid(color));
    if (invalid !== -1) {
      fields[invalid].setCustomValidity('Enter a six-digit hex code, such as #5B45B4.');
      fields[invalid].reportValidity();
      return;
    }
    localStorage.setItem('ak_custom_theme', JSON.stringify(colors));
    setTheme('custom');
    document.getElementById('btn-theme-toggle')?.focus();
  });
  fields.forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));
})();
