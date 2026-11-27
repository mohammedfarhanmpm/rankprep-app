import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

const COLORS = ['#f4a3bf', '#cdb8ff', '#a8e6c8', '#ffd1b3', '#a9cdff', '#ffe58f'];

/** A short burst of pastel confetti falling over the screen (plays once). */
export function Confetti({ count = 36 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      size: 7 + Math.random() * 7,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 600,
      dur: 2200 + Math.random() * 1600,
      drift: (Math.random() - 0.5) * 120,
      spin: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
      round: Math.random() > 0.6,
      v: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    Animated.parallel(
      pieces.map((p) => Animated.timing(p.v, { toValue: 1, duration: p.dur, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true })),
    ).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? p.size / 2 : 2,
            backgroundColor: p.color,
            opacity: p.v.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin * 360}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
