import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";

import { useTheme } from "../context/ThemeContext";
import {
  FONTS,
  FONT_SIZES,
  RADIUS,
  SPACING,
  SHADOWS,
} from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import { mealService } from "../services/meal.service";
import ExpandableDayCard from "../components/ExpandableDayCard";

const SCREEN_BG = "#FCF7F3";
const ORANGE_CAL = "#F97316";
const MACRO_COLORS = { protein: "#E45255", carbs: "#94AE7F", fat: "#DEA226" };

const leafImg = require("../../assets/pngs/caloriesLeaf.png");
const fireImg = require("../../assets/webp/StreakFire.webp");
const calendarImg = require("../../assets/webp/Calender.webp");
const muscleIcon = require("../../assets/pngs/muscleVector.png");
const leafIcon = require("../../assets/pngs/leafVector.png");
const dropIcon = require("../../assets/pngs/dropVector.png");

export default function CaloriesScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const session = useSelector((state: any) => state.auth.session);

  const profile = useSelector((state: any) => state.profile?.data);
  const goalCals = profile?.nutrition_goals?.calories || 2000;
  const goalProtein = profile?.nutrition_goals?.protein || 120;
  const goalCarbs = profile?.nutrition_goals?.carbs || 250;
  const goalFat = profile?.nutrition_goals?.fat || 70;

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const showSkeleton = loading && page === 1;
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (!showSkeleton) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showSkeleton, shimmerAnim]);

  const fetchHistory = useCallback(
    async (pageNum: number, isRefresh = false) => {
      try {
        const res = await mealService.getHistory(session, pageNum, 10);
        if (isRefresh) {
          setHistory(res.history);
        } else {
          setHistory((prev) => [...prev, ...res.history]);
        }
        setHasMore(res.hasMore);
        setPage(pageNum);
      } catch (err) {
        console.warn("[CaloriesScreen] fetch history error", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  // Refetch every time the screen gains focus so newly-logged meals show up
  // when the user returns from the log flow (not just on first mount).
  useFocusEffect(
    useCallback(() => {
      fetchHistory(1, true);
    }, [fetchHistory]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(1, true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchHistory(page + 1, false);
    }
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayData =
    history[0]?.dateKey === todayKey
      ? history[0]
      : { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };

  const calPercent = Math.min(
    100,
    Math.max(0, ((todayData.totalCalories || 0) / goalCals) * 100),
  );

  const renderMacroStat = (
    icon: any,
    name: string,
    current: number,
    goal: number,
    color: string,
  ) => {
    const pct =
      Math.min(100, Math.max(0, Math.round((current / goal) * 100))) || 0;
    return (
      <View style={styles.macroStatRow}>
        <View style={[styles.macroIconBg, { backgroundColor: color + "1A" }]}>
          <Image
            source={icon}
            style={[styles.macroIcon, { tintColor: color }]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.macroStatContent}>
          <View style={styles.macroStatHeader}>
            <Text style={[styles.macroName, { color: colors.textMuted }]}>
              {name}
            </Text>
            <Text style={styles.macroValueText}>
              <Text style={[styles.macroCurrent, { color: colors.text }]}>
                {Math.round(current)}g{" "}
              </Text>
              <Text style={[styles.macroGoal, { color: colors.textMuted }]}>
                /{goal}g
              </Text>
            </Text>
          </View>
          <View style={styles.macroStatBarHeader}>
            <View
              style={[
                styles.macroMiniBarBg,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <View
                style={[
                  styles.macroMiniBarFill,
                  { width: `${pct}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={[styles.macroPct, { color }]}>{pct}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    const size = ms(140);
    const strokeWidth = ms(12);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (calPercent / 100) * circumference;

    const remaining = goalCals - Math.round(todayData.totalCalories || 0);
    const remainingText =
      remaining >= 0
        ? `${remaining} kcal remaining`
        : `${Math.abs(remaining)} kcal over`;

    return (
      <View style={styles.headerContainer}>
        <Image source={leafImg} style={styles.decorLeaf} resizeMode="contain" />

        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { color: "#4A3428" }]}>Calories</Text>
          <View style={styles.dateHeader}>
            <Text style={[styles.dateHeaderText, { color: colors.textMuted }]}>
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Image
              source={calendarImg}
              style={styles.calendarIcon}
              resizeMode="contain"
            />
          </View>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            SHADOWS.sm,
          ]}
        >
          <View style={styles.summaryTop}>
            <View style={styles.progressRingContainer}>
              <Svg width={size} height={size}>
                <Circle
                  stroke={colors.surfaceAlt}
                  fill="none"
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                />
                <Circle
                  stroke={ORANGE_CAL}
                  fill="none"
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  originX={size / 2}
                  originY={size / 2}
                />
              </Svg>
              <View style={styles.ringTextContainer}>
                <Image
                  source={fireImg}
                  style={styles.ringFireIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.ringKcalText, { color: colors.text }]}>
                  {Math.round(todayData.totalCalories)}
                </Text>
                <Text style={[styles.ringSubText, { color: colors.textMuted }]}>
                  /{goalCals} kcal
                </Text>
              </View>
            </View>

            <View style={styles.macrosColumn}>
              <View style={styles.remainingBadge}>
                <Ionicons name="sparkles" size={ms(12)} color="#64748B" />
                <Text style={styles.remainingBadgeText}>{remainingText}</Text>
              </View>

              {renderMacroStat(
                muscleIcon,
                "Protein",
                todayData.totalProtein,
                goalProtein,
                MACRO_COLORS.protein,
              )}
              {renderMacroStat(
                leafIcon,
                "Carbs",
                todayData.totalCarbs,
                goalCarbs,
                MACRO_COLORS.carbs,
              )}
              {renderMacroStat(
                dropIcon,
                "Fat",
                todayData.totalFat,
                goalFat,
                MACRO_COLORS.fat,
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (showSkeleton) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: SCREEN_BG }]}
        edges={["top"]}
      >
        <View style={styles.listContent}>
          <View style={styles.headerContainer}>
            <Image
              source={leafImg}
              style={styles.decorLeaf}
              resizeMode="contain"
            />
            <View style={styles.titleSection}>
              <Text style={[styles.mainTitle, { color: "#4A3428" }]}>
                Calories
              </Text>
              <View style={styles.dateHeader}>
                <Text
                  style={[styles.dateHeaderText, { color: colors.textMuted }]}
                >
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <Image
                  source={calendarImg}
                  style={styles.calendarIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Animated.View
              style={[
                styles.skBlock,
                styles.skSummaryCard,
                { opacity: shimmerAnim },
              ]}
            />
          </View>
          {[0, 1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.skBlock,
                styles.skDayCard,
                { opacity: shimmerAnim },
              ]}
            />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: SCREEN_BG }]}
      edges={["top"]}
    >
      <FlatList
        data={history}
        keyExtractor={(item) => item.dateKey}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ExpandableDayCard dayData={item} goalCals={goalCals} />
        )}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ORANGE_CAL]}
            tintColor={ORANGE_CAL}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && history.length > 0 ? (
            <ActivityIndicator
              size="small"
              color={ORANGE_CAL}
              style={{ marginVertical: ms(20) }}
            />
          ) : (
            <View style={{ height: ms(40) }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loaderCenter: { alignItems: "center", justifyContent: "center" },
  skBlock: { backgroundColor: "#ECE5DE" },
  skSummaryCard: {
    height: ms(172),
    borderRadius: RADIUS.xl,
    marginBottom: ms(16),
  },
  skDayCard: {
    height: ms(110),
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: ms(10),
    paddingBottom: ms(40),
  },
  headerContainer: { marginBottom: ms(12), position: "relative" },
  decorLeaf: {
    position: "absolute",
    right: ms(20),
    top: ms(12),
    width: ms(120),
    height: ms(86),
    opacity: 1,
  },
  titleSection: {
    marginBottom: ms(20),
    marginTop: ms(10),
  },
  mainTitle: {
    fontSize: ms(32),
    fontWeight: "800",
    marginBottom: ms(4),
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateHeaderText: {
    fontSize: ms(14),
    fontWeight: FONTS.medium,
    marginRight: ms(6),
  },
  calendarIcon: {
    width: ms(16),
    height: ms(16),
  },
  summaryCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: ms(16),
    marginBottom: ms(16),
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressRingContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginRight: ms(16),
  },
  ringTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringFireIcon: {
    width: ms(24),
    height: ms(24),
    marginBottom: -ms(4),
  },
  ringKcalText: {
    fontSize: ms(28),
    fontWeight: "800",
  },
  ringSubText: {
    fontSize: ms(13),
    fontWeight: FONTS.medium,
  },
  macrosColumn: {
    flex: 1,
    justifyContent: "center",
    gap: ms(12),
  },
  remainingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(12),
    alignSelf: "flex-start",
    marginBottom: ms(4),
  },
  remainingBadgeText: {
    fontSize: ms(11),
    color: "#475569",
    fontWeight: FONTS.semibold,
    marginLeft: ms(4),
  },
  macroStatRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  macroIconBg: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    alignItems: "center",
    justifyContent: "center",
    marginRight: ms(10),
  },
  macroIcon: {
    width: ms(14),
    height: ms(14),
  },
  macroStatContent: {
    flex: 1,
  },
  macroStatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ms(4),
  },
  macroName: {
    fontSize: ms(13),
    fontWeight: FONTS.medium,
  },
  macroValueText: {
    fontSize: ms(12),
  },
  macroCurrent: {
    fontWeight: FONTS.bold,
  },
  macroGoal: {
    fontWeight: FONTS.medium,
  },
  macroStatBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  macroMiniBarBg: {
    flex: 1,
    height: ms(6),
    borderRadius: ms(3),
    marginRight: ms(8),
    overflow: "hidden",
  },
  macroMiniBarFill: {
    height: "100%",
    borderRadius: ms(3),
  },
  macroPct: {
    fontSize: ms(11),
    fontWeight: FONTS.bold,
    width: ms(30),
    textAlign: "right",
  },
});
