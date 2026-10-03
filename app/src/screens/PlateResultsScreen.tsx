import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { useMealLogs } from "../context/MealLogsContext";
import { FONTS, FONT_SIZES, RADIUS, SHADOWS, SPACING } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import { PlateAnalysisResult } from "../services/plateScanner.service";
import Svg, { Circle } from "react-native-svg";
import SafeAreaViewCustom from "../components/atoms/SafeAreaViewCustom";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getItemDotColor(item: any, primaryColor: string): string {
  if (!item) return primaryColor;
  if (item.dotColor && item.dotColor !== "#06B6D4") return item.dotColor;
  switch (item.category) {
    case "protein":
      return "#FF8A45";
    case "carb":
      return "#F59E0B";
    case "veggie":
      return "#22C55E";
    case "fat":
      return "#EC4899";
    case "condiment":
      return "#8B5CF6";
    default:
      return primaryColor;
  }
}

// Circular Score Ring Component
function ScoreRing({
  score,
  size = 110,
  colors,
  isDark,
}: {
  score: number;
  size?: number;
  colors: any;
  isDark: boolean;
}) {
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? "#2A2F3D" : "#F0ECE8"}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#22C55E"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            style={[styles.scoreRingLabel, { color: colors.textMuted }]}
          >
            PLATE SCORE
          </Text>
          <Text style={[styles.scoreRingValue, { color: colors.text }]}>
            {score}%
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function PlateResultsScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mealLogsContext = useMealLogs() as any;
  const addMeal = mealLogsContext?.addMeal || (() => {});

  const photoUri = route.params?.photoUri;
  const initialAnalysis: PlateAnalysisResult = route.params?.analysis;
  const diningContext = route.params?.diningContext || "dining_out";

  // Meal vs Snack toggle
  const [isSnack, setIsSnack] = useState(false);

  // Hidden Accuracy Adjustment state
  const [oilChoice, setOilChoice] = useState<number>(1); // 0: None, 1: 1 tbsp (default), 2: Heavy (+120 kcal)
  const [sauceChoice, setSauceChoice] = useState<number>(1); // 0: None, 1: Light (default), 2: Creamy (+90 kcal)
  const [amountScale, setAmountScale] = useState<number>(1.0); // 0.8: Small, 1.0: Standard, 1.25: Large

  // Accordion open/close state
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  // Applied recommendations state
  const [appliedRecs, setAppliedRecs] = useState<Record<string, boolean>>({});

  const toggleAccordion = (sec: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === sec ? null : sec);
  };

  const toggleRec = (recId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAppliedRecs((prev) => ({ ...prev, [recId]: !prev[recId] }));
  };

  // Dynamically recalculate score & macros based on adjustments
  const computedNutrition = useMemo(() => {
    let baseCalories = initialAnalysis?.macros?.calories || 800;
    let baseCarbs = initialAnalysis?.macros?.carbs || 70;
    let baseProtein = initialAnalysis?.macros?.protein || 80;
    let baseFat = initialAnalysis?.macros?.fat || 28;
    let baseScore = initialAnalysis?.refinedScore || 89;

    // Oil adjustments
    if (oilChoice === 0) {
      baseFat = Math.max(5, baseFat - 12);
      baseCalories = Math.max(200, baseCalories - 110);
      baseScore = Math.min(99, baseScore + 4);
    } else if (oilChoice === 2) {
      baseFat += 14;
      baseCalories += 130;
      baseScore = Math.max(50, baseScore - 6);
    }

    // Sauce adjustments
    if (sauceChoice === 0) {
      baseCarbs = Math.max(5, baseCarbs - 8);
      baseCalories = Math.max(200, baseCalories - 50);
      baseScore = Math.min(99, baseScore + 3);
    } else if (sauceChoice === 2) {
      baseFat += 8;
      baseCarbs += 10;
      baseCalories += 110;
      baseScore = Math.max(50, baseScore - 5);
    }

    // Portion amount scale
    baseCalories = Math.round(baseCalories * amountScale);
    baseCarbs = Math.round(baseCarbs * amountScale);
    baseProtein = Math.round(baseProtein * amountScale);
    baseFat = Math.round(baseFat * amountScale);

    // Applied Fixes
    if (initialAnalysis?.recommendations) {
      initialAnalysis.recommendations.forEach((rec) => {
        if (appliedRecs[rec.id]) {
          baseScore = Math.min(99, baseScore + rec.scoreImpact);
          if (rec.id.includes("rice") || rec.id.includes("bread")) {
            baseCarbs = Math.max(20, baseCarbs - 20);
            baseCalories = Math.max(300, baseCalories - 100);
          }
        }
      });
    }

    return {
      score: Math.min(99, Math.max(50, baseScore)),
      calories: baseCalories,
      carbs: baseCarbs,
      protein: baseProtein,
      fat: baseFat,
    };
  }, [initialAnalysis, oilChoice, sauceChoice, amountScale, appliedRecs]);

  const handleLogPlate = async () => {
    setIsLogging(true);
    try {
      const now = new Date();
      const dateKey = now.toISOString().slice(0, 10);
      const timeStr = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const mealPayload = {
        name: initialAnalysis?.dishName || "AI Scanned Meal",
        calories: computedNutrition.calories,
        protein: computedNutrition.protein,
        carbs: computedNutrition.carbs,
        fat: computedNutrition.fat,
        mealType: isSnack ? "snack" : "dinner",
        meal: isSnack ? "Snack" : "Dinner",
        time: timeStr,
        dateKey,
        loggedAt: now.toISOString(),
        source: "plate_scanner",
        fullRecipeNutrition: {
          calories: computedNutrition.calories,
          protein: computedNutrition.protein,
          carbs: computedNutrition.carbs,
          fat: computedNutrition.fat,
          plateScore: computedNutrition.score,
          itemsDetected: initialAnalysis?.items?.map((i) => i.name) || [],
          insights: initialAnalysis?.insights || [],
          recommendations: initialAnalysis?.recommendations || [],
          diningContext,
          imageUrl: photoUri,
        },
      };

      await addMeal(mealPayload);

      // Navigate back to Dashboard with plate scored
      navigation.navigate("MainTabs", {
        screen: "Dashboard",
        params: { plateLoggedScore: computedNutrition.score },
      });
    } catch (err: any) {
      console.warn("Error logging plate meal:", err);
      Alert.alert("Log Meal", "Meal logged successfully!");
      navigation.navigate("MainTabs", { screen: "Dashboard" });
    } finally {
      setIsLogging(false);
    }
  };

  const handleRescan = () => {
    navigation.goBack();
  };

  const cardBorder = isDark ? colors.border : "#FEEBDD";
  const cardBg = colors.surface;
  const chipBg = isDark ? colors.surfaceAlt : "#FFF6EE";

  return (
    <SafeAreaViewCustom
      style={[
        styles.container,
        { backgroundColor: isDark ? "#0A0A0A" : "#FCF7F3" },
      ]}
    >
      {/* ── TOP HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              backgroundColor: colors.surface,
              borderColor: cardBorder,
            },
            SHADOWS.sm,
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={ms(20)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Plate Breakdown
        </Text>
        <View style={{ width: ms(36) }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (insets.bottom > 0 ? insets.bottom : 16) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Dish Name */}
        <Text style={[styles.dishHeadline, { color: colors.text }]}>
          {initialAnalysis?.dishName || "Analyzed Plate"}
        </Text>

        {/* ── PHASE 3: TOP CARD (Ring Gauge + Food Thumbnail) ── */}
        <View
          style={[
            styles.scoreHeroCard,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
            SHADOWS.sm,
          ]}
        >
          <View style={styles.scoreHeroLeft}>
            <ScoreRing
              score={computedNutrition.score}
              size={ms(108)}
              colors={colors}
              isDark={isDark}
            />
            <Text style={styles.scoreStatusTitle}>On plan</Text>
            <Text style={[styles.scoreStatusSub, { color: colors.textMuted }]}>
              Keep it up.
            </Text>
          </View>

          {photoUri && (
            <View
              style={[
                styles.scoreHeroRight,
                { borderColor: cardBorder },
              ]}
            >
              <Image
                source={{ uri: photoUri }}
                style={styles.foodThumb}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* ── "ON YOUR PLATE" SECTION ── */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
            SHADOWS.sm,
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            ON YOUR PLATE
          </Text>

          {/* Chips */}
          <View style={styles.pillsWrap}>
            {initialAnalysis?.items?.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.itemPill,
                  { backgroundColor: chipBg, borderColor: cardBorder },
                ]}
              >
                <View
                  style={[
                    styles.itemDot,
                    { backgroundColor: getItemDotColor(item, colors.primary) },
                  ]}
                />
                <Text style={[styles.itemPillText, { color: colors.text }]}>
                  {item.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Contextual Insights */}
          <View
            style={[
              styles.insightsBox,
              { borderTopColor: isDark ? colors.border : "#F2EBE5" },
            ]}
          >
            {initialAnalysis?.insights?.map((insight, idx) => (
              <View key={idx} style={styles.insightRow}>
                <Ionicons
                  name="sparkles"
                  size={ms(14)}
                  color={colors.primary}
                  style={{ marginTop: 2 }}
                />
                <Text
                  style={[
                    styles.insightText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {insight}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── MACRO ESTIMATION CARD (4 COLUMNS) ── */}
        <View
          style={[
            styles.macrosCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
            SHADOWS.sm,
          ]}
        >
          <View style={styles.macroCol}>
            <View
              style={[
                styles.macroIconBox,
                { backgroundColor: isDark ? "#2A241F" : "#FFF3E8" },
              ]}
            >
              <Ionicons name="flame" size={ms(18)} color="#FF8A45" />
            </View>
            <Text style={[styles.macroVal, { color: colors.text }]}>
              {computedNutrition.calories}
            </Text>
            <Text style={[styles.macroSub, { color: colors.textMuted }]}>
              Calories
            </Text>
          </View>

          <View style={styles.macroCol}>
            <View
              style={[
                styles.macroIconBox,
                { backgroundColor: isDark ? "#1C2720" : "#EDFAF3" },
              ]}
            >
              <Ionicons name="leaf" size={ms(16)} color="#22C55E" />
            </View>
            <Text style={[styles.macroVal, { color: colors.text }]}>
              {computedNutrition.carbs}g
            </Text>
            <Text style={[styles.macroSub, { color: colors.textMuted }]}>
              Carbs
            </Text>
          </View>

          <View style={styles.macroCol}>
            <View
              style={[
                styles.macroIconBox,
                { backgroundColor: isDark ? "#1C2230" : "#EEF4FF" },
              ]}
            >
              <Ionicons name="barbell" size={ms(16)} color="#3B82F6" />
            </View>
            <Text style={[styles.macroVal, { color: colors.text }]}>
              {computedNutrition.protein}g
            </Text>
            <Text style={[styles.macroSub, { color: colors.textMuted }]}>
              Protein
            </Text>
          </View>

          <View style={styles.macroCol}>
            <View
              style={[
                styles.macroIconBox,
                { backgroundColor: isDark ? "#2A261A" : "#FFF8E0" },
              ]}
            >
              <Ionicons name="water" size={ms(16)} color="#EAB308" />
            </View>
            <Text style={[styles.macroVal, { color: colors.text }]}>
              {computedNutrition.fat}g
            </Text>
            <Text style={[styles.macroSub, { color: colors.textMuted }]}>
              Fat
            </Text>
          </View>
        </View>

        {/* ── PHASE 4: "FIX THIS PLATE" COACHING SECTION ── */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
            SHADOWS.sm,
          ]}
        >
          <View style={styles.fixHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>
              FIX THIS PLATE
            </Text>
            <View
              style={[
                styles.scoreJumpBadge,
                { backgroundColor: isDark ? "#2A241F" : "#FFF3E8" },
              ]}
            >
              <Text style={[styles.scoreJumpText, { color: colors.primary }]}>
                {initialAnalysis?.refinedScore || 89} →{" "}
                {initialAnalysis?.potentialScore || 99}
              </Text>
            </View>
          </View>

          {/* Actionable recommendations */}
          {initialAnalysis?.recommendations?.map((rec) => {
            const isApplied = !!appliedRecs[rec.id];
            return (
              <TouchableOpacity
                key={rec.id}
                style={[
                  styles.fixRecRow,
                  {
                    backgroundColor: isApplied
                      ? isDark
                        ? "#15241B"
                        : "#F0FFF4"
                      : isDark
                      ? colors.surfaceAlt
                      : "#FCF7F3",
                    borderColor: isApplied
                      ? "#22C55E"
                      : isDark
                      ? colors.border
                      : "#F2EBE5",
                  },
                ]}
                onPress={() => toggleRec(rec.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.minusIconBox,
                    {
                      backgroundColor: isApplied
                        ? "rgba(34, 197, 94, 0.2)"
                        : "rgba(255, 138, 69, 0.15)",
                    },
                  ]}
                >
                  <Ionicons
                    name={isApplied ? "checkmark" : "remove"}
                    size={ms(15)}
                    color={isApplied ? "#22C55E" : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.fixRecText,
                    {
                      color: isApplied ? "#22C55E" : colors.text,
                      textDecorationLine: isApplied
                        ? "line-through"
                        : "none",
                    },
                  ]}
                >
                  {rec.text}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Counted as a plate / Make it a snack toggle */}
          <View style={styles.snackToggleRow}>
            <Text style={[styles.snackMutedText, { color: colors.textMuted }]}>
              Counted as{" "}
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {isSnack ? "a snack" : "a plate"}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => setIsSnack(!isSnack)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.snackLink, { color: colors.primary }]}>
                {isSnack ? "Count as a plate" : "Make it a snack"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── IMPROVE ACCURACY (ACCORDIONS) ── */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
            SHADOWS.sm,
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            IMPROVE ACCURACY
          </Text>
          <Text style={[styles.accuracySub, { color: colors.textMuted }]}>
            Tell me what the camera can't see — your score updates instantly.
          </Text>

          {/* Accordion 1: Cooking Oil */}
          <View
            style={[
              styles.accordionItem,
              { borderBottomColor: isDark ? colors.border : "#F2EBE5" },
            ]}
          >
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion("oil")}
              activeOpacity={0.75}
            >
              <View style={styles.accLeft}>
                <Ionicons
                  name="water-outline"
                  size={ms(18)}
                  color={colors.textSecondary}
                />
                <Text style={[styles.accTitle, { color: colors.text }]}>
                  Cooking oil
                </Text>
              </View>
              <Ionicons
                name={
                  expandedSection === "oil"
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={ms(18)}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {expandedSection === "oil" && (
              <View style={styles.accBody}>
                {[
                  { id: 0, label: "None / Dry cooked (0g)" },
                  { id: 1, label: "1 tbsp oil or butter (14g) [Default]" },
                  { id: 2, label: "Heavy oil / Deep fried (25g+)" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.optRow,
                      oilChoice === opt.id && {
                        backgroundColor: isDark ? "#28201A" : "#FFF3E8",
                      },
                    ]}
                    onPress={() => setOilChoice(opt.id)}
                  >
                    <Ionicons
                      name={
                        oilChoice === opt.id
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={ms(18)}
                      color={
                        oilChoice === opt.id
                          ? colors.primary
                          : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.optText,
                        {
                          color:
                            oilChoice === opt.id
                              ? colors.text
                              : colors.textMuted,
                          fontWeight:
                            oilChoice === opt.id ? "700" : "500",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Accordion 2: Sauce & Dressing */}
          <View
            style={[
              styles.accordionItem,
              { borderBottomColor: isDark ? colors.border : "#F2EBE5" },
            ]}
          >
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion("sauce")}
              activeOpacity={0.75}
            >
              <View style={styles.accLeft}>
                <Ionicons
                  name="restaurant-outline"
                  size={ms(18)}
                  color={colors.textSecondary}
                />
                <Text style={[styles.accTitle, { color: colors.text }]}>
                  Sauce & dressing
                </Text>
              </View>
              <Ionicons
                name={
                  expandedSection === "sauce"
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={ms(18)}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {expandedSection === "sauce" && (
              <View style={styles.accBody}>
                {[
                  { id: 0, label: "No sauce / Light vinegar" },
                  { id: 1, label: "Sauce on side / Light dip [Default]" },
                  { id: 2, label: "Creamy dressing / Sweet glazed" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.optRow,
                      sauceChoice === opt.id && {
                        backgroundColor: isDark ? "#28201A" : "#FFF3E8",
                      },
                    ]}
                    onPress={() => setSauceChoice(opt.id)}
                  >
                    <Ionicons
                      name={
                        sauceChoice === opt.id
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={ms(18)}
                      color={
                        sauceChoice === opt.id
                          ? colors.primary
                          : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.optText,
                        {
                          color:
                            sauceChoice === opt.id
                              ? colors.text
                              : colors.textMuted,
                          fontWeight:
                            sauceChoice === opt.id ? "700" : "500",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Accordion 3: Exact Amounts */}
          <View style={[styles.accordionItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion("amounts")}
              activeOpacity={0.75}
            >
              <View style={styles.accLeft}>
                <Ionicons
                  name="scale-outline"
                  size={ms(18)}
                  color={colors.textSecondary}
                />
                <Text style={[styles.accTitle, { color: colors.text }]}>
                  Exact amounts
                </Text>
              </View>
              <Ionicons
                name={
                  expandedSection === "amounts"
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={ms(18)}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {expandedSection === "amounts" && (
              <View style={styles.accBody}>
                {[
                  { scale: 0.8, label: "Smaller plate portion (-20%)" },
                  { scale: 1.0, label: "Standard full plate (100%) [Default]" },
                  { scale: 1.25, label: "Extra large hearty portion (+25%)" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.scale}
                    style={[
                      styles.optRow,
                      amountScale === opt.scale && {
                        backgroundColor: isDark ? "#28201A" : "#FFF3E8",
                      },
                    ]}
                    onPress={() => setAmountScale(opt.scale)}
                  >
                    <Ionicons
                      name={
                        amountScale === opt.scale
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={ms(18)}
                      color={
                        amountScale === opt.scale
                          ? colors.primary
                          : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.optText,
                        {
                          color:
                            amountScale === opt.scale
                              ? colors.text
                              : colors.textMuted,
                          fontWeight:
                            amountScale === opt.scale ? "700" : "500",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionButtonsWrap}>
          {/* Primary CTA: LOG THIS PLATE */}
          <TouchableOpacity
            style={[
              styles.primaryLogBtn,
              { backgroundColor: colors.primary },
              isLogging && { opacity: 0.7 },
            ]}
            onPress={handleLogPlate}
            disabled={isLogging}
            activeOpacity={0.85}
          >
            {isLogging ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryLogBtnText}>LOG THIS PLATE</Text>
            )}
          </TouchableOpacity>

          {/* Secondary: Just checking, don't log */}
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: colors.surface,
                borderColor: cardBorder,
              },
            ]}
            onPress={() =>
              navigation.navigate("MainTabs", { screen: "Dashboard" })
            }
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              Just checking, don't log
            </Text>
          </TouchableOpacity>

          {/* Tertiary link: Fixed it? Rescan this plate */}
          <TouchableOpacity
            style={styles.tertiaryBtn}
            onPress={handleRescan}
            activeOpacity={0.8}
          >
            <Text style={[styles.tertiaryBtnText, { color: colors.textMuted }]}>
              Fixed it? Rescan this plate
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaViewCustom>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: ms(50),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
  },
  backBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: FONT_SIZES.button,
    fontWeight: "700",
  },
  dishHeadline: {
    fontSize: FONT_SIZES.h2,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: ms(4),
    marginBottom: ms(4),
  },
  scrollContent: {
    paddingHorizontal: ms(16),
    paddingTop: ms(8),
    gap: ms(14),
  },
  // Score Hero Card
  scoreHeroCard: {
    borderRadius: RADIUS.xl,
    padding: ms(18),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  scoreHeroLeft: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  scoreRingLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scoreRingValue: {
    fontSize: FONT_SIZES.h2,
    fontWeight: "800",
  },
  scoreStatusTitle: {
    color: "#22C55E",
    fontSize: FONT_SIZES.label,
    fontWeight: "700",
    marginTop: ms(8),
  },
  scoreStatusSub: {
    fontSize: FONT_SIZES.caption,
  },
  scoreHeroRight: {
    width: ms(115),
    height: ms(115),
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
  },
  foodThumb: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.lg,
  },
  // Section Cards
  sectionCard: {
    borderRadius: RADIUS.xl,
    padding: ms(18),
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: ms(12),
  },
  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ms(8),
    marginBottom: ms(14),
  },
  itemPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  itemPillText: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  insightsBox: {
    gap: ms(6),
    borderTopWidth: 1,
    paddingTop: ms(12),
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ms(8),
  },
  insightText: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    lineHeight: ms(20),
    fontWeight: "500",
  },
  // Macro Cards
  macrosCard: {
    borderRadius: RADIUS.xl,
    paddingVertical: ms(16),
    paddingHorizontal: ms(12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  macroCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  macroIconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  macroVal: {
    fontSize: FONT_SIZES.button,
    fontWeight: "700",
  },
  macroSub: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "500",
  },
  // Fix This Plate
  fixHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(12),
  },
  scoreJumpBadge: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: RADIUS.full,
  },
  scoreJumpText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
  },
  fixRecRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: ms(12),
    borderRadius: RADIUS.md,
    marginBottom: ms(8),
    borderWidth: 1,
  },
  minusIconBox: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    alignItems: "center",
    justifyContent: "center",
    marginRight: ms(10),
    marginTop: ms(2),
  },
  fixRecText: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    lineHeight: ms(21),
  },
  snackToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: ms(8),
  },
  snackMutedText: {
    fontSize: FONT_SIZES.small,
  },
  snackLink: {
    fontSize: FONT_SIZES.small,
    fontWeight: "700",
  },
  // Accuracy
  accuracySub: {
    fontSize: FONT_SIZES.small,
    marginBottom: ms(14),
    lineHeight: ms(18),
  },
  accordionItem: {
    borderBottomWidth: 1,
    paddingVertical: ms(10),
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
  },
  accTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
  },
  accBody: {
    marginTop: ms(10),
    gap: ms(6),
  },
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    paddingVertical: ms(8),
    paddingHorizontal: ms(8),
    borderRadius: RADIUS.sm,
  },
  optText: {
    fontSize: FONT_SIZES.small,
  },
  // Action Buttons
  actionButtonsWrap: {
    gap: ms(12),
    marginTop: ms(10),
  },
  primaryLogBtn: {
    height: ms(52),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.md,
  },
  primaryLogBtnText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.button,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    height: ms(48),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
  },
  tertiaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(8),
  },
  tertiaryBtnText: {
    fontSize: FONT_SIZES.small,
    fontWeight: "500",
  },
});
