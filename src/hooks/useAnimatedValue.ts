// ==============================================================================
// useAnimatedValue
// Lazily creates a single Animated.Value via the useState initializer, so no ref
// `.current` is ever read during render (satisfies react-hooks/refs lint rule).
// The value is stable across renders and safe to animate in effects/handlers.
// ==============================================================================

import { useState } from 'react';
import { Animated } from 'react-native';

export function useAnimatedValue(initialValue: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}
