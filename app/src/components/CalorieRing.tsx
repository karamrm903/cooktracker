import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FONT_SIZES } from '../constants/theme';
import { moderateScale as ms } from '../utils/responsive';

interface CalorieRingProps {
  calories: number;
  goal: number;
  // Optional theme colors so the ring fits a light card (new dashboard UI).
  textColor?: string;
  subColor?: string;
  trackColor?: string;
  size?: number;
}

// Progress fills clockwise from the top. The filled arc is coloured in bands by
// how far along it is: 0–30% orange, 30–60% amber, 60–100% green.
const BANDS = [
  { color: '#FF8A45', start: 0,    end: 0.3 },
  { color: '#FCB857', start: 0.3,  end: 0.6 },
  { color: '#94AE7F', start: 0.6,  end: 1 },
];

export function CalorieRing({
  calories,
  goal,
  textColor = '#111111',
  subColor = '#9CA3AF',
  trackColor = '#EFEDE6',
  size = ms(170),
}: CalorieRingProps) {
  const strokeWidth = ms(14);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  const safeGoal = Math.max(goal, 1);
  const progress = Math.min(Math.max(calories / safeGoal, 0), 1);
  const diff = calories - safeGoal;

  // Only the bands the progress has reached, clipped to the current progress.
  const arcs = BANDS
    .map((b) => {
      const segEnd = Math.min(progress, b.end);
      if (segEnd <= b.start) return null;
      const frac = segEnd - b.start;
      return {
        color: b.color,
        dash: frac * circumference,
        rotation: -90 + b.start * 360,
      };
    })
    .filter(Boolean) as { color: string; dash: number; rotation: number }[];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Empty track */}
        <Circle
          stroke={trackColor}
          fill="none"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Coloured progress bands */}
        {arcs.map((arc, i) => (
          <Circle
            key={i}
            stroke={arc.color}
            fill="none"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dash} ${circumference}`}
            strokeLinecap="butt"
            transform={`rotate(${arc.rotation} ${center} ${center})`}
          />
        ))}
      </Svg>

      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: ms(40), fontWeight: '700', color: textColor, letterSpacing: -1 }}>
          {calories}
        </Text>

        <Text style={{ color: subColor, marginTop: ms(2), fontSize: FONT_SIZES.small }}>
          {diff >= 0
            ? `+${diff} over goal`
            : `${Math.abs(diff)} left`}
        </Text>
      </View>
    </View>
  );
}
