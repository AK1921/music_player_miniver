// ==============================================================================
// NEXORA MINI-GAMES: CYBER TIC-TAC-TOE VS AI
// ==============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';

type Player = 'X' | 'O' | null;

export const TicTacToeGame: React.FC = () => {
  const { theme } = useThemeStore();
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState({ player: 0, ai: 0, ties: 0 });

  const checkWinner = (squares: Player[]): Player | 'TIE' | null => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    if (squares.every(sq => sq !== null)) return 'TIE';
    return null;
  };

  const handleCellPress = (idx: number) => {
    if (board[idx] || winner) return;

    const newBoard = [...board];
    newBoard[idx] = 'X';
    setBoard(newBoard);

    const winResult = checkWinner(newBoard);
    if (winResult) {
      handleGameOver(winResult);
      return;
    }

    // AI Turn (O)
    setTimeout(() => {
      const emptyIndices = newBoard
        .map((val, i) => (val === null ? i : null))
        .filter(i => i !== null) as number[];

      if (emptyIndices.length > 0) {
        // Smart AI choice: pick center or random
        let aiChoice = emptyIndices.includes(4) ? 4 : emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const newBoardAfterAi = [...newBoard];
        newBoardAfterAi[aiChoice] = 'O';
        setBoard([...newBoardAfterAi]);

        const aiWinResult = checkWinner(newBoard);
        if (aiWinResult) {
          handleGameOver(aiWinResult);
        }
      }
    }, 300);
  };

  const handleGameOver = (res: Player | 'TIE') => {
    if (res === 'X') {
      setWinner('YOU WIN!');
      setScore(s => ({ ...s, player: s.player + 1 }));
    } else if (res === 'O') {
      setWinner('AI WINS');
      setScore(s => ({ ...s, ai: s.ai + 1 }));
    } else {
      setWinner('DRAW GAME');
      setScore(s => ({ ...s, ties: s.ties + 1 }));
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>CYBER TIC-TAC-TOE</Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreText, { color: theme.primary }]}>YOU: {score.player}</Text>
          <Text style={[styles.scoreText, { color: theme.danger }]}>AI: {score.ai}</Text>
          <Text style={[styles.scoreText, { color: theme.textMuted }]}>TIE: {score.ties}</Text>
        </View>
      </View>

      <View style={[styles.grid, { borderColor: theme.border }]}>
        {board.map((cell, idx) => (
          <TouchableOpacity
            key={`cell-${idx}`}
            activeOpacity={0.8}
            style={[
              styles.cell,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}
            onPress={() => handleCellPress(idx)}
          >
            <Text
              style={[
                styles.cellText,
                { color: cell === 'X' ? theme.primary : theme.danger },
              ]}
            >
              {cell}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {winner && (
        <View style={styles.winnerBox}>
          <Text style={[styles.winnerText, { color: theme.text }]}>{winner}</Text>
          <TouchableOpacity
            style={[styles.rematchBtn, { backgroundColor: theme.primary }]}
            onPress={resetGame}
          >
            <Text style={styles.rematchText}>PLAY AGAIN</Text>
          </TouchableOpacity>
        </View>
      )}

      {!winner && (
        <TouchableOpacity style={styles.resetBtn} onPress={resetGame}>
          <Text style={[styles.resetLabel, { color: theme.textMuted }]}>RESET BOARD</Text>
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
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  grid: {
    width: 240,
    height: 240,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cell: {
    width: 78,
    height: 78,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 34,
    fontWeight: '900',
  },
  winnerBox: {
    marginTop: 16,
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  rematchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rematchText: {
    color: '#FFF',
    fontWeight: '800',
  },
  resetBtn: {
    marginTop: 14,
  },
  resetLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
