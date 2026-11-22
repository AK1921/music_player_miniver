// ==============================================================================
// NEXORA MINI-GAMES: CANDY MATCH-3 CRUSH
// Match 3 adjacent candies, cascading combo drops & animated sweet blasts
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 6;
const BOARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 336);
const CELL_SIZE = Math.floor(BOARD_WIDTH / GRID_SIZE);

interface CandyType {
  id: number;
  name: string;
  color: string;
  icon: any;
}

const CANDY_TYPES: CandyType[] = [
  { id: 0, name: 'Berry', color: '#EC4899', icon: 'heart' },
  { id: 1, name: 'Lemon', color: '#FBBF24', icon: 'sunny' },
  { id: 2, name: 'Mint', color: '#10B981', icon: 'leaf' },
  { id: 3, name: 'Sapphire', color: '#3B82F6', icon: 'diamond' },
  { id: 4, name: 'Grape', color: '#A855F7', icon: 'planet' },
  { id: 5, name: 'Orange', color: '#F97316', icon: 'flame' },
];

function getRandomCandyId(): number {
  return Math.floor(Math.random() * CANDY_TYPES.length);
}

function createInitialGrid(): number[][] {
  let grid: number[][];
  let hasMatches = true;

  // Generate grid without starting with 3-in-a-row matches
  do {
    grid = Array(GRID_SIZE).fill(0).map(() =>
      Array(GRID_SIZE).fill(0).map(() => getRandomCandyId())
    );

    // Replace initial horizontal matches
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        if (grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) {
          grid[r][c + 2] = (grid[r][c + 2] + 1) % CANDY_TYPES.length;
        }
      }
    }
    // Replace initial vertical matches
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        if (grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c]) {
          grid[r + 2][c] = (grid[r + 2][c] + 1) % CANDY_TYPES.length;
        }
      }
    }

    hasMatches = false;
  } while (hasMatches);

  return grid;
}

export const CandyCrushGame: React.FC = () => {
  const { theme } = useThemeStore();
  const [grid, setGrid] = useState<number[][]>(createInitialGrid);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(25);
  const [combo, setCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [lastMatchText, setLastMatchText] = useState<string | null>(null);

  // Animation values
  const [selectPulse] = useState(() => new Animated.Value(1));
  const [matchFlash] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (selectedCell) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(selectPulse, { toValue: 1.18, duration: 250, useNativeDriver: true }),
          Animated.timing(selectPulse, { toValue: 1, duration: 250, useNativeDriver: true }),
        ])
      ).start();
    } else {
      selectPulse.setValue(1);
    }
  }, [selectedCell]);

  const triggerMatchFlash = () => {
    Animated.sequence([
      Animated.timing(matchFlash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(matchFlash, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const findMatches = (currentGrid: number[][]): { r: number; c: number }[] => {
    const matchedCoords: Set<string> = new Set();

    // Check rows
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        const val = currentGrid[r][c];
        if (val !== -1 && val === currentGrid[r][c + 1] && val === currentGrid[r][c + 2]) {
          matchedCoords.add(`${r},${c}`);
          matchedCoords.add(`${r},${c + 1}`);
          matchedCoords.add(`${r},${c + 2}`);
        }
      }
    }

    // Check columns
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        const val = currentGrid[r][c];
        if (val !== -1 && val === currentGrid[r + 1][c] && val === currentGrid[r + 2][c]) {
          matchedCoords.add(`${r},${c}`);
          matchedCoords.add(`${r + 1},${c}`);
          matchedCoords.add(`${r + 2},${c}`);
        }
      }
    }

    return Array.from(matchedCoords).map(key => {
      const [r, c] = key.split(',').map(Number);
      return { r, c };
    });
  };

  const handleCellPress = (r: number, c: number) => {
    if (isGameOver || movesLeft <= 0) return;

    if (!selectedCell) {
      setSelectedCell({ r, c });
      return;
    }

    // Check adjacency
    const dr = Math.abs(selectedCell.r - r);
    const dc = Math.abs(selectedCell.c - c);
    const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);

    if (!isAdjacent) {
      // Tap another cell to reselect
      setSelectedCell({ r, c });
      return;
    }

    // Perform swap
    const newGrid = grid.map(row => [...row]);
    const temp = newGrid[selectedCell.r][selectedCell.c];
    newGrid[selectedCell.r][selectedCell.c] = newGrid[r][c];
    newGrid[r][c] = temp;

    // Check if swap creates matches
    const matches = findMatches(newGrid);

    if (matches.length === 0) {
      // Revert swap
      setSelectedCell(null);
      return;
    }

    // Valid swap!
    setSelectedCell(null);
    setMovesLeft(m => {
      const nextMoves = m - 1;
      if (nextMoves <= 0) setIsGameOver(true);
      return nextMoves;
    });

    processCascades(newGrid, 1);
  };

  const processCascades = (currentGrid: number[][], currentCombo: number) => {
    const matches = findMatches(currentGrid);
    if (matches.length === 0) {
      setCombo(0);
      setLastMatchText(null);
      return;
    }

    triggerMatchFlash();
    const points = matches.length * 40 * currentCombo;
    setScore(s => {
      const nextScore = s + points;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });

    setCombo(currentCombo);
    setLastMatchText(matches.length >= 5 ? 'SWEET CRUSH! 🌟' : currentCombo > 1 ? `${currentCombo}x COMBO!` : 'TASTY! 🍬');

    // Remove matched items (-1)
    const afterRemoval = currentGrid.map(row => [...row]);
    for (const { r, c } of matches) {
      afterRemoval[r][c] = -1;
    }

    // Drop down columns
    for (let c = 0; c < GRID_SIZE; c++) {
      let writeRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (afterRemoval[r][c] !== -1) {
          afterRemoval[writeRow][c] = afterRemoval[r][c];
          if (writeRow !== r) afterRemoval[r][c] = -1;
          writeRow--;
        }
      }
      // Fill remaining empty top rows with random candies
      for (let r = writeRow; r >= 0; r--) {
        afterRemoval[r][c] = getRandomCandyId();
      }
    }

    setGrid(afterRemoval);

    // Check for cascade chain reactions
    setTimeout(() => {
      processCascades(afterRemoval, currentCombo + 1);
    }, 280);
  };

  const restartGame = () => {
    setGrid(createInitialGrid());
    setSelectedCell(null);
    setScore(0);
    setMovesLeft(25);
    setCombo(0);
    setLastMatchText(null);
    setIsGameOver(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header Metrics */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>MOVES</Text>
          <Text style={[styles.badgeValue, { color: movesLeft <= 5 ? theme.danger : theme.text }]}>
            {movesLeft}
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>SCORE</Text>
          <Text style={[styles.badgeValue, { color: theme.primary }]}>{score}</Text>
        </View>

        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>TARGET</Text>
          <Text style={[styles.badgeValue, { color: theme.accent }]}>2000</Text>
        </View>
      </View>

      {/* Combo Banner */}
      {lastMatchText && (
        <View style={[styles.comboBanner, { backgroundColor: theme.primaryGlow, borderColor: theme.primary }]}>
          <Text style={[styles.comboBannerText, { color: theme.primary }]}>{lastMatchText}</Text>
        </View>
      )}

      {/* 6x6 Candy Board */}
      <View
        style={[
          styles.board,
          {
            width: BOARD_WIDTH,
            height: BOARD_WIDTH,
            backgroundColor: theme.background,
            borderColor: theme.border,
          },
        ]}
      >
        {grid.map((row, r) => (
          <View key={`row-${r}`} style={styles.boardRow}>
            {row.map((candyId, c) => {
              const candy = CANDY_TYPES[candyId] || CANDY_TYPES[0];
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;

              return (
                <TouchableOpacity
                  key={`cell-${r}-${c}`}
                  activeOpacity={0.8}
                  onPress={() => handleCellPress(r, c)}
                  style={[
                    styles.cell,
                    {
                      width: CELL_SIZE - 4,
                      height: CELL_SIZE - 4,
                      backgroundColor: theme.card,
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.candyCircle,
                      {
                        backgroundColor: candy.color,
                        shadowColor: candy.color,
                        transform: [{ scale: isSelected ? selectPulse : 1 }],
                      },
                    ]}
                  >
                    <Ionicons name={candy.icon} size={18} color="#FFF" />
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Match Burst Flash */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashOverlay,
            {
              backgroundColor: theme.secondary,
              opacity: matchFlash.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
            },
          ]}
        />

        {/* Game Over / Target Cleared Screen */}
        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Ionicons
              name={score >= 2000 ? 'trophy' : 'timer-outline'}
              size={54}
              color={score >= 2000 ? '#F59E0B' : theme.textMuted}
            />
            <Text style={[styles.gameOverTitle, { color: theme.text }]}>
              {score >= 2000 ? 'SWEET VICTORY!' : 'OUT OF MOVES'}
            </Text>
            <Text style={[styles.gameOverScore, { color: theme.textMuted }]}>
              Final Score: {score} / 2000
            </Text>
            <TouchableOpacity
              style={[styles.restartBtn, { backgroundColor: theme.primary }]}
              onPress={restartGame}
              activeOpacity={0.8}
            >
              <Text style={styles.restartBtnText}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Guide Note */}
      <View style={[styles.tipCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="sparkles" size={16} color={theme.primary} />
        <Text style={[styles.tipText, { color: theme.textMuted }]}>
          Tap any candy then tap an adjacent neighbor to swap. Line up 3 or more matching candies to trigger cascading candy explosions!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  badge: {
    alignItems: 'center',
    minWidth: 70,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  badgeValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  comboBanner: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  comboBannerText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  board: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    margin: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  candyCircle: {
    width: '82%',
    height: '82%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFill,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  gameOverScore: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 18,
  },
  restartBtn: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 12,
  },
  restartBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    width: '100%',
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
});
