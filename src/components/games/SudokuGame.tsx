// ==============================================================================
// NEXORA MINI-GAMES: QUICK SUDOKU / NUMBER LOGIC
// 4x4 Mini-Sudoku designed for rapid mental training
// ==============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';

type Board = (number | null)[][];

const INITIAL_PUZZLE: Board = [
  [1, null, 3, null],
  [null, 4, null, 2],
  [null, 1, 4, null],
  [4, null, null, 3],
];

const SOLUTION: Board = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
];

export const SudokuGame: React.FC = () => {
  const { theme } = useThemeStore();
  const [board, setBoard] = useState<Board>(INITIAL_PUZZLE.map(r => [...r]));
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleCellPress = (r: number, c: number) => {
    // Only allow changing cells that were not originally given
    if (INITIAL_PUZZLE[r][c] === null) {
      setSelectedCell({ r, c });
    }
  };

  const handleNumberSelect = (num: number) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = num;
    setBoard(newBoard);
    setHasError(false);

    // Check if board complete
    let isComplete = true;
    let isCorrect = true;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (newBoard[i][j] === null) isComplete = false;
        if (newBoard[i][j] !== SOLUTION[i][j]) isCorrect = false;
      }
    }

    if (isComplete) {
      if (isCorrect) {
        setIsSolved(true);
      } else {
        setHasError(true);
      }
    }
  };

  const handleClearCell = () => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = null;
    setBoard(newBoard);
    setHasError(false);
  };

  const resetGame = () => {
    setBoard(INITIAL_PUZZLE.map(r => [...r]));
    setSelectedCell(null);
    setIsSolved(false);
    setHasError(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>BRAIN SUDOKU (4x4)</Text>
        <TouchableOpacity onPress={resetGame}>
          <Text style={[styles.resetText, { color: theme.accent }]}>RESET</Text>
        </TouchableOpacity>
      </View>

      {/* Sudoku Grid */}
      <View style={[styles.grid, { borderColor: theme.border }]}>
        {board.map((row, r) => (
          <View key={`r-${r}`} style={styles.row}>
            {row.map((val, c) => {
              const isPredefined = INITIAL_PUZZLE[r][c] !== null;
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;

              return (
                <TouchableOpacity
                  key={`c-${r}-${c}`}
                  activeOpacity={0.7}
                  onPress={() => handleCellPress(r, c)}
                  style={[
                    styles.cell,
                    {
                      borderColor: theme.border,
                      backgroundColor: isSelected
                        ? theme.primaryGlow
                        : isPredefined
                        ? theme.card
                        : theme.surfaceHover,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      {
                        color: isPredefined
                          ? theme.text
                          : val !== null
                          ? theme.primary
                          : 'transparent',
                        fontWeight: isPredefined ? '900' : '700',
                      },
                    ]}
                  >
                    {val !== null ? val : '·'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Number Selectors */}
      <View style={styles.controlsRow}>
        {[1, 2, 3, 4].map(num => (
          <TouchableOpacity
            key={`btn-${num}`}
            style={[styles.numBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleNumberSelect(num)}
          >
            <Text style={[styles.numBtnText, { color: theme.primary }]}>{num}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.clearBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={handleClearCell}
        >
          <Text style={[styles.clearBtnText, { color: theme.danger }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {isSolved && (
        <View style={styles.msgBox}>
          <Text style={[styles.msgSuccess, { color: theme.success }]}>
            PERFECT! PUZZLE COMPLETE.
          </Text>
        </View>
      )}

      {hasError && (
        <View style={styles.msgBox}>
          <Text style={[styles.msgError, { color: theme.danger }]}>
            Some numbers conflict. Check rows & boxes.
          </Text>
        </View>
      )}
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
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resetText: {
    fontWeight: '700',
    fontSize: 13,
  },
  grid: {
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 60,
    height: 60,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 22,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  numBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numBtnText: {
    fontSize: 20,
    fontWeight: '800',
  },
  clearBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 18,
    fontWeight: '800',
  },
  msgBox: {
    marginTop: 14,
  },
  msgSuccess: {
    fontWeight: '800',
    fontSize: 14,
  },
  msgError: {
    fontWeight: '700',
    fontSize: 13,
  },
});
