import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { SPACING, RADIUS, FONTS, FONT_SIZES, SHADOWS } from "../constants/theme";
import { moderateScale as ms, verticalScale as vs } from "../utils/responsive";

const SCREEN_BG = "#FCF7F3";
const calendarImg = require("../../assets/pngs/calenderPlan.png");
const fireImg = require("../../assets/webp/StreakFire.webp");
const muscleImg = require("../../assets/pngs/muscleVector.png");
const leafVector = require("../../assets/pngs/leafVector.png");
const dropVector = require("../../assets/pngs/dropVector.png");
const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const ginghamImg = require("../../assets/webp/UserInfoBottom.webp");
import { C_PROTEIN, C_CARBS, C_FAT } from "../components/NutritionExpansion";
import { useTheme } from "../context/ThemeContext";
import { fetchAllRecipes } from "../services/recipeService";
import { mealService } from "../services/meal.service";
import { profileService } from "../services/profile.service";
import CommonAlertModal from "../components/CommonModal";

const MEAL_SLOTS = [
  { id: "breakfast", labelKey: "breakfast", icon: "🌅", split: 0.25 },
  { id: "lunch", labelKey: "lunch", icon: "☀️", split: 0.35 },
  { id: "dinner", labelKey: "dinner", icon: "🌙", split: 0.3 },
  { id: "snack", labelKey: "snack", icon: "🍎", split: 0.1 },
];

const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
const MEAL_ICONS = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "cafe-outline",
};

function buildSlots(dbRecipes, targets) {
  // Deduplicate by title — keep first occurrence (DB returns newest first)
  const seen = new Set();
  const unique = dbRecipes.filter((r) => {
    if (r.calories == null || seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  });
  const pool = unique.map((r) => ({ ...r }));

  return MEAL_SLOTS.map((slot) => {
    const targetCal =
      targets.calories != null
        ? Math.round(targets.calories * slot.split)
        : null;

    if (targetCal != null) {
      pool.sort(
        (a, b) =>
          Math.abs(a.calories - targetCal) - Math.abs(b.calories - targetCal),
      );
    }

    const picked = [];
    for (let i = 0; i < pool.length && picked.length < 3; i++) {
      picked.push(pool[i]);
      pool.splice(i, 1);
      i--;
    }

    const options = picked.map((r) => ({
      name: r.title,
      calories: r.calories,
      protein: r.protein ?? 0,
      carbs: r.carbs ?? 0,
      fat: r.fat ?? 0,
    }));

    while (options.length < 3) options.push(null);

    return { ...slot, options, targetCal };
  });
}

// ── Option row ────────────────────────────────────────────────────────────────
function OptionRow({ option, isSelected, onSelect, colors }) {
  if (!option) {
    return (
      <View style={[styles.optionRow, { borderBottomColor: colors.border }]}>
        <Ionicons
          name="add-circle-outline"
          size={ms(18)}
          color={colors.textMuted}
        />
        <Text
          style={[
            styles.optionName,
            { color: colors.textMuted, fontStyle: "italic" },
          ]}
        >
          No recipe available
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.optionRow, { borderBottomColor: colors.border }]}
      onPress={onSelect}
      activeOpacity={0.65}
    >
      <View
        style={[
          styles.radio,
          { borderColor: isSelected ? colors.text : colors.border },
        ]}
      >
        {isSelected && (
          <View style={[styles.radioDot, { backgroundColor: colors.text }]} />
        )}
      </View>

      <View style={styles.optionInfo}>
        <Text
          style={[styles.optionName, { color: colors.text }]}
          numberOfLines={1}
        >
          {option.name}
        </Text>
        <Text style={[styles.optionMacros, { color: colors.textMuted }]}>
          <Text style={{ color: C_PROTEIN }}>{option.protein}g</Text>
          {" pro · "}
          <Text style={{ color: C_CARBS }}>{option.carbs}g</Text>
          {" carb · "}
          <Text style={{ color: C_FAT }}>{option.fat}g</Text>
          {" fat"}
        </Text>
      </View>

      <View style={styles.optionRight}>
        <Text
          style={[
            styles.optionCal,
            { color: isSelected ? colors.primary : colors.text },
          ]}
        >
          {option.calories}
        </Text>
        <Text style={[styles.optionCalLabel, { color: colors.textMuted }]}>
          kcal
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Macro bar ─────────────────────────────────────────────────────────────────
function MacroRow({ img, tint, label, value, goal, color, colors }) {
  const pct = goal != null && goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroTopRow}>
        <View style={[styles.macroIconCircle, { backgroundColor: tint }]}>
          <Image
            source={img}
            style={styles.macroIconImg}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.macroLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: colors.text }]}>
          {value}
          <Text style={[styles.macroGoal, { color: colors.textMuted }]}>
            {" "}
            /{goal != null ? `${goal}g` : "N/A"}
          </Text>
        </Text>
        <Ionicons name="chevron-forward" size={ms(16)} color={colors.textMuted} />
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[
            styles.macroFill,
            { width: `${pct * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// ── Target pill ───────────────────────────────────────────────────────────────
function TargetPill({ label, value, color, colors }) {
  return (
    <View style={styles.targetPill}>
      <Text style={[styles.targetPillValue, { color }]}>{value}</Text>
      <Text style={[styles.targetPillLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

// ── Daily target stat (icon circle + value + label) ───────────────────────────
function TargetStat({
  img,
  ionIcon,
  ionColor,
  tint,
  value,
  unit,
  label,
  colors,
}) {
  return (
    <View style={styles.targetStat}>
      <View style={[styles.targetIconCircle, { backgroundColor: tint }]}>
        {img ? (
          <Image
            source={img}
            style={styles.targetIconImg}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name={ionIcon} size={ms(18)} color={ionColor} />
        )}
      </View>
      <Text style={[styles.targetStatValue, { color: colors.text }]}>
        {value}
        {unit ? (
          <Text style={[styles.targetStatUnit, { color: colors.textMuted }]}>
            {" "}
            {unit}
          </Text>
        ) : null}
      </Text>
      <Text style={[styles.targetStatLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PlanScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const session = useSelector((state) => state.auth.session);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) {
      setProfileLoading(false);
      return;
    }
    profileService
      .getProfile(session)
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [session]);

  const TARGETS = {
    calories: profile?.calories ?? null,
    protein: profile?.protein ?? null,
    carbs: profile?.carbs ?? null,
    fat: profile?.fat ?? null,
  };

  const [plan, setPlan] = useState(null);
  const [selectedIndices, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbCount, setDbCount] = useState(0);
  const [planDate, setPlanDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: "",
    message: "",
    variant: "info",
    onConfirm: null,
  });

  function closeAlert() {
    setAlertModal((a) => ({ ...a, visible: false, onConfirm: null }));
  }

  async function handleCreatePlan() {
    setLoading(true);
    try {
      const recipes = await fetchAllRecipes(session);
      const withCalories = recipes.filter((r) => r.calories != null);
      setDbCount(withCalories.length);
      const slots = buildSlots(recipes, TARGETS);
      setPlan(slots);
      const initial = {};
      slots.forEach((s) => {
        const firstValid = s.options.findIndex((o) => o !== null);
        initial[s.id] = firstValid >= 0 ? firstValid : 0;
      });
      setSelected(initial);
    } catch (err) {
      console.warn("[PlanScreen] fetchAllRecipes failed:", err?.message);
      const slots = buildSlots([], TARGETS);
      setPlan(slots);
      setSelected(Object.fromEntries(slots.map((s) => [s.id, 0])));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPlan(null);
    setSelected({});
    setDbCount(0);
  }

  function selectOption(slotId, idx) {
    setSelected((prev) => ({ ...prev, [slotId]: idx }));
  }

  async function handleSavePlan() {
    setSaving(true);
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    try {
      const mealsToSave = [];
      for (const slot of plan) {
        const idx = selectedIndices[slot.id] ?? 0;
        const opt = slot.options[idx];
        if (!opt) continue;
        mealsToSave.push({
          name: opt.name,
          calories: opt.calories,
          protein: opt.protein,
          carbs: opt.carbs,
          fat: opt.fat,
          macros: { protein: opt.protein, carbs: opt.carbs, fat: opt.fat },
          mealType: slot.id,
          meal: MEAL_LABELS[slot.id],
          emoji: null,
          time,
          source: "plan",
        });
      }

      if (mealsToSave.length > 0) {
        await mealService.savePlan(session, planDate, mealsToSave);
      }
      setAlertModal({
        visible: true,
        variant: "success",
        title: t("plan.savedSuccess"),
        message: t("plan.savedSuccessMsg"),
        onConfirm: () => navigation.navigate("MainTabs"),
      });
    } catch (err) {
      setAlertModal({
        visible: true,
        variant: "error",
        title: t("plan.savedError"),
        message: err.message,
        onConfirm: null,
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmSavePlan() {
    try {
      const existing = await mealService.getMeals(session, planDate);
      if (existing?.length > 0) {
        setAlertModal({
          visible: true,
          variant: "warning",
          title: t("plan.conflictTitle"),
          message: t("plan.conflictMsg", { date: planDate }),
          onConfirm: handleSavePlan,
        });
        return;
      }
    } catch {
      /* proceed anyway */
    }
    handleSavePlan();
  }

  const totals = plan
    ? plan.reduce(
        (acc, slot) => {
          const opt = slot.options[selectedIndices[slot.id] ?? 0];
          if (!opt) return acc;
          return {
            calories: acc.calories + opt.calories,
            protein: acc.protein + opt.protein,
            carbs: acc.carbs + opt.carbs,
            fat: acc.fat + opt.fat,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
    : null;

  const hasAnyOption = plan
    ? plan.some((s) => s.options.some((o) => o !== null))
    : false;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: SCREEN_BG }]}>
      {/* Empty-state background decor */}
      {plan === null && (
        <>
          <Image
            source={leafImg}
            style={styles.decorLeafTop}
            resizeMode="contain"
          />
          <Image
            source={leafImg}
            style={styles.decorLeafBottom}
            resizeMode="contain"
          />
          <Image
            source={ginghamImg}
            style={styles.decorGingham}
            resizeMode="cover"
          />
        </>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            { backgroundColor: colors.surface },
            SHADOWS.sm,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={ms(20)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>
          {t("plan.title")}
        </Text>
        {plan ? (
          <TouchableOpacity
            onPress={handleReset}
            style={[
              styles.backBtn,
              { backgroundColor: colors.surface },
              SHADOWS.sm,
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={ms(18)} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {plan === null ? (
          /* ── Empty state ──────────────────────────────────────────── */
          <View style={styles.emptyState}>
            <View
              style={[styles.iconWrap, { backgroundColor: colors.tintGreen }]}
            >
              <Image
                source={calendarImg}
                style={styles.heroIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("plan.emptyTitle")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {t("plan.emptySubtitle")}
            </Text>

            <View
              style={[
                styles.targetsCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.targetsTitle, { color: colors.textMuted }]}>
                {t("plan.yourTargets")}
              </Text>
              <View style={styles.targetsRow}>
                <TargetStat
                  img={fireImg}
                  tint={colors.tintOrange}
                  value={TARGETS.calories != null ? `${TARGETS.calories}` : "—"}
                  unit="kcal"
                  label={t("macros.calories")}
                  colors={colors}
                />
                <TargetStat
                  img={muscleImg}
                  tint={colors.tintRed}
                  value={TARGETS.protein != null ? `${TARGETS.protein}` : "—"}
                  unit="g"
                  label={t("macros.protein")}
                  colors={colors}
                />
                <TargetStat
                  img={leafVector}
                  tint={colors.tintGreen}
                  value={TARGETS.carbs != null ? `${TARGETS.carbs}` : "—"}
                  unit="g"
                  label={t("macros.carbs")}
                  colors={colors}
                />
                <TargetStat
                  img={dropVector}
                  tint={colors.tintYellow}
                  value={TARGETS.fat != null ? `${TARGETS.fat}` : "—"}
                  unit="g"
                  label={t("macros.fat")}
                  colors={colors}
                />
              </View>
            </View>
          </View>
        ) : (
          /* ── Plan view ────────────────────────────────────────────── */
          <>
            {/* Daily summary */}
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.summaryHeader}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textMuted }]}
                >
                  {t("plan.dailySummary")}
                </Text>
                <Text style={styles.caloriesValue}>
                  <Text style={{ color: colors.primary }}>
                    {totals.calories}
                  </Text>
                  <Text
                    style={[styles.caloriesTarget, { color: colors.textMuted }]}
                  >
                    {" "}
                    /{TARGETS.calories != null
                      ? `${TARGETS.calories}`
                      : "N/A"}{" "}
                    kcal
                  </Text>
                </Text>
              </View>
              <View style={styles.macrosGrid}>
                <MacroRow
                  img={muscleImg}
                  tint={colors.tintRed}
                  label={t("macros.protein")}
                  value={totals.protein}
                  goal={TARGETS.protein}
                  color={C_PROTEIN}
                  colors={colors}
                />
                <MacroRow
                  img={leafVector}
                  tint={colors.tintGreen}
                  label={t("macros.carbs")}
                  value={totals.carbs}
                  goal={TARGETS.carbs}
                  color={C_CARBS}
                  colors={colors}
                />
                <MacroRow
                  img={dropVector}
                  tint={colors.tintYellow}
                  label={t("macros.fat")}
                  value={totals.fat}
                  goal={TARGETS.fat}
                  color={C_FAT}
                  colors={colors}
                />
              </View>
            </View>

            {/* Meal slots */}
            {plan.map((slot) => (
              <View key={slot.id} style={styles.slotSection}>
                <View style={styles.slotHeader}>
                  <Text style={[styles.slotLabel, { color: colors.text }]}>
                    {t(`mealType.${slot.labelKey}`)}
                  </Text>
                  <Text
                    style={[styles.slotTarget, { color: colors.textMuted }]}
                  >
                    {slot.targetCal != null ? `~${slot.targetCal} kcal` : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.optionsCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {slot.options.map((opt, idx) => (
                    <OptionRow
                      key={idx}
                      option={opt}
                      isSelected={(selectedIndices[slot.id] ?? 0) === idx}
                      onSelect={() => opt && selectOption(slot.id, idx)}
                      colors={colors}
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Create Plan bottom bar (empty state) ─────────────────────── */}
      {plan === null && (
        <View style={[styles.bottomBar, { backgroundColor: SCREEN_BG }]}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: loading || profileLoading ? 0.6 : 1,
              },
            ]}
            onPress={handleCreatePlan}
            disabled={loading || profileLoading}
            activeOpacity={0.85}
          >
            {loading || profileLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveBtnText, { color: "#FFFFFF" }]}>
                {t("plan.createPlan")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Save Plan bottom bar ─────────────────────────────────────── */}
      {plan !== null && (
        <View style={[styles.bottomBar, { backgroundColor: SCREEN_BG }]}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: saving || !hasAnyOption ? 0.5 : 1,
              },
            ]}
            onPress={confirmSavePlan}
            disabled={saving || !hasAnyOption}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveBtnText, { color: "#FFFFFF" }]}>
                {t("plan.savePlan")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <CommonAlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        primaryText={alertModal.onConfirm ? t("common.yes") : t("common.ok")}
        onPrimary={() => {
          const fn = alertModal.onConfirm;
          closeAlert();
          if (fn) fn();
        }}
        secondaryText={alertModal.onConfirm ? t("common.no") : undefined}
        onSecondary={closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(12),
  },
  backBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtn: { width: ms(36), alignItems: "flex-end" },
  resetText: { fontSize: FONT_SIZES.small, fontWeight: FONTS.medium },
  topTitle: { fontSize: ms(16), fontWeight: FONTS.bold, letterSpacing: -0.3 },

  decorLeafTop: {
    position: "absolute",
    right: -ms(10),
    top: vs(70),
    width: ms(150),
    height: ms(150),
    opacity: 0.7,
  },
  decorLeafBottom: {
    position: "absolute",
    left: -ms(30),
    bottom: vs(120),
    width: ms(130),
    height: ms(130),
    opacity: 0.6,
    transform: [{ scaleX: -1 }],
  },
  decorGingham: {
    position: "absolute",
    right: 0,
    bottom: vs(90),
    width: ms(130),
    height: ms(130),
    opacity: 0.8,
  },

  datePillsBar: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: ms(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  datePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(7),
    borderRadius: RADIUS.full,
  },
  datePillText: { fontSize: FONT_SIZES.small, fontWeight: FONTS.medium },

  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: vs(100),
  },

  emptyState: { alignItems: "center", gap: SPACING.md, paddingTop: SPACING.lg },
  iconWrap: {
    width: ms(96),
    height: ms(96),
    borderRadius: ms(48),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  heroIcon: { width: ms(40), height: ms(40) },
  emptyTitle: { fontSize: FONT_SIZES.h2, fontWeight: FONTS.bold, letterSpacing: -0.4 },
  emptySubtitle: {
    fontSize: FONT_SIZES.body,
    textAlign: "center",
    lineHeight: ms(22),
    maxWidth: ms(320),
  },

  targetsCard: {
    width: "100%",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  targetsTitle: {
    fontSize: ms(12),
    fontWeight: FONTS.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  targetsRow: { flexDirection: "row", justifyContent: "space-between" },
  targetStat: { alignItems: "center", flex: 1, gap: ms(6) },
  targetIconCircle: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ms(2),
  },
  targetIconImg: { width: ms(22), height: ms(22) },
  targetStatValue: { fontSize: ms(16), fontWeight: FONTS.bold },
  targetStatUnit: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.regular },
  targetStatLabel: { fontSize: FONT_SIZES.caption },

  sourceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(7),
    paddingHorizontal: ms(12),
    paddingVertical: ms(9),
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  sourceText: {
    flex: 1,
    fontSize: ms(12),
    fontWeight: FONTS.medium,
    lineHeight: ms(17),
  },

  summaryCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: ms(28),
    gap: ms(18),
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: ms(12),
    fontWeight: FONTS.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  caloriesValue: { fontSize: ms(26), fontWeight: FONTS.bold },
  caloriesTarget: { fontSize: FONT_SIZES.label, fontWeight: FONTS.regular },
  macrosGrid: { gap: ms(18) },

  macroItem: { gap: SPACING.sm },
  macroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
  },
  macroIconCircle: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    alignItems: "center",
    justifyContent: "center",
  },
  macroIconImg: { width: ms(16), height: ms(16) },
  macroLabel: { flex: 1, fontSize: FONT_SIZES.label, fontWeight: FONTS.medium },
  macroValue: { fontSize: FONT_SIZES.label, fontWeight: FONTS.bold },
  macroGoal: { fontWeight: FONTS.regular, fontSize: FONT_SIZES.small },
  macroTrack: {
    height: ms(5),
    borderRadius: ms(3),
    overflow: "hidden",
    marginLeft: ms(40),
  },
  macroFill: { height: "100%", borderRadius: ms(3) },

  slotSection: { marginBottom: ms(22) },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(10),
    paddingHorizontal: ms(2),
  },
  slotLabel: { fontSize: ms(18), fontWeight: FONTS.bold, letterSpacing: -0.3 },
  slotTarget: { fontSize: FONT_SIZES.small },

  optionsCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(14),
    paddingHorizontal: SPACING.md,
    gap: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  radio: {
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: ms(9), height: ms(9), borderRadius: ms(5) },
  optionInfo: { flex: 1 },
  optionName: { fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold, marginBottom: SPACING.xs },
  optionMacros: { fontSize: ms(12) },
  optionRight: { alignItems: "flex-end" },
  optionCal: { fontSize: ms(18), fontWeight: FONTS.bold },
  optionCalLabel: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.regular },

  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: ms(14),
  },
  saveBtn: {
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    alignItems: "center",
  },
  saveBtnText: { fontSize: ms(16), fontWeight: FONTS.bold },
});
