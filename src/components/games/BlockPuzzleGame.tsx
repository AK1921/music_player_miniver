// ==============================================================================
// NEXORA MINI-GAMES: 8x8 BLOCK BLAST PUZZLE
// Addictive offline block placement, row/col line clears & animated score pops
// ==============================================================================

import React, { useState } from 'react';
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
const BOARD_SIZE = 8;
const BOARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 336);
const CELL_SIZE = Math.floor(BOARD_WIDTH / BOARD_SIZE);

interface Shape {
  id: string;
  matrix: number[][];
  color: string;
}

const SHAPE_DEFINITIONS = [
  // 1x1
  { matrix: [[1]], color: '#F59E0B' },
  // 2x2
  { matrix: [[1, 1], [1, 1]], color: '#3B82F6' },
  // 3x1
  { matrix: [[1, 1, 1]], color: '#10B981' },
  // 1x3
  { matrix: [[1], [1], [1]], color: '#10B981' },
  // 4x1
  { matrix: [[1, 1, 1, 1]], color: '#8B5CF6' },
  // 1x4
  { matrix: [[1], [1], [1], [1]], color: '#8B5CF6' },
  // 2x3 L-shape
  { matrix: [[1, 0], [1, 0], [1, 1]], color: '#EC4899' },
  // Reverse L
  { matrix: [[0, 1], [0, 1], [1, 1]], color: '#EC4899' },
  // T-shape
  { matrix: [[1, 1, 1], [0, 1, 0]], color: '#06B6D4' },
  // 2x2 corner
  { matrix: [[1, 1], [1, 0]], color: '#F97316' },
];

function getRandomShapes(): Shape[] {
  const selected: Shape[] = [];
  for (let i = 0; i < 3; i++) {
    const template = SHAPE_DEFINITIONS[Math.floor(Math.random() * SHAPE_DEFINITIONS.length)];
    selected.push({
      id: `shape-${Date.now()}-${i}-${Math.random()}`,
      matrix: template.matrix,
      color: template.color,
    });
  }
  return selected;
}

export const BlockPuzzleGame: React.FC = () => {
  const { theme } = useThemeStore();
  const [board, setBoard] = useState<(string | null)[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [availableShapes, setAvailableShapes] = useState<Shape[]>(getRandomShapes);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [lastClearedLines, setLastClearedLines] = useState<number>(0);

  // Animation values
  const [scoreAnim] = useState(() => new Animated.Value(1));
  const [flashAnim] = useState(() => new Animated.Value(0));

  const triggerScoreAnim = () => {
    Animated.sequence([
      Animated.timing(scoreAnim, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.timing(scoreAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const triggerFlashAnim = () => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const canPlaceShape = (grid: (string | null)[][], shape: Shape, startRow: number, startCol: number): boolean => {
    const sRows = shape.matrix.length;
    const sCols = shape.matrix[0].length;

    if (startRow + sRows > BOARD_SIZE || startCol + sCols > BOARD_SIZE) {
      return false;
    }

    for (let r = 0; r < sRows; r++) {
      for (let c = 0; c < sCols; c++) {
        if (shape.matrix[r][c] === 1) {
          if (grid[startRow + r][startCol + c] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const checkHasMoves = (grid: (string | null)[][], shapes: Shape[]): boolean => {
    for (const shape of shapes) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (canPlaceShape(grid, shape, r, c)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const handleCellPress = (targetRow: number, targetCol: number) => {
    if (isGameOver || selectedShapeIndex === null) return;
    const shape = availableShapes[selectedShapeIndex];
    if (!shape) return;

    if (!canPlaceShape(board, shape, targetRow, targetCol)) {
      return;
    }

    // Clone board and place piece
    const newBoard = board.map(row => [...row]);
    let blockCount = 0;
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[0].length; c++) {
        if (shape.matrix[r][c] === 1) {
          newBoard[targetRow + r][targetCol + c] = shape.color;
          blockCount++;
        }
      }
    }

    // Check full rows
    const rowsToClear: number[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (newBoard[r].every(cell => cell !== null)) {
        rowsToClear.push(r);
      }
    }

    // Check full columns
    const colsToClear: number[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      let full = true;
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (newBoard[r][c] === null) {
          full = false;
          break;
        }
      }
      if (full) colsToClear.push(c);
    }

    // Clear completed lines
    for (const r of rowsToClear) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        newBoard[r][c] = null;
      }
    }
    for (const c of colsToClear) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        newBoard[r][c] = null;
      }
    }

    const clearedCount = rowsToClear.length + colsToClear.length;
    setLastClearedLines(clearedCount);

    let pointsGained = blockCount * 10;
    if (clearedCount > 0) {
      const lineBonus = clearedCount * 100 * (combo + 1);
      pointsGained += lineBonus;
      setCombo(prev => prev + 1);
      triggerFlashAnim();
    } else {
      setCombo(0);
    }

    const nextScore = score + pointsGained;
    setScore(nextScore);
    if (nextScore > highScore) setHighScore(nextScore);
    triggerScoreAnim();

    // Remove used shape
    const nextShapes = availableShapes.filter((_, idx) => idx !== selectedShapeIndex);
    let finalShapes = nextShapes;
    if (nextShapes.length === 0) {
      finalShapes = getRandomShapes();
    }

    setBoard(newBoard);
    setAvailableShapes(finalShapes);
    setSelectedShapeIndex(finalShapes.length > 0 ? 0 : null);

    // Check game over
    if (!checkHasMoves(newBoard, finalShapes)) {
      setIsGameOver(true);
    }
  };

  const restartGame = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    const freshShapes = getRandomShapes();
    setAvailableShapes(freshShapes);
    setSelectedShapeIndex(0);
    setScore(0);
    setCombo(0);
    setLastClearedLines(0);
    setIsGameOver(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Score Header */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>SCORE</Text>
          <Animated.Text
            style={[styles.badgeValue, { color: theme.primary, transform: [{ scale: scoreAnim }] }]}
          >
            {score}
          </Animated.Text>
        </View>

        {combo > 1 && (
          <View style={[styles.comboPill, { backgroundColor: theme.primaryGlow, borderColor: theme.primary }]}>
            <Ionicons name="flame" size={14} color={theme.primary} />
            <Text style={[styles.comboText, { color: theme.primary }]}>{combo}x COMBO</Text>
          </View>
        )}

        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>BEST</Text>
          <Text style={[styles.badgeValue, { color: theme.accent }]}>{highScore}</Text>
        </View>
      </View>

      {/* 8x8 Board Container */}
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
        {board.map((row, r) => (
          <View key={`row-${r}`} style={styles.boardRow}>
            {row.map((cellColor, c) => (
              <TouchableOpacity
                key={`cell-${r}-${c}`}
                activeOpacity={0.7}
                onPress={() => handleCellPress(r, c)}
                style={[
                  styles.cell,
                  {
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    backgroundColor: cellColor || theme.card,
                    borderColor: cellColor ? 'rgba(255,255,255,0.25)' : theme.border,
                  },
                ]}
              >
                {cellColor && <View style={styles.cellShine} />}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Clear Flash Effect */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashOverlay,
            {
              backgroundColor: theme.accent,
              opacity: flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.45],
              }),
            },
          ]}
        />

        {/* Game Over Screen */}
        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Ionicons name="skull-outline" size={48} color={theme.danger} />
            <Text style={[styles.gameOverTitle, { color: theme.text }]}>NO MORE MOVES</Text>
            <Text style={[styles.gameOverScore, { color: theme.textMuted }]}>
              Final Score: {score}
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

      {/* Available Shapes Tray */}
      <View style={styles.shapesTray}>
        <Text style={[styles.trayLabel, { color: theme.textSubtle }]}>
          SELECT SHAPE TO PLACE
        </Text>
        <View style={styles.shapesRow}>
          {availableShapes.map((shape, idx) => {
            const isSelected = selectedShapeIndex === idx;
            return (
              <TouchableOpacity
                key={shape.id}
                activeOpacity={0.8}
                onPress={() => setSelectedShapeIndex(idx)}
                style={[
                  styles.shapeCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                    transform: [{ scale: isSelected ? 1.05 : 0.95 }],
                  },
                ]}
              >
                {shape.matrix.map((sRow, sr) => (
                  <View key={`sr-${sr}`} style={{ flexDirection: 'row' }}>
                    {sRow.map((val, sc) => (
                      <View
                        key={`sc-${sr}-${sc}`}
                        style={[
                          styles.miniCell,
                          {
                            backgroundColor: val === 1 ? shape.color : 'transparent',
                            borderColor: val === 1 ? 'rgba(255,255,255,0.3)' : 'transparent',
                          },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Instructions */}
      <View style={[styles.tipCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="bulb-outline" size={16} color={theme.accent} />
        <Text style={[styles.tipText, { color: theme.textMuted }]}>
          Tap a shape below, then tap any board cell to place it. Complete lines horizontally or vertically to clear blocks!
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
    marginBottom: 16,
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
  comboPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  comboText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  board: {
    borderRadius: 14,
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
    margin: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  cellShine: {
    width: '100%',
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFill,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  gameOverScore: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 18,
  },
  restartBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  restartBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shapesTray: {
    width: '100%',
    marginTop: 18,
    alignItems: 'center',
  },
  trayLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  shapesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  shapeCard: {
    width: 82,
    height: 82,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  miniCell: {
    width: 14,
    height: 14,
    margin: 1,
    borderRadius: 3,
    borderWidth: 0.5,
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
