import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';
import { customLanguage, languages, type Language } from './translation';

type Props = { title: string; onChoose: (language: Language) => void; onClose: () => void };

export function LanguagePicker({ title, onChoose, onClose }: Props) {
  const theme = useThemeStore(state => state.theme);
  const [query, setQuery] = useState('');
  const filter = query.trim().toLowerCase();
  const matches = languages.filter(language =>
    [language.name, language.code, language.locale].some(value => value.toLowerCase().includes(filter)));
  const custom = customLanguage(query);
  const customOption = custom && !matches.some(language => language.code === custom.code);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }] }>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.action}>
              <Text style={{ color: theme.primary }}>Close</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Find a language"
            placeholder="Search by name or code, e.g. en-GB"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={query}
            onChangeText={setQuery}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={matches}
            keyExtractor={language => language.code}
            ListHeaderComponent={customOption ? (
              <Pressable accessibilityRole="button" onPress={() => onChoose(custom)} style={styles.action}>
                <Text style={{ color: theme.primary }}>Use language code {custom.code}</Text>
              </Pressable>
            ) : undefined}
            ListEmptyComponent={customOption ? undefined : <Text style={{ color: theme.textMuted }}>No matching languages.</Text>}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => onChoose(item)} style={styles.action}>
                <Text style={{ color: theme.text }}>{item.name} · {item.locale}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0009' },
  card: { width: '100%', maxWidth: 520, height: '72%', borderRadius: 16, padding: 16, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
});
