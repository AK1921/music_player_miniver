// ==============================================================================
// NEXORA MINI-GAMES HUB SCREEN
// Full independent offline games: Snake, 2048, Memory Match, Sudoku, AI Duel,
// Block Blast, Candy Match-3 & Space Rocket Shooter
// ==============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../stores/themeStore';
import { SnakeGame } from '../components/games/SnakeGame';
import { MemoryMatchGame } from '../components/games/MemoryMatchGame';
import { SudokuGame } from '../components/games/SudokuGame';
import { NumberPuzzle2048 } from '../components/games/NumberPuzzle2048';
import { TicTacToeGame } from '../components/games/TicTacToeGame';
import { BlockPuzzleGame } from '../components/games/BlockPuzzleGame';
import { CandyCrushGame } from '../components/games/CandyCrushGame';
import { SpaceShooterGame } from '../components/games/SpaceShooterGame';

type GameId =
  | 'snake'
  | '2048'
  | 'space'
  | 'candy'
  | 'blocks'
  | 'memory'
  | 'sudoku'
  | 'tictactoe';

export default function GamesScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const [activeGame, setActiveGame] = useState<GameId>('space');

  const gamesList: { id: GameId; label: string; icon: any }[] = [
    { id: 'space', label: 'Space Rocket', icon: 'rocket' },
    { id: 'candy', label: 'Candy Match', icon: 'sparkles' },
    { id: 'blocks', label: 'Block Blast', icon: 'cube' },
    { id: 'snake', label: 'Retro Snake', icon: 'game-controller' },
    { id: '2048', label: '2048 Merge', icon: 'grid-outline' },
    { id: 'memory', label: 'Memory Flip', icon: 'albums-outline' },
    { id: 'sudoku', label: 'Brain Sudoku', icon: 'calculator-outline' },
    { id: 'tictactoe', label: 'AI Duel', icon: 'close-circle-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>LIGHTWEIGHT OFFLINE</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>ARCADE & PUZZLES</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Game Selector Pills */}
      <View style={[styles.selectorBar, { backgroundColor: theme.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {gamesList.map(g => {
            const isSelected = activeGame === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.gamePill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setActiveGame(g.id)}
              >
                <Ionicons
                  name={g.icon}
                  size={16}
                  color={isSelected ? '#FFF' : theme.textMuted}
                />
                <Text
                  style={[
                    styles.gamePillText,
                    { color: isSelected ? '#FFF' : theme.textMuted },
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Game Canvas */}
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {activeGame === 'space' && <SpaceShooterGame />}
        {activeGame === 'candy' && <CandyCrushGame />}
        {activeGame === 'blocks' && <BlockPuzzleGame />}
        {activeGame === 'snake' && <SnakeGame />}
        {activeGame === '2048' && <NumberPuzzle2048 />}
        {activeGame === 'memory' && <MemoryMatchGame />}
        {activeGame === 'sudoku' && <SudokuGame />}
        {activeGame === 'tictactoe' && <TicTacToeGame />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectorBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pillsScroll: {
    gap: 8,
  },
  gamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  gamePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
});
