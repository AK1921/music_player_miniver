// ==============================================================================
// NEXORA MINI-GAMES: RETRO SNAKE
// Lightweight offline interactive game
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';

const GRID_SIZE = 14;
const CELL_SIZE = Math.floor((Dimensions.get('window').width - 64) / GRID_SIZE);

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

export const SnakeGame: React.FC = () => {
  const { theme } = useThemeStore();
  const [snake, setSnake] = useState<Position[]>([
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ]);
  const [food, setFood] = useState<Position>({ x: 10, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const directionRef = useRef(direction);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const generateFood = (): Position => {
    let newFood: Position;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  };

  const restartGame = () => {
    setSnake([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
    setFood(generateFood());
    setDirection('RIGHT');
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const interval = setInterval(() => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        const currentDir = directionRef.current;

        if (currentDir === 'UP') head.y -= 1;
        else if (currentDir === 'DOWN') head.y += 1;
        else if (currentDir === 'LEFT') head.x -= 1;
        else if (currentDir === 'RIGHT') head.x += 1;

        // Wall collisions
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setIsGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        // Self collisions
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          setIsGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Eat food
        if (head.x === food.x && head.y === food.y) {
          setScore(s => {
            const nextScore = s + 10;
            if (nextScore > highScore) setHighScore(nextScore);
            return nextScore;
          });
          setFood(generateFood());
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, food, highScore]);

  const changeDirection = (newDir: Direction) => {
    const cur = directionRef.current;
    if (
      (newDir === 'UP' && cur !== 'DOWN') ||
      (newDir === 'DOWN' && cur !== 'UP') ||
      (newDir === 'LEFT' && cur !== 'RIGHT') ||
      (newDir === 'RIGHT' && cur !== 'LEFT')
    ) {
      setDirection(newDir);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Score Header */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>SCORE</Text>
          <Text style={[styles.badgeValue, { color: theme.primary }]}>{score}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>BEST</Text>
          <Text style={[styles.badgeValue, { color: theme.accent }]}>{highScore}</Text>
        </View>
      </View>

      {/* Grid Canvas */}
      <View
        style={[
          styles.grid,
          {
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
            borderColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        {snake.map((segment, index) => (
          <View
            key={`snake-${index}`}
            style={[
              styles.cell,
              {
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                backgroundColor: index === 0 ? theme.primary : theme.secondary,
                borderRadius: index === 0 ? 6 : 4,
              },
            ]}
          />
        ))}

        <View
          style={[
            styles.cell,
            {
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              backgroundColor: theme.danger,
              borderRadius: (CELL_SIZE - 2) / 2,
            },
          ]}
        />

        {(!isPlaying || isGameOver) && (
          <View style={styles.overlay}>
            <Text style={[styles.overlayTitle, { color: theme.text }]}>
              {isGameOver ? 'GAME OVER' : 'RETRO SNAKE'}
            </Text>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: theme.primary }]}
              onPress={restartGame}
            >
              <Text style={styles.startButtonText}>
                {isGameOver ? 'PLAY AGAIN' : 'START GAME'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* D-Pad Controls */}
      <View style={styles.dpad}>
        <TouchableOpacity
          style={[styles.dpadBtn, { backgroundColor: theme.card }]}
          onPress={() => changeDirection('UP')}
        >
          <Ionicons name="chevron-up" size={28} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.dpadHorizontal}>
          <TouchableOpacity
            style={[styles.dpadBtn, { backgroundColor: theme.card }]}
            onPress={() => changeDirection('LEFT')}
          >
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dpadBtn, { backgroundColor: theme.card }]}
            onPress={() => changeDirection('RIGHT')}
          >
            <Ionicons name="chevron-forward" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.dpadBtn, { backgroundColor: theme.card }]}
          onPress={() => changeDirection('DOWN')}
        >
          <Ionicons name="chevron-down" size={28} color={theme.text} />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  badge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  badgeValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  grid: {
    position: 'relative',
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: 1,
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dpad: {
    alignItems: 'center',
    marginTop: 16,
  },
  dpadHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 140,
    marginVertical: 4,
  },
  dpadBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
