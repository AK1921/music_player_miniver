(() => {
  const form = document.getElementById('studio-voice-settings');
  const list = document.getElementById('studio-voice-command-list');
  const status = document.getElementById('studio-voice-settings-status');
  const storageKey = 'ak_studio_voice_aliases';
  const common = {
    play: 'Play music', stop: 'Stop music', pause: 'Pause music', next: 'Next song',
    previous: 'Previous song', louder: 'Increase volume', quieter: 'Decrease volume',
    mute: 'Mute', unmute: 'Unmute', up: 'Scroll up', down: 'Scroll down'
  };
  const navigation = {
    online: 'Online music', downloaded: 'Downloads', playlists: 'Playlists', local: 'Local media', vault: 'Vault',
    settings: 'Settings', translator: 'Translator', calculator: 'Calculator', assistant: 'AI assistant',
    sync: 'Cloud sync', health: 'Library health'
  };
  const normalize = text => text.trim().toLowerCase().replace(/[.!?,]+$/, '').replace(/\s+/g, ' ');
  const fields = new Map();
  const commands = { ...common, ...navigation };
  let aliases = readBrowserData(storageKey, {});
  const defaultNavigation = new Map(Object.entries(navigation).map(([action, label]) => [normalize(label), action]));

  window.parseStudioVoiceCommand = raw => {
    const phrase = normalize(raw);
    const customList = typeof getCustomVoiceCommands === 'function' ? getCustomVoiceCommands() : [];
    const customMatch = customList.find(c => normalize(c.phrase) === phrase || phrase.includes(normalize(c.phrase)));
    if (customMatch) return { action: customMatch.action };

    const alias = Object.keys(commands).find(action => aliases?.[action] === phrase);
    if (alias) return { action: alias };
    const page = phrase.replace(/^(?:open|show|go to) (?:the )?/, '');
    if (defaultNavigation.has(page)) return { action: defaultNavigation.get(page) };
    return window.parseMusicCommand(raw);
  };

  Object.entries(commands).forEach(([action, label]) => {
    const row = document.createElement('label');
    row.className = 'studio-voice-command';
    const title = document.createElement('span');
    title.textContent = Object.hasOwn(navigation, action) ? 'Open ' + label : label;
    const input = document.createElement('input');
    input.className = 'form-input';
    input.maxLength = 60;
    input.type = 'text';
    input.placeholder = 'Custom phrase';
    input.value = typeof aliases?.[action] === 'string' ? aliases[action] : '';
    row.append(title, input);
    list.append(row);
    fields.set(action, input);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = {};
    const used = new Set();
    for (const [action, input] of fields) {
      const phrase = normalize(input.value);
      if (!phrase) continue;
      const defaultAction = defaultNavigation.get(phrase.replace(/^(?:open|show|go to) (?:the )?/, ''));
      const builtIn = window.parseMusicCommand(phrase).action;
      if (used.has(phrase) || (defaultAction && defaultAction !== action) ||
          (Object.hasOwn(common, builtIn) && builtIn !== action)) {
        status.textContent = 'That phrase already runs another command. Use a different phrase.';
        input.focus();
        return;
      }
      next[action] = phrase;
      used.add(phrase);
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      aliases = next;
      status.textContent = 'Voice commands saved in this browser.';
    } catch {
      status.textContent = 'Could not save voice commands. Check browser storage.';
    }
  });
})();
