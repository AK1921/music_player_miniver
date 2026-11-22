// ==============================================================================
// NEXORA MINI-GAMES: CYBER MEMORY MATCH
// Offline memory card matching puzzle
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';

const ICONS = ['🚀', '⚡', '💎', '🔥', '🪐', '🎧', '👾', '🌈'];

interface Card {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryMatchGame: React.FC = () => {
  const { theme } = useThemeStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);

  const initGame = () => {
    const deck: Card[] = [];
    const duplicated = [...ICONS, ...ICONS];
    const shuffled = duplicated.sort(() => Math.random() - 0.5);

    shuffled.forEach((icon, index) => {
      deck.push({
        id: index,
        icon,
        isFlipped: false,
        isMatched: false,
      });
    });

    setCards(deck);
    setSelectedCards([]);
    setMoves(0);
    setIsWon(false);
  };

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      initGame();
      setInitialized(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCardPress = (index: number) => {
    if (selectedCards.length === 2 || cards[index].isFlipped || cards[index].isMatched) {
      return;
    }

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      const [firstIdx, secondIdx] = newSelected;

      if (newCards[firstIdx].icon === newCards[secondIdx].icon) {
        const updatedCards = newCards.map((c, idx) => {
          if (idx === firstIdx || idx === secondIdx) {
            return { ...c, isMatched: true };
          }
          return c;
        });
        setCards(updatedCards);
        setSelectedCards([]);

        // Check if all matched
        if (updatedCards.every(c => c.isMatched)) {
          setIsWon(true);
        }
      } else {
        setTimeout(() => {
          const updatedCards = newCards.map((c, idx) => {
            if (idx === firstIdx || idx === secondIdx) {
              return { ...c, isFlipped: false };
            }
            return c;
          });
          setCards([...updatedCards]);
          setSelectedCards([]);
        }, 800);
      }
    }
  };

  const cardWidth = (Dimensions.get('window').width - 80) / 4;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>MEMORY MATCH</Text>
        <Text style={[styles.moves, { color: theme.primary }]}>MOVES: {moves}</Text>
      </View>

      <View style={styles.grid}>
        {cards.map((card, idx) => (
          <TouchableOpacity
            key={card.id}
            activeOpacity={0.8}
            onPress={() => handleCardPress(idx)}
            style={[
              styles.card,
              {
                width: cardWidth,
                height: cardWidth * 1.1,
                backgroundColor: card.isFlipped || card.isMatched ? theme.card : theme.primary,
                borderColor: card.isMatched ? theme.success : theme.border,
              },
            ]}
          >
            <Text style={styles.cardText}>
              {card.isFlipped || card.isMatched ? card.icon : '❓'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isWon && (
        <View style={styles.winBanner}>
          <Text style={[styles.winTitle, { color: theme.success }]}>🎉 PUZZLE SOLVED!</Text>
          <Text style={[styles.winSubtitle, { color: theme.textMuted }]}>
            Completed in {moves} moves.
          </Text>
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: theme.primary }]}
            onPress={initGame}
          >
            <Text style={styles.resetBtnText}>PLAY AGAIN</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isWon && (
        <TouchableOpacity
          style={[styles.restartBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={initGame}
        >
          <Text style={[styles.restartBtnText, { color: theme.text }]}>SHUFFLE / RESTART</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  moves: {
    fontSize: 14,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    fontSize: 26,
  },
  winBanner: {
    alignItems: 'center',
    marginTop: 16,
  },
  winTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  winSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  resetBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetBtnText: {
    color: '#FFF',
    fontWeight: '800',
  },
  restartBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  restartBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

