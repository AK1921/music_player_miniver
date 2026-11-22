import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { translateText, type Language } from './translation';
import { captureSpeech } from '../../services/speechRecognition';

type Phase = 'idle' | 'permission' | 'listening' | 'translating' | 'speaking';
type Translation = { text: string; language: Language };

export function useTranslator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Translation>();
  const [status, setStatus] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const operation = useRef(0);
  const cleanup = useRef<() => void>(undefined);
  const finishListening = useRef<() => void>(undefined);

  const cancel = useCallback(() => {
    operation.current++;
    const dispose = cleanup.current;
    cleanup.current = undefined;
    finishListening.current = undefined;
    dispose?.();
  }, []);

  const reset = useCallback(() => {
    cancel();
    setPhase('idle');
    setStatus('');
    setResult(undefined);
  }, [cancel]);

  useFocusEffect(useCallback(() => {
    reset();
    return cancel;
  }, [cancel, reset]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') reset();
    });
    return () => subscription.remove();
  }, [reset]);

  async function speak(translation: Translation, voiceTurn = false) {
    cancel();
    const id = operation.current;
    setPhase('speaking');
    setStatus('Preparing speech…');
    function finish(message: string) {
      if (id !== operation.current || !cleanup.current) return;
      clearTimeout(timer);
      cleanup.current = undefined;
      setPhase('idle');
      setStatus(message);
    }
    const unavailable = `${translation.language.name} speech is unavailable. Check your device’s text-to-speech voices.`;
    const timer = setTimeout(() => {
      finish(unavailable);
      void Speech.stop().catch(() => {});
    }, 60000);
    cleanup.current = () => {
      clearTimeout(timer);
      void Speech.stop().catch(() => {});
    };
    try {
      const language = translation.language.locale || translation.language.code;
      let voice: any = undefined;
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (id !== operation.current || !cleanup.current) return;
        if (Array.isArray(voices) && voices.length > 0) {
          voice = voices.find(item => item.language.toLowerCase() === language.toLowerCase()) ??
            voices.find(item => item.language.toLowerCase().split(/[-_]/)[0] === language.toLowerCase().split('-')[0]);
        }
      } catch (_) {}

      Speech.speak(translation.text, {
        language,
        voice: voice?.identifier,
        useApplicationAudioSession: false,
        onStart: () => {
          if (id === operation.current && cleanup.current) setStatus('Speaking…');
        },
        onDone: () => finish(voiceTurn ? 'Ready for the next speaker.' : ''),
        onStopped: () => finish(''),
        onError: () => finish('Speech playback ended.'),
      });
    } catch {
      finish(unavailable);
    }
  }

  async function translate(text: string, from: Language, to: Language, voiceTurn = false) {
    reset();
    if (!text.trim() || from.code === to.code) {
      setStatus(from.code === to.code ? 'Choose two different languages.' : 'Enter some text to translate.');
      return;
    }
    const id = operation.current;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    cleanup.current = () => {
      clearTimeout(timer);
      controller.abort();
    };
    setPhase('translating');
    setStatus('Translating…');
    try {
      const translated = await translateText(text, from, to, controller.signal);
      if (id !== operation.current) return;
      if (controller.signal.aborted) throw new Error('Translation timed out. Try again.');
      const next = { text: translated, language: to };
      cleanup.current = undefined;
      setResult(next);
      setPhase('idle');
      setStatus('');
      if (voiceTurn) void speak(next, true);
    } catch (error) {
      if (id !== operation.current) return;
      cleanup.current = undefined;
      setPhase('idle');
      setStatus(controller.signal.aborted ? 'Translation timed out. Try again.' : error instanceof TypeError
        ? 'Could not reach the translation service. Check your connection.'
        : error instanceof Error ? error.message : 'Translation is unavailable.');
    } finally {
      clearTimeout(timer);
    }
  }

  async function listen(from: Language, to: Language) {
    reset();
    setInput('');
    const id = operation.current;
    setPhase('permission');
    setStatus('Opening microphone?');
    const controller = new AbortController();
    cleanup.current = () => controller.abort();
    const speech = captureSpeech({
      locale: from.locale,
      signal: controller.signal,
      onStart: () => {
        if (id !== operation.current) return;
        setPhase('listening');
        setStatus('Listening in ' + from.name + '?');
      },
    });
    finishListening.current = speech.finish;
    try {
      const transcript = await speech.result;
      if (id !== operation.current || !transcript) return;
      setInput(transcript);
      void translate(transcript, from, to, true);
    } catch (error) {
      if (id !== operation.current) return;
      cancel();
      setPhase('idle');
      setStatus(error instanceof Error ? error.message : 'Could not open the microphone.');
    }
  }

  return {
    input, result, phase, status, reset, translate, listen, speak,
    finishListening: () => finishListening.current?.(),
  };
}
