(() => {
  const commands = {
    play: /^(?:(?:play|resume|start)(?: (?:the )?(?:music|song|track|playback))?|(?:turn )?(?:the )?music on|turn on (?:the )?music)$/i,
    pause: /^(?:pause|hold)(?: (?:the )?(?:music|song|track|playback))?$/i,
    stop: /^(?:stop(?: (?:the )?(?:music|song|track|playback))?|(?:turn )?(?:the )?music off|turn off (?:the )?music)$/i,
    next: /^(?:next|skip|skip to(?: the)? next|skip(?: the)? current|play(?: the)? next)(?: (?:the )?(?:song|track))?$/i,
    previous: /^(?:prev|previous|back|go back|go back one|play(?: the)? previous)(?: (?:the )?(?:song|track))?$/i,
    up: /^(?:page up|(?:page )?scroll (?:the page )?up|scroll (?:the )?page up|up(?: a| one)? page|go up)$/i,
    down: /^(?:page down|(?:page )?scroll (?:the page )?down|scroll (?:the )?page down|down(?: a| one)? page|go down)$/i,
    top: /^(?:(?:go|scroll|jump) to (?:the )?)?(?:top(?: of (?:the )?page)?|page top)$/i,
    bottom: /^(?:(?:go|scroll|jump) to (?:the )?)?(?:bottom(?: of (?:the )?page)?|page bottom)$/i,
    louder: /^(?:volume up|increase(?: the)? volume)$/i,
    quieter: /^(?:volume down|decrease(?: the)? volume)$/i,
    mute: /^mute(?: (?:the )?(?:music|audio))?$/i,
    unmute: /^unmute(?: (?:the )?(?:music|audio))?$/i,
    sleep: /^(?:set (?:a |the )?)?sleep(?: timer)?(?: (?:for )?30(?: minutes?)?)?$/i,
  };

  function parseMusicCommand(raw) {
    const text = raw.trim().replace(/\s+/g, ' ').replace(/[.!?,]+$/, '')
      .replace(/^please[ ,]+|[ ,]+please$/gi, '').trim();
    if (!text) return { action: 'empty' };
    for (const [action, pattern] of Object.entries(commands)) {
      if (pattern.test(text)) return { action };
    }
    const volume = /^(?:set (?:the )?)?volume(?: to)? (\d{1,3})(?:%| percent)?$/i.exec(text);
    if (volume) return { action: 'volume', value: Math.min(100, Number(volume[1])) };
    const mood = /^(?:play )?(workout|gym|devotional|mantra|chalisa|happy|relax|relaxing)(?: (?:music|songs|chants))?$/i.exec(text);
    if (mood) {
      const phrase = mood[1].toLowerCase();
      return { action: 'mood', value: phrase === 'gym' ? 'workout' : ['mantra', 'chalisa'].includes(phrase) ? 'devotional' : phrase };
    }
    const search = /^(?:search(?: for)?|find) (.+)$/i.exec(text);
    if (search) return { action: 'search', query: search[1] };
    const play = /^play (.+)$/i.exec(text);
    if (play) return { action: 'playQuery', query: play[1] };
    return { action: 'search', query: text };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { parseMusicCommand };
  else window.parseMusicCommand = parseMusicCommand;
})();
