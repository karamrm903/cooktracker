import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { FONTS, FONT_SIZES, RADIUS, SHADOWS } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import Svg, { Circle } from "react-native-svg";

interface DailyPlateScoreCardProps {
  score?: number;
  target?: number;
  platesGoal?: number;
  currentBest?: number;
  weeklyAvg?: number;
  completedMeals?: number;
  totalMeals?: number;
  completedSnacks?: number;
  totalSnacks?: number;
  onScanPlate: () => void;
  plateImageUrl?: string | null;
}

export default function DailyPlateScoreCard({
  score = 89,
  target = 88,
  platesGoal = 2,
  currentBest = 89,
  weeklyAvg = 53,
  completedMeals = 1,
  totalMeals = 2,
  completedSnacks = 0,
  totalSnacks = 2,
  onScanPlate,
  plateImageUrl,
}: DailyPlateScoreCardProps) {
  const { colors, isDark } = useTheme();

  // Circular ring dimension
  const ringSize = ms(118);
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={styles.container}>
      {/* ── MAIN HERO CARD ── */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.border : "#FEEBDD",
          },
          SHADOWS.sm,
        ]}
      >
        <View style={styles.heroTopRow}>
          {/* Left Column: Label, Score, Target */}
          <View style={styles.heroLeftCol}>
            <Text style={[styles.cardTitle, { color: colors.textMuted }]}>
              TODAY'S{"\n"}PLATE SCORE
            </Text>
            <Text style={[styles.mainScoreVal, { color: colors.text }]}>
              {score}%
            </Text>
            <Text style={[styles.targetSub, { color: colors.textMuted }]}>
              Your average plate target:{" "}
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{target}%</Text>
            </Text>
          </View>

          {/* Right Column: Circular Progress Ring surrounding plate photo */}
          <View style={styles.heroRightCol}>
            <View style={{ width: ringSize, height: ringSize, alignItems: "center", justifyContent: "center" }}>
              <Svg
                width={ringSize}
                height={ringSize}
                style={{ transform: [{ rotate: "-90deg" }] }}
              >
                {/* Track */}
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke={isDark ? "#2A2F3D" : "#F0ECE8"}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Green progress */}
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="#22C55E"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </Svg>

              {/* Inner plate thumbnail */}
              <View style={[styles.plateImageHolder, { borderColor: isDark ? colors.border : "#FEEBDD" }]}>
                <Image
                  source={
                    plateImageUrl
                      ? { uri: plateImageUrl }
                      : require("../../assets/webp/CupPlant.webp")
                  }
                  style={styles.plateImage}
                  resizeMode="cover"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Center CTA Button: Scan your plate */}
        <TouchableOpacity
          style={[
            styles.scanPlateBtn,
            {
              backgroundColor: isDark ? colors.surfaceAlt : "#FFF6EE",
              borderColor: isDark ? colors.border : "#FEEBDD",
            },
          ]}
          onPress={onScanPlate}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={ms(18)} color={colors.primary} />
          <Text style={[styles.scanPlateBtnText, { color: colors.primary }]}>Scan your plate</Text>
        </TouchableOpacity>

        {/* Bottom 3 Summary Metrics */}
        <View
          style={[
            styles.metricsRow,
            { borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "#F2EBE5" },
          ]}
        >
          <View style={styles.metricCol}>
            <View style={styles.metricIconLabel}>
              <Ionicons name="disc-outline" size={ms(12)} color={colors.textMuted} />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                TODAY'S GOAL
              </Text>
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>
              {platesGoal} plates
            </Text>
          </View>

          <View style={styles.metricCol}>
            <View style={styles.metricIconLabel}>
              <Ionicons name="trophy-outline" size={ms(12)} color={colors.textMuted} />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                CURRENT BEST
              </Text>
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>
              {currentBest}%
            </Text>
          </View>

          <View style={styles.metricCol}>
            <View style={styles.metricIconLabel}>
              <Ionicons name="bar-chart-outline" size={ms(12)} color={colors.textMuted} />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                WEEKLY AVG
              </Text>
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>
              {weeklyAvg}%
            </Text>
          </View>
        </View>
      </View>

      {/* ── DAILY MEAL SLOTS SECTION (Image 5 bottom) ── */}
      <View
        style={[
          styles.slotsCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.border : "#FEEBDD",
          },
          SHADOWS.sm,
        ]}
      >
        <View style={styles.slotsRow}>
          {/* Slot 1: Meal 1 (Scored & Checked) */}
          <TouchableOpacity
            style={styles.slotCol}
            onPress={onScanPlate}
            activeOpacity={0.8}
          >
            <View style={styles.scoredSlotRing}>
              <Text style={styles.scoredSlotText}>{score}%</Text>
              <View style={styles.slotCheckBadge}>
                <Ionicons name="checkmark" size={ms(11)} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.slotLabel, { color: colors.text }]}>Meal 1</Text>
          </TouchableOpacity>

          {/* Slot 2: Meal 2 (Dashed target) */}
          <TouchableOpacity
            style={styles.slotCol}
            onPress={onScanPlate}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.dashedSlotRing,
                { borderColor: isDark ? "#2A2F3D" : "#CBD5E1" },
              ]}
            >
              <Ionicons name="add" size={ms(22)} color={colors.textMuted} />
            </View>
            <Text style={[styles.slotLabel, { color: colors.text }]}>Meal 2</Text>
          </TouchableOpacity>

          {/* Slot 3: Snack 1 (Optional) */}
          <TouchableOpacity
            style={styles.slotCol}
            onPress={onScanPlate}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.dashedSlotRing,
                { borderColor: isDark ? "#2A2F3D" : "#CBD5E1" },
              ]}
            >
              <Ionicons name="add" size={ms(20)} color={colors.textMuted} />
            </View>
            <Text style={[styles.slotLabel, { color: colors.text }]}>Snack 1</Text>
            <Text style={[styles.slotSubLabel, { color: colors.textMuted }]}>
              Optional
            </Text>
          </TouchableOpacity>

          {/* Slot 4: Snack 2 (Optional) */}
          <TouchableOpacity
            style={styles.slotCol}
            onPress={onScanPlate}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.dashedSlotRing,
                { borderColor: isDark ? "#2A2F3D" : "#CBD5E1" },
              ]}
            >
              <Ionicons name="add" size={ms(20)} color={colors.textMuted} />
            </View>
            <Text style={[styles.slotLabel, { color: colors.text }]}>Snack 2</Text>
            <Text style={[styles.slotSubLabel, { color: colors.textMuted }]}>
              Optional
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress Tracker Status Pills */}
        <View
          style={[
            styles.statusPillsRow,
            { backgroundColor: isDark ? "#1C2028" : "#F7F8FA" },
          ]}
        >
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle-outline" size={ms(14)} color="#22C55E" />
            <Text style={[styles.statusPillText, { color: colors.text }]}>
              {completedMeals} of {totalMeals} meals
            </Text>
          </View>

          <View style={styles.statusPill}>
            <Ionicons name="time-outline" size={ms(14)} color={colors.textMuted} />
            <Text style={[styles.statusPillText, { color: colors.textMuted }]}>
              {completedSnacks} of {totalSnacks} snacks
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: ms(14),
    marginBottom: ms(16),
  },
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: ms(18),
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(18),
  },
  heroLeftCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: ms(4),
  },
  mainScoreVal: {
    fontSize: ms(44),
    fontWeight: "800",
    lineHeight: ms(50),
    marginBottom: ms(4),
  },
  targetSub: {
    fontSize: FONT_SIZES.small,
  },
  heroRightCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  plateImageHolder: {
    position: "absolute",
    width: ms(82),
    height: ms(82),
    borderRadius: ms(41),
    overflow: "hidden",
  },
  plateImage: {
    width: "100%",
    height: "100%",
  },
  scanPlateBtn: {
    backgroundColor: "#FFFFFF",
    height: ms(44),
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(8),
    marginBottom: ms(16),
    ...SHADOWS.sm,
  },
  scanPlateBtnText: {
    color: "#111827",
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: ms(14),
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  metricIconLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
  },
  // Slots Section
  slotsCard: {
    borderRadius: RADIUS.xl,
    padding: ms(16),
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  slotsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    marginBottom: ms(16),
  },
  slotCol: {
    alignItems: "center",
    width: ms(68),
  },
  scoredSlotRing: {
    width: ms(54),
    height: ms(54),
    borderRadius: ms(27),
    borderWidth: 3,
    borderColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: ms(6),
  },
  scoredSlotText: {
    color: "#22C55E",
    fontSize: FONT_SIZES.small,
    fontWeight: "800",
  },
  slotCheckBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  dashedSlotRing: {
    width: ms(54),
    height: ms(54),
    borderRadius: ms(27),
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ms(6),
  },
  slotLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  slotSubLabel: {
    fontSize: 10,
  },
  statusPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: ms(10),
    borderRadius: RADIUS.md,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
  },
  statusPillText: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
});
