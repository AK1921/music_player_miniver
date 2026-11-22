import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { customLanguage, type Language } from './translation';
import { useTranslator } from './useTranslator';
import { LanguagePicker } from './LanguagePicker';

export default function TranslatorScreen() {
  const theme = useThemeStore(state => state.theme);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [from, setFrom] = useState(() => customLanguage('te-IN')!);
  const [to, setTo] = useState(() => customLanguage('ml-IN')!);
  const [picker, setPicker] = useState<'from' | 'to'>();
  const [typedText, setTypedText] = useState('');
  const translator = useTranslator();
  const busy = translator.phase !== 'idle';

  function button(label: string, onPress: () => void, selected?: boolean, disabled = false, icon?: keyof typeof Ionicons.glyphMap) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[styles.button, {
          backgroundColor: selected ? theme.primaryGlow : theme.card,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.5 : 1,
        }]}
      >
        {icon && <Ionicons name={icon} color={theme.primary} size={20} />}
        <Text style={[styles.buttonText, { color: theme.text }]}>{label}</Text>
      </Pressable>
    );
  }

  function switchMode(next: 'text' | 'voice') {
    if (mode === next) return;
    translator.reset();
    setMode(next);
  }

  function chooseLanguage(language: Language) {
    translator.reset();
    if (picker === 'from') {
      if (language.code === to.code) setTo(from);
      setFrom(language);
    } else {
      if (language.code === from.code) setFrom(to);
      setTo(language);
    }
    setPicker(undefined);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Translator', headerTintColor: theme.text,
        headerStyle: { backgroundColor: theme.surface } }} />
      <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
        <View style={styles.row}>
          {button('Type', () => switchMode('text'), mode === 'text', false, 'create-outline')}
          {button('Speak', () => switchMode('voice'), mode === 'voice', false, 'mic-outline')}
        </View>
        <View style={styles.row}>
          {button(`${mode === 'voice' ? 'Speaker A' : 'From'} · ${from.name}`, () => setPicker('from'), undefined, busy, 'chevron-down')}
          {button(`${mode === 'voice' ? 'Speaker B' : 'To'} · ${to.name}`, () => setPicker('to'), undefined, busy, 'chevron-down')}
          {button('Swap languages', () => {
            translator.reset();
            setFrom(to);
            setTo(from);
          }, undefined, busy, 'swap-horizontal')}
        </View>
        {mode === 'text' ? (
          <>
            <TextInput
              accessibilityLabel="Text to translate"
              placeholder="Enter text to translate"
              placeholderTextColor={theme.textMuted}
              multiline
              value={typedText}
              onChangeText={text => { translator.reset(); setTypedText(text); }}
              style={[styles.panel, styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            />
            {button('Translate', () => void translator.translate(typedText, from, to), undefined,
              busy || !typedText.trim(), 'language-outline')}
          </>
        ) : (
          <>
            <Text style={{ color: theme.textMuted }}>Tap the microphone for your language and take turns. The device reads the translation aloud.</Text>
            <View style={styles.row}>
              {button(`Speak ${from.name}`, () => void translator.listen(from, to), undefined, busy, 'mic-outline')}
              {button(`Speak ${to.name}`, () => void translator.listen(to, from), undefined, busy, 'mic-outline')}
              {translator.phase === 'listening' && button('Finish speaking', translator.finishListening, undefined, false, 'stop-circle-outline')}
            </View>
            {translator.input ? <Text selectable style={[styles.panel, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}>
              {translator.input}
            </Text> : null}
          </>
        )}
        {translator.status ? <Text accessibilityLiveRegion="polite" style={{ color: theme.textMuted }}>{translator.status}</Text> : null}
        {translator.result && (
          <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{translator.result.language.name}</Text>
            <Text selectable style={[styles.result, { color: theme.text }]}>{translator.result.text}</Text>
            {button('Listen', () => { if (translator.result) void translator.speak(translator.result, mode === 'voice'); }, undefined, busy, 'volume-high-outline')}
          </View>
        )}
        <Text style={{ color: theme.textMuted }}>Translation uses the free online MyMemory service. Speech availability depends on your device and installed languages.</Text>
      </ScrollView>
      {picker && <LanguagePicker
        title={picker === 'from' ? 'Choose speaker A’s language' : 'Choose speaker B’s language'}
        onChoose={chooseLanguage}
        onClose={() => setPicker(undefined)}
      />}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 14, alignSelf: 'center', width: '100%', maxWidth: 640 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '700' },
  panel: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  input: { minHeight: 120, textAlignVertical: 'top', fontSize: 17 },
  result: { fontSize: 19, lineHeight: 30 },
});
