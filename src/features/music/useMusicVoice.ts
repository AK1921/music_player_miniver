import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { captureSpeech } from '../../services/speechRecognition';

const prompt = 'Say “Scroll down”, “Play music”, “Next song”, or a song title.';

export function useMusicVoice(execute: (transcript: string) => string | undefined) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState(prompt);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'listening'>('idle');
  const controller = useRef<AbortController>(undefined);
  const finish = useRef<() => void>(undefined);

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = undefined;
    finish.current = undefined;
  }, []);

  const close = useCallback(() => {
    cancel();
    setVisible(false);
    setPhase('idle');
  }, [cancel]);

  useFocusEffect(useCallback(() => close, [close]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') close();
    });
    return () => subscription.remove();
  }, [close]);

  function submit(transcript: string) {
    if (!transcript.trim()) return;
    cancel();
    setPhase('idle');
    const message = execute(transcript);
    if (message) setStatus(message);
    else setVisible(false);
  }

  async function listen() {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setPhase('opening');
    setStatus('Opening microphone…');
    const capture = captureSpeech({
      locale: 'en-US',
      signal: current.signal,
      onStart: () => {
        if (current.signal.aborted) return;
        setPhase('listening');
        setStatus('Listening…');
      },
    });
    finish.current = capture.finish;
    try {
      const transcript = await capture.result;
      if (!current.signal.aborted && transcript) submit(transcript);
    } catch (error) {
      if (current.signal.aborted) return;
      setStatus(error instanceof Error ? error.message : 'Could not open the microphone.');
    } finally {
      if (controller.current === current) {
        cancel();
        setPhase('idle');
      }
    }
  }

  function open(startListening = false) {
    setVisible(true);
    setStatus(prompt);
    if (startListening) void listen();
  }

  return { visible, phase, status, open, close, listen, finish: () => finish.current?.(), submit };
}
