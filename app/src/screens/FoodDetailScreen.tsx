import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useSelector } from "react-redux";
import { useTheme } from "../context/ThemeContext";
import { useMealLogs } from "../context/MealLogsContext";
import { FONTS, FONT_SIZES, RADIUS, SPACING } from "../constants/theme";
import { moderateScale as ms, verticalScale as vs } from "../utils/responsive";
import CommonAlertModal from "../components/CommonModal";
import {
  fetchFoodItemImage,
  fetchFoodImage,
} from "../services/foodSearch.service";
import type { FoodItem } from "../services/foodSearch.service";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// Macro colors matching the mockup
const MACRO_COLORS = {
  carbs: "#06B6D4", // cyan
  fat: "#8B5CF6", // purple
  protein: "#F59E0B", // amber
};

interface DonutChartProps {
  calories: number;
  carbsPct: number;
  fatPct: number;
  proteinPct: number;
}

function DonutChart({
  calories,
  carbsPct,
  fatPct,
  proteinPct,
}: DonutChartProps) {
  const size = ms(110);
  const strokeWidth = ms(13);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 0.012; // small gap between segments as fraction of circle

  const segments = [
    { color: MACRO_COLORS.carbs, pct: carbsPct / 100 },
    { color: MACRO_COLORS.fat, pct: fatPct / 100 },
    { color: MACRO_COLORS.protein, pct: proteinPct / 100 },
  ];

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const arcFrac = Math.max(seg.pct - gap, 0);
    const dashArray = `${arcFrac * circumference} ${circumference}`;
    const rotation = -90 + cumulative * 360;
    cumulative += seg.pct;
    return { ...seg, dashArray, rotation };
  });

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          stroke="#2A2B3D"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {arcs.map((arc, i) => (
          <Circle
            key={i}
            stroke={arc.color}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dashArray}
            strokeLinecap="round"
            transform={`rotate(${arc.rotation} ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={styles.donutCalories}>{calories}</Text>
          <Text style={styles.donutLabel}>cal</Text>
        </View>
      </View>
    </View>
  );
}

export default function FoodDetailScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { addMeal } = useMealLogs() as any;
  const session = useSelector((s: any) => s.auth.session);
  const food: FoodItem = route.params?.food;
  const defaultMealType: MealType =
    route.params?.defaultMealType ?? "breakfast";

  const [servings, setServings] = useState("1");
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    variant: "success" | "error";
    message: string;
  }>({
    visible: false,
    variant: "success",
    message: "",
  });

  // Lazy-fetch a signed Pexels image on mount. UUID-looking ids refer to a
  // persisted food_items row → /api/food-items/:id/image; everything else (AI
  // search results without a DB row) falls back to /api/food/image keyed by name.
  const [imageUrl, setImageUrl] = useState<string | null>(
    food?.imageUrl ?? null,
  );
  const [imageLoading, setImageLoading] = useState(false);
  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  useEffect(() => {
    if (!food || imageUrl) return;
    let cancelled = false;
    setImageLoading(true);
    const load = isUuid(food.id)
      ? fetchFoodItemImage(food.id, session, food.name)
      : fetchFoodImage(food.name, session);
    load
      .then((url) => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setImageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [food?.id]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const servingsNum = Math.max(parseFloat(servings) || 1, 0.1);

  const totalCalories = Math.round(food.calories * servingsNum);
  const totalProtein = Math.round(food.macros.protein * servingsNum * 10) / 10;
  const totalCarbs = Math.round(food.macros.carbs * servingsNum * 10) / 10;
  const totalFat = Math.round(food.macros.fat * servingsNum * 10) / 10;

  const macroCalories = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
  const safeMacroCal = Math.max(macroCalories, 1);

  const carbsPct = Math.round(((totalCarbs * 4) / safeMacroCal) * 100);
  const fatPct = Math.round(((totalFat * 9) / safeMacroCal) * 100);
  const proteinPct = Math.round(((totalProtein * 4) / safeMacroCal) * 100);

  async function handleLog() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const meal = {
        name: food.name,
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        macros: { protein: totalProtein, carbs: totalCarbs, fat: totalFat },
        mealType,
        meal: MEAL_LABELS[mealType],
        time: timeStr,
        loggedAt: now.toISOString(),
        dateKey: now.toISOString().slice(0, 10),
        source: "food_search",
        emoji: null,
      };
      await addMeal(meal);
      setModal({
        visible: true,
        variant: "success",
        message: `${food.name} logged to ${MEAL_LABELS[mealType]}.`,
      });
    } catch (err: any) {
      setModal({
        visible: true,
        variant: "error",
        message: err?.message || "Failed to log. Try again.",
      });
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={ms(22)} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Food
        </Text>

        <TouchableOpacity
          onPress={handleLog}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.info ?? "#3B82F6"} />
          ) : (
            <Text style={[styles.logBtn, { color: colors.info ?? "#3B82F6" }]}>
              Log
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Food name */}
        <View style={styles.foodTitleRow}>
          <Text style={[styles.foodTitle, { color: colors.text }]}>
            {food.name}
          </Text>
          {food.verified && (
            <Ionicons
              name="shield-checkmark"
              size={ms(20)}
              color="#22C55E"
              style={{ marginLeft: ms(8) }}
            />
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Form rows */}
        <View style={styles.formRow}>
          <Text style={[styles.formLabel, { color: colors.text }]}>
            Serving Size
          </Text>
          <View
            style={[
              styles.formValue,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[
                styles.formValueText,
                { color: colors.info ?? "#3B82F6" },
              ]}
            >
              {food.servingSize}
            </Text>
          </View>
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.formLabel, { color: colors.text }]}>
            Number of Servings
          </Text>
          <TextInput
            style={[
              styles.formValue,
              styles.formValueInput,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.info ?? "#3B82F6",
              },
            ]}
            value={servings}
            onChangeText={setServings}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Time</Text>
          <View
            style={[
              styles.formValue,
              styles.formValueRow,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={ms(14)}
              color={colors.textMuted}
              style={{ marginRight: ms(6) }}
            />
            <Text
              style={[styles.formValueText, { color: colors.textSecondary }]}
            >
              {timeStr}
            </Text>
          </View>
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Meal</Text>
          <TouchableOpacity
            style={[
              styles.formValue,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={() => setShowMealPicker(true)}
            activeOpacity={0.75}
          >
            <Text
              style={[styles.formValueText, { color: colors.textSecondary }]}
            >
              {MEAL_LABELS[mealType]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Macro chart */}
        <View style={styles.macroSection}>
          <DonutChart
            calories={totalCalories}
            carbsPct={carbsPct}
            fatPct={fatPct}
            proteinPct={proteinPct}
          />

          <View style={styles.macroColumns}>
            <View style={styles.macroCol}>
              <Text style={[styles.macroPct, { color: MACRO_COLORS.carbs }]}>
                {carbsPct}%
              </Text>
              <Text style={[styles.macroGrams, { color: colors.text }]}>
                {totalCarbs} g
              </Text>
              <Text style={[styles.macroName, { color: colors.textMuted }]}>
                Carbs
              </Text>
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroPct, { color: MACRO_COLORS.fat }]}>
                {fatPct}%
              </Text>
              <Text style={[styles.macroGrams, { color: colors.text }]}>
                {totalFat} g
              </Text>
              <Text style={[styles.macroName, { color: colors.textMuted }]}>
                Fat
              </Text>
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroPct, { color: MACRO_COLORS.protein }]}>
                {proteinPct}%
              </Text>
              <Text style={[styles.macroGrams, { color: colors.text }]}>
                {totalProtein} g
              </Text>
              <Text style={[styles.macroName, { color: colors.textMuted }]}>
                Protein
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.imageWrap,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {imageLoading ? (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.foodImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={ms(36)}
                color={colors.textMuted}
              />
              <Text
                style={[
                  styles.imagePlaceholderText,
                  { color: colors.textMuted },
                ]}
              >
                No photo available
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CommonAlertModal
        visible={modal.visible}
        variant={modal.variant}
        title={modal.variant === "success" ? "Logged!" : "Error"}
        message={modal.message}
        primaryText={modal.variant === "success" ? "Done" : "Try Again"}
        onPrimary={() => {
          setModal((m) => ({ ...m, visible: false }));
          if (modal.variant === "success") navigation.pop(2);
          else setIsSaving(false);
        }}
      />

      {/* Meal picker modal */}
      <Modal visible={showMealPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMealPicker(false)}
        >
          <View
            style={[
              styles.mealPickerModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.mealPickerTitle, { color: colors.text }]}>
              Select a Meal
            </Text>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt}
                style={[
                  styles.mealPickerOption,
                  mt === mealType && { backgroundColor: colors.surfaceAlt },
                ]}
                onPress={() => {
                  setMealType(mt);
                  setShowMealPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.mealPickerOptionText,
                    {
                      color:
                        mt === mealType ? colors.text : colors.textSecondary,
                    },
                    mt === mealType && { fontWeight: FONTS.semibold },
                  ]}
                >
                  {MEAL_LABELS[mt]}
                </Text>
                {mt === mealType && (
                  <Ionicons
                    name="checkmark"
                    size={ms(16)}
                    color={colors.text}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(20),
    paddingVertical: ms(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: ms(16),
    fontWeight: FONTS.semibold,
  },
  logBtn: {
    fontSize: ms(16),
    fontWeight: FONTS.semibold,
  },
  content: {
    padding: ms(20),
    paddingBottom: SPACING.xxl,
  },
  foodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  foodTitle: {
    fontSize: ms(26),
    fontWeight: FONTS.bold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: ms(20),
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(12),
  },
  formLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.medium,
    flex: 1,
  },
  formValue: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    minWidth: ms(110),
    alignItems: "flex-end",
    justifyContent: "center",
  },
  formValueInput: {
    textAlign: "right",
    fontSize: FONT_SIZES.body,
    paddingVertical: ms(9),
    minWidth: ms(110),
  },
  formValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  formValueText: {
    fontSize: FONT_SIZES.body,
  },
  macroSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  macroColumns: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  macroCol: {
    alignItems: "center",
    gap: ms(2),
  },
  macroPct: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.bold,
  },
  macroGrams: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.semibold,
  },
  macroName: {
    fontSize: ms(12),
  },
  imageWrap: {
    marginTop: ms(28),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
    height: vs(200),
  },
  foodImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  imagePlaceholderText: {
    fontSize: FONT_SIZES.small,
  },
  donutCalories: {
    fontSize: ms(22),
    fontWeight: FONTS.bold,
    color: "#000",
  },
  donutLabel: {
    fontSize: FONT_SIZES.caption,
    color: "#999",
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mealPickerModal: {
    width: ms(260),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: SPACING.sm,
  },
  mealPickerTitle: {
    fontSize: FONT_SIZES.small,
    fontWeight: FONTS.semibold,
    textAlign: "center",
    paddingVertical: ms(10),
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mealPickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(18),
    paddingVertical: ms(13),
  },
  mealPickerOptionText: {
    fontSize: FONT_SIZES.body,
  },
});
