type SpeechInput = { locale: string; signal: AbortSignal; onStart: () => void };

export function captureSpeech({ locale, signal, onStart }: SpeechInput) {
  let finish: (() => void) | undefined;

  async function capture() {
    let recognizer;
    try {
      ({ ExpoSpeechRecognitionModule: recognizer } = await import('expo-speech-recognition'));
    } catch {
      throw new Error('Microphone recognition requires an app build with speech recognition enabled.');
    }
    if (signal.aborted) return '';
    if (!recognizer.isRecognitionAvailable()) {
      throw new Error('Speech recognition is unavailable on this device or browser.');
    }
    const permissions = await recognizer.requestPermissionsAsync();
    if (signal.aborted) return '';
    if (!permissions.granted) {
      throw new Error('Allow microphone and speech recognition access in your device settings.');
    }

    const speech = recognizer;
    return new Promise<string>((resolve, reject) => {
      let transcript = '';
      let failure = '';
      let active = true;
      const subscriptions = [
        speech.addListener('start', onStart),
        speech.addListener('result', event => {
          if (event.isFinal) transcript = event.results[0]?.transcript.trim() ?? '';
        }),
        speech.addListener('error', event => {
          const messages: Record<string, string> = {
            'not-allowed': 'Allow microphone and speech recognition access in settings.',
            'service-not-allowed': 'The speech recognition service is unavailable.',
            'no-speech': 'No speech heard. Try again.',
            'language-not-supported': `Speech recognition for ${locale} is unavailable on this device.`,
            'network': 'Speech recognition lost its connection. Try again.',
          };
          failure = messages[event.error] ?? 'Could not recognize speech. Try again.';
        }),
        speech.addListener('end', () => {
          if (!active) return;
          cleanup();
          if (failure || !transcript) reject(new Error(failure || 'No speech heard. Try again.'));
          else resolve(transcript);
        }),
      ];
      const timer = setTimeout(() => stop('Listening timed out. Try a shorter turn.'), 30000);

      function cleanup() {
        active = false;
        finish = undefined;
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        subscriptions.forEach(subscription => subscription.remove());
      }

      function stop(message?: string) {
        if (!active) return;
        cleanup();
        try { speech.abort(); } catch { /* The recognizer may already have stopped. */ }
        if (message) reject(new Error(message));
        else resolve('');
      }

      function abort() { stop(); }

      signal.addEventListener('abort', abort, { once: true });
      finish = () => {
        try { speech.stop(); } catch { stop('Could not finish listening. Try again.'); }
      };
      try {
        speech.start({ lang: locale, interimResults: false, continuous: false });
      } catch {
        stop('Could not open the microphone. Check speech recognition permissions and try again.');
      }
    });
  }

  return { result: capture(), finish: () => finish?.() };
}
