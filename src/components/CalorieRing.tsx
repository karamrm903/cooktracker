import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface CalorieRingProps {
  calories: number;
  goal: number;
}

export function CalorieRing({ calories, goal }: CalorieRingProps) {
  const size = 190;
  const strokeWidth = 14;
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
            <Stop offset="0%" stopColor="#FF7A18" />
            <Stop offset="100%" stopColor="#FF3B30" />
          </LinearGradient>
        </Defs>
        <Circle
          stroke="#2A2A2A"
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
        <Text style={{ fontSize: 32, fontWeight: '700', color: 'white' }}>
          {calories}
        </Text>

        <Text style={{ color: '#999', marginTop: 2 }}>
          {diff >= 0
            ? `+${diff} over goal`
            : `${Math.abs(diff)} left`}
        </Text>
      </View>
    </View>
  );
}
