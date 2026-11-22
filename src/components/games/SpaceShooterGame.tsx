// ==============================================================================
// NEXORA MINI-GAMES: RETRO SPACE ROCKET SHOOTER
// Fast-paced space action with rocket laser firing, asteroid explosions & alien duels
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
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
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 48, 336);
const CANVAS_HEIGHT = 380;
const ROCKET_WIDTH = 36;
const ROCKET_HEIGHT = 36;

interface Laser {
  id: number;
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  type: 'alien' | 'asteroid';
  speed: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
}

export const SpaceShooterGame: React.FC = () => {
  const { theme } = useThemeStore();
  const [rocketX, setRocketX] = useState<number>(CANVAS_WIDTH / 2 - ROCKET_WIDTH / 2);
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Animated values
  const [thrusterFlame] = useState(() => new Animated.Value(0.7));
  const [screenShake] = useState(() => new Animated.Value(0));

  // Starfield background
  const [stars] = useState(() =>
    Array(24).fill(0).map((_, i) => ({
      id: i,
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.7 + 0.3,
    }))
  );

  const rocketXRef = useRef(rocketX);
  useEffect(() => {
    rocketXRef.current = rocketX;
  }, [rocketX]);

  const livesRef = useRef(lives);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    // Engine flame flickering animation
    const flicker = Animated.loop(
      Animated.sequence([
        Animated.timing(thrusterFlame, { toValue: 1.3, duration: 90, useNativeDriver: true }),
        Animated.timing(thrusterFlame, { toValue: 0.7, duration: 90, useNativeDriver: true }),
      ])
    );
    flicker.start();
    return () => flicker.stop();
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(screenShake, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const fireLaser = () => {
    if (!isPlaying || isGameOver) return;
    const currentX = rocketXRef.current;
    const newLaser: Laser = {
      id: Date.now() + Math.random(),
      x: currentX + ROCKET_WIDTH / 2 - 2,
      y: CANVAS_HEIGHT - ROCKET_HEIGHT - 10,
    };
    setLasers(prev => [...prev, newLaser]);
  };

  const moveLeft = () => {
    setRocketX(prev => Math.max(10, prev - 24));
  };

  const moveRight = () => {
    setRocketX(prev => Math.min(CANVAS_WIDTH - ROCKET_WIDTH - 10, prev + 24));
  };

  // Main game tick loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const gameLoop = setInterval(() => {
      // 1. Move lasers up
      setLasers(prevLasers =>
        prevLasers
          .map(l => ({ ...l, y: l.y - 12 }))
          .filter(l => l.y > -10)
      );

      // 2. Move enemies down
      setEnemies(prevEnemies => {
        let remainingEnemies: Enemy[] = [];
        let hitBottomCount = 0;

        for (const enemy of prevEnemies) {
          const nextY = enemy.y + enemy.speed;
          if (nextY > CANVAS_HEIGHT - 30) {
            hitBottomCount++;
          } else {
            remainingEnemies.push({ ...enemy, y: nextY });
          }
        }

        if (hitBottomCount > 0) {
          triggerShake();
          setLives(l => {
            const nextLives = l - hitBottomCount;
            if (nextLives <= 0) {
              setIsGameOver(true);
              setIsPlaying(false);
            }
            return Math.max(0, nextLives);
          });
        }

        return remainingEnemies;
      });

      // 3. Collision detection (Lasers vs Enemies)
      setLasers(currentLasers => {
        let survivingLasers = [...currentLasers];

        setEnemies(currentEnemies => {
          let survivingEnemies: Enemy[] = [];
          const newExplosions: Explosion[] = [];
          let scoreIncrease = 0;

          for (const enemy of currentEnemies) {
            let hit = false;
            survivingLasers = survivingLasers.filter(laser => {
              if (hit) return true;
              const dx = Math.abs(laser.x - (enemy.x + 12));
              const dy = Math.abs(laser.y - (enemy.y + 12));
              if (dx < 18 && dy < 18) {
                hit = true;
                scoreIncrease += enemy.type === 'alien' ? 50 : 30;
                newExplosions.push({ id: Date.now() + Math.random(), x: enemy.x, y: enemy.y });
                return false; // remove laser
              }
              return true;
            });

            if (!hit) {
              survivingEnemies.push(enemy);
            }
          }

          if (scoreIncrease > 0) {
            setScore(s => {
              const nextScore = s + scoreIncrease;
              if (nextScore > highScore) setHighScore(nextScore);
              return nextScore;
            });
            if (newExplosions.length > 0) {
              setExplosions(prev => [...prev, ...newExplosions]);
              setTimeout(() => {
                setExplosions([]);
              }, 300);
            }
          }

          return survivingEnemies;
        });

        return survivingLasers;
      });
    }, 45);

    // Enemy spawn loop
    const spawnLoop = setInterval(() => {
      const isAlien = Math.random() > 0.4;
      const newEnemy: Enemy = {
        id: Date.now() + Math.random(),
        x: Math.random() * (CANVAS_WIDTH - 40) + 10,
        y: -20,
        type: isAlien ? 'alien' : 'asteroid',
        speed: Math.random() * 2.5 + 2.5,
      };
      setEnemies(prev => [...prev.slice(-8), newEnemy]);
    }, 1100);

    return () => {
      clearInterval(gameLoop);
      clearInterval(spawnLoop);
    };
  }, [isPlaying, isGameOver, highScore]);

  const startGame = () => {
    setRocketX(CANVAS_WIDTH / 2 - ROCKET_WIDTH / 2);
    setLasers([]);
    setEnemies([]);
    setExplosions([]);
    setScore(0);
    setLives(3);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header Metrics */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>SHIELDS</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {Array(3).fill(0).map((_, i) => (
              <Ionicons
                key={`life-${i}`}
                name={i < lives ? 'heart' : 'heart-dislike'}
                size={16}
                color={i < lives ? theme.danger : theme.textSubtle}
              />
            ))}
          </View>
        </View>

        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>SCORE</Text>
          <Text style={[styles.badgeValue, { color: theme.primary }]}>{score}</Text>
        </View>

        <View style={styles.badge}>
          <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>BEST</Text>
          <Text style={[styles.badgeValue, { color: theme.accent }]}>{highScore}</Text>
        </View>
      </View>

      {/* Arcade Canvas */}
      <Animated.View
        style={[
          styles.canvas,
          {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundColor: '#050711',
            borderColor: theme.border,
            transform: [{ translateX: screenShake }],
          },
        ]}
      >
        {/* Starfield */}
        {stars.map(star => (
          <View
            key={`star-${star.id}`}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        ))}

        {/* Lasers */}
        {lasers.map(laser => (
          <View
            key={`laser-${laser.id}`}
            style={[
              styles.laser,
              {
                left: laser.x,
                top: laser.y,
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
              },
            ]}
          />
        ))}

        {/* Enemies */}
        {enemies.map(enemy => (
          <View
            key={`enemy-${enemy.id}`}
            style={[
              styles.enemy,
              {
                left: enemy.x,
                top: enemy.y,
              },
            ]}
          >
            <Ionicons
              name={enemy.type === 'alien' ? 'planet' : 'disc'}
              size={24}
              color={enemy.type === 'alien' ? theme.secondary : '#F59E0B'}
            />
          </View>
        ))}

        {/* Explosions */}
        {explosions.map(exp => (
          <View
            key={`exp-${exp.id}`}
            style={[
              styles.explosion,
              {
                left: exp.x - 4,
                top: exp.y - 4,
              },
            ]}
          >
            <Ionicons name="sparkles" size={28} color="#FBBF24" />
          </View>
        ))}

        {/* Player Rocket */}
        <View
          style={[
            styles.rocketBox,
            {
              left: rocketX,
              top: CANVAS_HEIGHT - ROCKET_HEIGHT - 12,
            },
          ]}
        >
          <Ionicons name="rocket" size={ROCKET_WIDTH} color={theme.accent} />
          {/* Animated Thruster Flame */}
          <Animated.View
            style={[
              styles.flame,
              {
                backgroundColor: '#F97316',
                transform: [{ scaleY: thrusterFlame }],
              },
            ]}
          />
        </View>

        {/* Game Over / Start Overlay */}
        {(!isPlaying || isGameOver) && (
          <View style={styles.overlay}>
            <Ionicons
              name={isGameOver ? 'skull-outline' : 'rocket-outline'}
              size={54}
              color={isGameOver ? theme.danger : theme.primary}
            />
            <Text style={[styles.overlayTitle, { color: theme.text }]}>
              {isGameOver ? 'MISSION FAILED' : 'GALAXY DEFENDER'}
            </Text>
            <Text style={[styles.overlaySub, { color: theme.textMuted }]}>
              {isGameOver ? `Final Score: ${score}` : 'Defend orbit from incoming invaders!'}
            </Text>
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: theme.primary }]}
              onPress={startGame}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>{isGameOver ? 'RETRY MISSION' : 'LAUNCH ROCKET'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Retro Arcade Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.dirBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={moveLeft}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fireBtn, { backgroundColor: theme.danger, shadowColor: theme.danger }]}
          onPress={fireLaser}
          activeOpacity={0.75}
        >
          <Ionicons name="flame" size={22} color="#FFF" />
          <Text style={styles.fireBtnText}>FIRE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dirBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={moveRight}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={28} color={theme.text} />
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
  canvas: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  laser: {
    position: 'absolute',
    width: 4,
    height: 14,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
  },
  enemy: {
    position: 'absolute',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  explosion: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rocketBox: {
    position: 'absolute',
    width: ROCKET_WIDTH,
    height: ROCKET_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flame: {
    position: 'absolute',
    bottom: -6,
    width: 8,
    height: 12,
    borderRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 7, 17, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  overlaySub: {
    fontSize: 13,
    marginBottom: 20,
  },
  startBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  startBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: CANVAS_WIDTH,
    marginTop: 16,
  },
  dirBtn: {
    width: 68,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  fireBtn: {
    flex: 1,
    height: 54,
    marginHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  fireBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
