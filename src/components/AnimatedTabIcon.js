import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

export default function AnimatedTabIcon({ icon, focused }) {
  const scale = useRef(new Animated.Value(focused ? 1.18 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.18 : 1,
      friction: 7,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.View
      style={{
        transform: [
          { scale },
          { translateY: focused ? -2 : 0 },
        ],
      }}
    >
      <Text style={{ fontSize: 20 }}>{icon}</Text>
    </Animated.View>
  );
}
