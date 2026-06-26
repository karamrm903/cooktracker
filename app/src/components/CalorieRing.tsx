import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
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

  // Protect against division by zero if goal is 0
  const safeGoal = Math.max(goal, 1);
  const progress = Math.min(calories / safeGoal, 1);
  const strokeDashoffset = circumference * (1 - progress);

  const diff = calories - safeGoal;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF8A3D" />
            <Stop offset="100%" stopColor="#FF6B35" />
          </LinearGradient>
        </Defs>
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        <Circle
          stroke="url(#grad)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
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
