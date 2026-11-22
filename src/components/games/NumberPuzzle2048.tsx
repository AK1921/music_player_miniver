// ==============================================================================
// NEXORA MINI-GAMES: 2048 NUMBER MERGE PUZZLE
// Fast, lightweight 4x4 merge challenge
// ==============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';

type Board2048 = number[][];

export const NumberPuzzle2048: React.FC = () => {
  const { theme } = useThemeStore();
  const [board, setBoard] = useState<Board2048>([
    [0, 2, 0, 0],
    [0, 0, 2, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);

  const addRandomTile = (currentBoard: Board2048): Board2048 => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return currentBoard;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = currentBoard.map(row => [...row]);
    newBoard[randomCell.r][randomCell.c] = Math.random() > 0.8 ? 4 : 2;
    return newBoard;
  };

  const slideRow = (row: number[]): { newRow: number[]; gainedScore: number } => {
    let filtered = row.filter(n => n !== 0);
    let gainedScore = 0;
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2;
        gainedScore += filtered[i];
        filtered[i + 1] = 0;
      }
    }
    filtered = filtered.filter(n => n !== 0);
    while (filtered.length < 4) {
      filtered.push(0);
    }
    return { newRow: filtered, gainedScore };
  };

  const move = (direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    let newBoard: Board2048 = board.map(r => [...r]);
    let totalScore = 0;

    if (direction === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const { newRow, gainedScore } = slideRow(newBoard[r]);
        newBoard[r] = newRow;
        totalScore += gainedScore;
      }
    } else if (direction === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const reversed = [...newBoard[r]].reverse();
        const { newRow, gainedScore } = slideRow(reversed);
        newBoard[r] = newRow.reverse();
        totalScore += gainedScore;
      }
    } else if (direction === 'UP') {
      for (let c = 0; c < 4; c++) {
        const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
        const { newRow, gainedScore } = slideRow(col);
        for (let r = 0; r < 4; r++) newBoard[r][c] = newRow[r];
        totalScore += gainedScore;
      }
    } else if (direction === 'DOWN') {
      for (let c = 0; c < 4; c++) {
        const col = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
        const { newRow, gainedScore } = slideRow(col);
        for (let r = 0; r < 4; r++) newBoard[3 - r][c] = newRow[r];
        totalScore += gainedScore;
      }
    }

    setScore(s => s + totalScore);
    const withNewTile = addRandomTile(newBoard);
    setBoard(withNewTile);
  };

  const resetGame = () => {
    let freshBoard: Board2048 = [
      [0, 2, 0, 0],
      [0, 0, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    setBoard(freshBoard);
    setScore(0);
  };

  const getTileColor = (val: number) => {
    switch (val) {
      case 2: return '#3B82F6';
      case 4: return '#06B6D4';
      case 8: return '#10B981';
      case 16: return '#F59E0B';
      case 32: return '#F97316';
      case 64: return '#EF4444';
      case 128: return '#EC4899';
      case 256: return '#8B5CF6';
      case 512: return '#6366F1';
      case 1024: return '#D946EF';
      case 2048: return '#EAB308';
      default: return theme.card;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>2048 MERGE</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Score: {score}</Text>
        </View>
        <TouchableOpacity
          style={[styles.resetBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={resetGame}
        >
          <Text style={[styles.resetText, { color: theme.primary }]}>RESTART</Text>
        </TouchableOpacity>
      </View>

      {/* 4x4 Grid */}
      <View style={[styles.grid, { backgroundColor: theme.background, borderColor: theme.border }]}>
        {board.map((row, r) => (
          <View key={`r-${r}`} style={styles.row}>
            {row.map((val, c) => (
              <View
                key={`c-${r}-${c}`}
                style={[
                  styles.cell,
                  {
                    backgroundColor: getTileColor(val),
                  },
                ]}
              >
                {val > 0 && <Text style={styles.cellText}>{val}</Text>}
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Swipe Controller Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: theme.card }]}
          onPress={() => move('UP')}
        >
          <Ionicons name="arrow-up" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.ctrlHorizontal}>
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: theme.card }]}
            onPress={() => move('LEFT')}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: theme.card }]}
            onPress={() => move('RIGHT')}
          >
            <Ionicons name="arrow-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: theme.card }]}
          onPress={() => move('DOWN')}
        >
          <Ionicons name="arrow-down" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetText: {
    fontWeight: '800',
    fontSize: 12,
  },
  grid: {
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  cell: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  controls: {
    marginTop: 16,
    alignItems: 'center',
  },
  ctrlHorizontal: {
    flexDirection: 'row',
    gap: 40,
    marginVertical: 4,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

