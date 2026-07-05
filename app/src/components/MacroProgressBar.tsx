import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { moderateScale as ms } from "../utils/responsive";
import { FONTS } from "../constants/theme";
import { useTheme } from "@/context/ThemeContext";

interface MacroProgressBarProps {
  protein: number;
  carbs: number;
  fat: number;
  showLabels?: boolean;
}

const MACRO_COLORS = { protein: "#E45255", carbs: "#94AE7F", fat: "#DEA226" };

export default function MacroProgressBar({
  protein,
  carbs,
  fat,
  showLabels = false,
}: MacroProgressBarProps) {
  const { colors } = useTheme();

  // Using standard multipliers for visual weight:
  // Usually it's based on calories: P*4, C*4, F*9
  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const totalKcal = pKcal + cKcal + fKcal;

  if (totalKcal === 0) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.surfaceAlt }]} />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { backgroundColor: colors.surfaceAlt }]}>
        <View style={styles.barFill}>
          {pKcal > 0 && (
            <View
              style={{ flex: pKcal, backgroundColor: MACRO_COLORS.protein }}
            />
          )}
          {cKcal > 0 && (
            <View
              style={{ flex: cKcal, backgroundColor: MACRO_COLORS.carbs }}
            />
          )}
          {fKcal > 0 && (
            <View style={{ flex: fKcal, backgroundColor: MACRO_COLORS.fat }} />
          )}
        </View>
      </View>
      {showLabels && (
        <View style={styles.labels}>
          <Text style={[styles.label, { color: MACRO_COLORS.protein }]}>
            {Math.round(protein)}g pro
          </Text>
          <Text style={[styles.label, { color: MACRO_COLORS.carbs }]}>
            {Math.round(carbs)}g carb
          </Text>
          <Text style={[styles.label, { color: MACRO_COLORS.fat }]}>
            {Math.round(fat)}g fat
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  bar: {
    height: ms(8),
    borderRadius: ms(4),
    overflow: "hidden",
    width: "100%",
  },
  barFill: {
    flex: 1,
    flexDirection: "row",
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: ms(4),
  },
  label: {
    fontSize: ms(11),
    fontWeight: FONTS.semibold,
  },
});
