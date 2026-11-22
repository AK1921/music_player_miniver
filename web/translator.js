const GOOGLE_TRANSLATE_STUDIO = (() => {
  const byId = id => document.getElementById(id);
  const modal = byId('translation-modal');
  const source = byId('trans-source-lang');
  const target = byId('trans-target-lang');
  const input = byId('trans-source-text');
  const output = byId('trans-output-text');
  const locale = {
    en: 'en-US', te: 'te-IN', ml: 'ml-IN', hi: 'hi-IN', ta: 'ta-IN', kn: 'kn-IN',
    bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN', ur: 'ur-PK', zh: 'zh-CN',
    es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR', ar: 'ar-SA'
  };
  let mode = 'text';
  let autoDetect = false;
  let result;
  let request;
  let recognition;
  let playback;
  let timer;

  const status = message => { byId(mode === 'live' ? 'trans-live-status-text' : 'trans-status-tag').textContent = message; };
  const languageName = code => [...target.options].find(option => option.value === code)?.label.split(' (')[0] || code;
  const sourceLanguage = () => source.value === 'auto' ? result?.from : source.value;

  fetch('/api/translation-config').then(response => response.ok ? response.json() : null).then(config => {
    autoDetect = Boolean(config?.autoDetect);
    if (autoDetect && mode === 'text') addDetectionOption();
    updateCharCount();
  }).catch(() => {});

  function addDetectionOption() {
    if (!source.querySelector('[value="auto"]')) source.add(new Option('Detect language', 'auto'), 0);
  }

  function updateLanguageLabels() {
    for (const [direction, from, to] of [['source', source.value, target.value], ['target', target.value, source.value]]) {
      byId('label-speak-' + direction).textContent = 'Speak ' + languageName(from);
      byId('sub-speak-' + direction).textContent = 'Translate to ' + languageName(to);
    }
  }

  function updateCharCount() {
    const text = input.value.trim();
    const length = autoDetect ? Array.from(text).length : new TextEncoder().encode(text).length;
    byId('trans-char-count').textContent = length + (autoDetect ? ' / 5000 characters' : ' / 500 bytes');
    byId('btn-trans-source-tts').disabled = !text || !sourceLanguage();
    byId('btn-trans-voice').disabled = source.value === 'auto';
  }

  function showResult(value) {
    result = value;
    output.textContent = value?.text || 'Translation will appear here…';
    output.lang = value?.to || '';
    byId('btn-trans-tts').disabled = !value;
    updateCharCount();
  }

  function stopSpeaking() {
    if (!playback) return;
    const previous = playback;
    playback = undefined;
    previous.button.setAttribute('aria-pressed', 'false');
    clearTimeout(previous.startTimeout);
    previous.audio?.pause();
    if (previous.utterance) window.speechSynthesis.cancel();
  }

  function cancel() {
    clearTimeout(timer);
    request?.abort();
    request = undefined;
    const listener = recognition;
    recognition = undefined;
    try { listener?.abort(); } catch { /* The browser may already have stopped listening. */ }
    modal.querySelectorAll('.listening').forEach(button => button.classList.remove('listening'));
    stopSpeaking();
  }

  function handleError(error) {
    status(error.name === 'TimeoutError' ? 'Translation timed out. Try again.' : error.message);
  }

  async function translate(query, from, to, onResult) {
    if (!query.trim()) return;
    const length = autoDetect ? Array.from(query).length : new TextEncoder().encode(query).length;
    const limit = autoDetect ? 5000 : 500;
    if (length > limit) {
      status('Shorten the text to ' + limit + (autoDetect ? ' characters.' : ' bytes.'));
      return;
    }
    request?.abort();
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(new DOMException('Translation timed out.', 'TimeoutError')), 16000);
    status('Translating…');
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, from, to }),
        signal: controller.signal
      });
      let data = await response.json();
      if (data.retryDirect && from !== 'auto') {
        const params = new URLSearchParams({ q: query, langpair: from + '|' + to });
        const fallback = await fetch('https://api.mymemory.translated.net/get?' + params, { signal: controller.signal });
        const translation = window.selectTranslation(await fallback.json(), query, to);
        if (fallback.ok && translation) data = { success: true, translation };
      }
      if (!data.success || typeof data.translation !== 'string') {
        throw new Error(data.error || 'Translation is unavailable.');
      }
      if (request !== controller) return;
      const decoded = document.createElement('textarea');
      decoded.innerHTML = data.translation;
      const detected = data.sourceLanguage || from;
      status(from === 'auto' ? 'Detected ' + languageName(detected) : '');
      onResult({ text: data.plainText ? data.translation : decoded.value, from: detected, to });
    } catch (error) {
      if (request === controller) handleError(controller.signal.reason || error);
    } finally {
      clearTimeout(timeout);
      if (request === controller) request = undefined;
    }
  }

  function translateText() {
    clearTimeout(timer);
    if (input.value.trim()) void translate(input.value.trim(), source.value, target.value, showResult);
  }

  function onInput(event) {
    cancel();
    showResult();
    status('');
    if (!event?.isComposing && input.value.trim()) timer = setTimeout(translateText, 500);
  }

  function speechChunks(text, language) {
    const words = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter(language, { granularity: 'word' }).segment(text)].map(item => item.segment)
      : text.split(/(\s+)/);
    const chunks = [];
    let chunk = '';
    for (const word of words) {
      if (Array.from(chunk + word).length > 160 && chunk.trim()) {
        chunks.push(chunk.trim());
        chunk = '';
      }
      const letters = Array.from(word);
      while (letters.length > 160) chunks.push(letters.splice(0, 160).join(''));
      chunk += letters.join('');
    }
    if (chunk.trim()) chunks.push(chunk.trim());
    return chunks;
  }

  function speak(text, language, button) {
    if (!text || !language || recognition) return;
    const toggleOff = playback?.button === button;
    stopSpeaking();
    if (toggleOff) { status(''); return; }
    const session = { button };
    playback = session;
    button.setAttribute('aria-pressed', 'true');
    status('Starting speech…');
    const finish = (message = '') => {
      if (playback !== session) return;
      stopSpeaking();
      status(message);
    };

    const playOnlineVoice = () => {
      if (playback !== session) return;
      clearTimeout(session.startTimeout);
      const chunks = speechChunks(text, language);
      const audio = new Audio();
      session.audio = audio;
      const next = () => {
        if (playback !== session) return;
        const q = chunks.shift();
        if (!q) { finish(); return; }
        audio.src = '/api/tts?' + new URLSearchParams({ q, tl: language });
        audio.play().then(() => {
          if (playback === session) status('Speaking…');
        }).catch(() => finish('Speech could not start. Tap the speaker to retry.'));
      };
      audio.onended = next;
      audio.onerror = () => finish('Speech is unavailable for this language. Try again shortly.');
      next();
    };

    const synth = window.speechSynthesis;
    const tag = locale[language] || language;
    const normalize = value => value.toLowerCase().replaceAll('_', '-');
    const voices = synth?.getVoices() || [];
    const voice = voices.find(item => normalize(item.lang) === normalize(tag)) ||
      voices.find(item => normalize(item.lang).split('-')[0] === normalize(tag).split('-')[0]);
    if (!voice || !window.SpeechSynthesisUtterance) {
      playOnlineVoice();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    session.utterance = utterance;
    utterance.voice = voice;
    utterance.lang = tag;
    utterance.rate = 0.95;
    const fallback = () => {
      if (playback !== session || !session.utterance) return;
      session.utterance = undefined;
      synth.cancel();
      playOnlineVoice();
    };
    utterance.onstart = () => {
      if (playback !== session) return;
      clearTimeout(session.startTimeout);
      status('Speaking…');
    };
    utterance.onend = () => { if (session.utterance) finish(); };
    utterance.onerror = fallback;
    session.startTimeout = setTimeout(fallback, 2500);
    try { synth.speak(utterance); } catch { fallback(); }
  }

  function addChatBubble(direction, original, value) {
    const history = byId('trans-chat-history');
    byId('trans-chat-empty')?.remove();
    const bubble = document.createElement('div');
    bubble.className = 'trans-chat-bubble ' + direction + '-bubble';
    const heading = document.createElement('div');
    heading.className = 'trans-chat-speaker';
    heading.append(languageName(value.from) + ' → ' + languageName(value.to));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-action-btn';
    button.setAttribute('aria-label', 'Listen to translation');
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<i class="fa-solid fa-volume-high" aria-hidden="true"></i>';
    button.addEventListener('click', () => speak(value.text, value.to, button));
    heading.append(button);
    const translated = document.createElement('strong');
    translated.textContent = value.text;
    translated.lang = value.to;
    const quote = document.createElement('div');
    quote.className = 'trans-chat-original';
    quote.lang = value.from;
    quote.textContent = original;
    bubble.append(heading, translated, quote);
    history.append(bubble);
    history.scrollTop = history.scrollHeight;
    if (byId('trans-auto-speak-toggle').checked) speak(value.text, value.to, button);
    else status('Ready for the next speaker.');
  }

  function startSpeaking(direction) {
    if (recognition) {
      try { recognition.stop(); } catch { cancel(); }
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !window.isSecureContext) {
      status('Microphone input requires a browser with speech recognition on HTTPS or localhost.');
      return;
    }

    const from = direction === 'source' ? source.value : target.value;
    const to = direction === 'source' ? target.value : source.value;
    if (from === 'auto') { status('Select the language you will speak.'); return; }
    cancel();
    const live = mode === 'live';
    const button = byId(live ? 'btn-speak-' + direction : 'btn-trans-voice');
    const listener = new SpeechRecognition();
    recognition = listener;
    listener.lang = locale[from] || from;
    listener.interimResults = true;
    let transcript = '';
    let failed = false;
    listener.onresult = event => {
      const results = Array.from(event.results);
      transcript = results.filter(item => item.isFinal).map(item => item[0].transcript).join(' ').trim();
      if (recognition === listener) status(results.map(item => item[0].transcript).join(' '));
    };
    listener.onerror = event => {
      if (recognition !== listener) return;
      failed = true;
      status(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Allow microphone access and try again.' : 'Speech was unavailable. Try again.');
    };
    listener.onend = () => {
      if (recognition !== listener) return;
      recognition = undefined;
      button.classList.remove('listening');
      if (failed) return;
      if (!transcript) { status('No speech heard. Try again.'); return; }
      if (live) void translate(transcript, from, to, value => addChatBubble(direction, transcript, value));
      else {
        input.value = [input.value.trim(), transcript].filter(Boolean).join(' ');
        showResult();
        translateText();
      }
    };
    try {
      listener.start();
      button.classList.add('listening');
      status('Listening… Tap the microphone to finish.');
    } catch {
      cancel();
      status('Could not start the microphone. Try again.');
    }
  }

  function setMode(next) {
    cancel();
    mode = next;
    const live = mode === 'live';
    if (live) {
      if (source.value === 'auto') source.value = sourceLanguage() || 'te';
      source.querySelector('[value="auto"]')?.remove();
    } else if (autoDetect) addDetectionOption();
    byId('trans-live-panel').style.display = live ? 'flex' : 'none';
    modal.querySelector('.trans-text-panel').hidden = live;
    for (const name of ['text', 'live']) {
      byId('trans-mode-' + name).classList.toggle('active', name === mode);
      byId('trans-mode-' + name).setAttribute('aria-pressed', String(name === mode));
    }
    if (live) status('Tap a microphone to speak.');
    updateLanguageLabels();
  }

  new MutationObserver(() => {
    if (!modal.classList.contains('show')) cancel();
  }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  showResult();
  setMode('text');

  return {
    init() { updateLanguageLabels(); updateCharCount(); },
    setMode,
    onLanguageChange() {
      updateLanguageLabels();
      if (mode === 'live') { cancel(); status('Tap a microphone to speak.'); }
      else onInput();
    },
    swapLanguages() {
      const from = sourceLanguage();
      if (!from || ![...target.options].some(option => option.value === from)) {
        status('Select a source language before swapping.');
        return;
      }
      [source.value, target.value] = [target.value, from];
      if (mode === 'text' && result) input.value = result.text;
      updateLanguageLabels();
      if (mode === 'text') { onInput(); translateText(); }
      else { cancel(); status('Tap a microphone to speak.'); }
    },
    onInput,
    translateText,
    startSpeaking,
    speakSource() { speak(input.value.trim(), sourceLanguage(), byId('btn-trans-source-tts')); },
    speakTarget() { if (result) speak(result.text, result.to, byId('btn-trans-tts')); },
    clearText() { input.value = ''; onInput(); input.focus(); },
    clearHistory() {
      cancel();
      const empty = document.createElement('p');
      empty.id = 'trans-chat-empty';
      empty.className = 'trans-chat-empty';
      empty.textContent = 'Speak in either language to start the conversation.';
      byId('trans-chat-history').replaceChildren(empty);
      status('Tap a microphone to speak.');
    },
    async copyOutput() {
      if (!result) return;
      try { await navigator.clipboard.writeText(result.text); status('Translation copied.'); }
      catch { status('Select the translated text to copy it.'); }
    },
    searchTranslatedMusic() {
      if (!result) return;
      closeModal('translation-modal');
      switchTab('online');
      byId('global-search-input').value = result.text;
      handleSearchSubmit();
    }
  };
})();
