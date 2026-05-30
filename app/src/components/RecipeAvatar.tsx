import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const PALETTE = ['#FF6B35', '#4CAF50', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface Props {
  name: string;
  size?: number;
}

export default function RecipeAvatar({ name, size = 40 }: Props) {
  const bg = colorForName(name || '?');
  const letter = (name || '?').trim()[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#FFFFFF', fontWeight: '600' },
});
