import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useMealLogs } from "../context/MealLogsContext";
import CommonAlertModal from "../components/CommonModal";
import { FONTS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from "../constants/theme";
import { moderateScale as ms, verticalScale as vs } from "../utils/responsive";

const SCREEN_BG = "#FCF7F3";

// ── Assets ────────────────────────────────────────────────────────────────────
const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const ginghamImg = require("../../assets/webp/UserInfoBottom.webp");
const sunWebp = require("../../assets/webp/Sun.webp");
const sunCloudWebp = require("../../assets/webp/SunUnderCloud.webp");
const moonWebp = require("../../assets/webp/Moon.webp");

const sunVector = require("../../assets/pngs/sunVector.png");
const sunCloudVector = require("../../assets/pngs/sunWithCloudVector.png");
const moonVector = require("../../assets/pngs/moonVector.png");
const glassVector = require("../../assets/pngs/glassVector.png");

// Colorful hero icon + tinted box per meal type (mirrors DashboardScreen MEAL_VISUALS)
const HERO_ICON = {
  breakfast: sunWebp,
  lunch: sunCloudWebp,
  dinner: moonWebp,
  snack: glassVector,
};
const HERO_BG = {
  breakfast: "tintOrange",
  lunch: "tintMint",
  dinner: "tintPurple",
  snack: "tintGreen",
};

const MACRO_COLORS = { protein: "#EF4444", carbs: "#22C55E", fat: "#EAB308" };
const SELECTED_COLOR = "#493026";

export default function LogMealScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mealLogsContext = useMealLogs() || {};
  const addMealLog =
    mealLogsContext.addMealLog || mealLogsContext.addMeal || (() => {});

  const defaultMealType = route.params?.defaultMealType ?? "dinner";

  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState(defaultMealType);
  const [isSaving, setIsSaving] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, message: "" });

  const mealTypes = [
    { key: "breakfast", icon: sunVector },
    { key: "lunch", icon: sunCloudVector },
    { key: "dinner", icon: moonVector },
    { key: "snack", icon: glassVector },
  ];

  const proteinNum = Number(protein) || 0;
  const carbsNum = Number(carbs) || 0;
  const fatNum = Number(fat) || 0;

  const calculatedCalories = useMemo(() => {
    return proteinNum * 4 + carbsNum * 4 + fatNum * 9;
  }, [proteinNum, carbsNum, fatNum]);

  const finalCaloriesPreview = calories
    ? Number(calories) || 0
    : calculatedCalories;

  // Macro calorie split for the preview progress bar
  const pCal = proteinNum * 4;
  const cCal = carbsNum * 4;
  const fCal = fatNum * 9;
  const macroTotal = pCal + cCal + fCal;

  function formatMealLabel(type) {
    if (type === "snack") return "Snack";
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  async function handleSave() {
    if (!name.trim() || isSaving) return;

    const now = new Date();
    const meal = {
      name: name.trim(),
      calories: calories ? Number(calories) || 0 : calculatedCalories,
      protein: proteinNum,
      carbs: carbsNum,
      fat: fatNum,
      macros: { protein: proteinNum, carbs: carbsNum, fat: fatNum },
      mealType,
      meal: formatMealLabel(mealType),
      time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      loggedAt: now.toISOString(),
      dateKey: now.toISOString().slice(0, 10),
      source: "manual",
      emoji: null,
    };

    setIsSaving(true);
    try {
      await addMealLog(meal);
      navigation.goBack();
    } catch (err) {
      setErrorModal({
        visible: true,
        message: err?.message || t("logMeal.saveFailedMsg"),
      });
    } finally {
      setIsSaving(false);
    }
  }

  const canSave = name.trim() && !isSaving;

  const inputStyle = [
    styles.input,
    { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: SCREEN_BG }]} edges={["top", "bottom"]}>
      {/* Decorative background */}
      <Image source={leafImg} style={styles.leafTopLeft} resizeMode="contain" />
      <Image source={leafImg} style={styles.leafMidRight} resizeMode="contain" />
      <Image source={ginghamImg} style={styles.ginghamCorner} resizeMode="cover" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.surface }, SHADOWS.sm]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={ms(20)} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("logMeal.headerTitle")}
        </Text>

        <View style={styles.closeBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View
            style={[
              styles.heroIconBox,
              { backgroundColor: colors[HERO_BG[mealType]] ?? colors.tintOrange },
            ]}
          >
            <Image source={HERO_ICON[mealType] ?? glassVector} style={styles.heroIcon} resizeMode="contain" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {t("logMeal.heroTitle")}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            {t("logMeal.heroSubtitle")}
          </Text>
        </View>

        {/* Meal name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t("logMeal.mealNameLabel")}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("logMeal.mealNamePlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
        </View>

        {/* Meal type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t("logMeal.mealTypeLabel")}
          </Text>
          <View style={styles.typeRow}>
            {mealTypes.map((type) => {
              const active = mealType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setMealType(type.key)}
                  activeOpacity={0.75}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: active ? SELECTED_COLOR : colors.border,
                    },
                  ]}
                >
                  <Image source={type.icon} style={styles.typeIcon} resizeMode="contain" />
                  <Text
                    style={[
                      styles.typeText,
                      { color: active ? SELECTED_COLOR : colors.text },
                      active && { fontWeight: FONTS.semibold },
                    ]}
                  >
                    {t(`mealType.${type.key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Calories */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t("logMeal.caloriesLabel")}
          </Text>
          <TextInput
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            placeholder={t("logMeal.caloriesPlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            {calories
              ? t("logMeal.manualCalories")
              : t("logMeal.autoCalculated", { amount: finalCaloriesPreview })}
          </Text>
        </View>

        {/* Protein + Carbs */}
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("logMeal.proteinLabel")}
            </Text>
            <TextInput
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
          </View>

          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("logMeal.carbsLabel")}
            </Text>
            <TextInput
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
          </View>
        </View>

        {/* Fat */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t("logMeal.fatLabel")}
          </Text>
          <TextInput
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
        </View>

        {/* Preview */}
        <Text style={[styles.previewLabel, { color: colors.text }]}>
          {t("logMeal.preview")}
        </Text>
        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.previewRow}>
            <Text style={[styles.previewMain, { color: colors.text }]}>
              {finalCaloriesPreview} kcal
            </Text>
            <Text style={[styles.previewSub, { color: colors.textMuted }]}>
              {formatMealLabel(mealType)}
            </Text>
          </View>

          {/* Macro progress bar */}
          <View style={[styles.previewBar, { backgroundColor: colors.surfaceAlt }]}>
            {macroTotal > 0 && (
              <View style={styles.previewBarFill}>
                <View style={{ flex: pCal, backgroundColor: MACRO_COLORS.protein }} />
                <View style={{ flex: cCal, backgroundColor: MACRO_COLORS.carbs }} />
                <View style={{ flex: fCal, backgroundColor: MACRO_COLORS.fat }} />
              </View>
            )}
          </View>

          {[
            { label: t("macros.protein"), value: proteinNum, color: MACRO_COLORS.protein },
            { label: t("macros.carbs"), value: carbsNum, color: MACRO_COLORS.carbs },
            { label: t("macros.fat"), value: fatNum, color: MACRO_COLORS.fat },
          ].map((m) => (
            <View key={m.label} style={styles.previewMacroItem}>
              <View style={[styles.previewDot, { backgroundColor: m.color }]} />
              <Text style={[styles.previewMacroLabel, { color: colors.textSecondary }]}>
                {m.label}
              </Text>
              <Text style={[styles.previewMacroValue, { color: colors.text }]}>
                {m.value}g
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Save */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.45 },
          ]}
          activeOpacity={0.85}
          disabled={!canSave}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{t("logMeal.saveMeal")}</Text>
          )}
        </TouchableOpacity>
      </View>

      <CommonAlertModal
        visible={errorModal.visible}
        title={t("logMeal.saveFailedTitle")}
        message={errorModal.message}
        variant="error"
        primaryText={t("logMeal.tryAgain")}
        onPrimary={() => setErrorModal({ visible: false, message: "" })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Decor
  leafTopLeft: { position: "absolute", left: -ms(45), top: vs(70), width: ms(130), height: ms(130), opacity: 0.7 },
  leafMidRight: {
    position: "absolute",
    right: -ms(45),
    top: "42%",
    width: ms(120),
    height: ms(120),
    opacity: 0.65,
    transform: [{ scaleX: -1 }],
  },
  ginghamCorner: { position: "absolute", right: 0, bottom: 0, width: ms(140), height: ms(140), opacity: 0.85 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(12),
  },
  closeBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: ms(16), fontWeight: FONTS.semibold },

  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: ms(180) },

  hero: { alignItems: "center", marginBottom: ms(28) },
  heroIconBox: {
    width: ms(64),
    height: ms(64),
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ms(14),
  },
  heroIcon: { width: ms(40), height: ms(40) },
  heroTitle: { fontSize: FONT_SIZES.h2, fontWeight: FONTS.bold, letterSpacing: -0.4, marginBottom: ms(6) },
  heroSubtitle: { fontSize: FONT_SIZES.label, textAlign: "center", lineHeight: ms(20) },

  section: { marginBottom: ms(20) },
  row: { flexDirection: "row", gap: ms(12), marginBottom: ms(20) },
  half: { flex: 1 },

  label: { fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold, marginBottom: ms(10) },

  input: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(14),
    fontSize: FONT_SIZES.body,
  },

  helperText: { marginTop: SPACING.sm, fontSize: ms(12) },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: ms(12) },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    width: "47%",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(12),
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  typeIcon: { width: ms(18), height: ms(18) },
  typeText: { fontSize: FONT_SIZES.label, fontWeight: FONTS.medium },

  previewLabel: { fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold, marginBottom: ms(10) },
  previewCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ms(14),
  },
  previewMain: { fontSize: ms(22), fontWeight: FONTS.bold },
  previewSub: { fontSize: FONT_SIZES.label, fontWeight: FONTS.medium },

  previewBar: { height: ms(6), borderRadius: ms(3), overflow: "hidden", marginBottom: SPACING.md },
  previewBarFill: { flex: 1, flexDirection: "row" },

  previewMacroItem: { flexDirection: "row", alignItems: "center", paddingVertical: ms(6) },
  previewDot: { width: ms(9), height: ms(9), borderRadius: ms(4.5), marginRight: ms(10) },
  previewMacroLabel: { fontSize: FONT_SIZES.label, flex: 1 },
  previewMacroValue: { fontSize: FONT_SIZES.label, fontWeight: FONTS.bold },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: ms(12),
    paddingBottom: SPACING.lg,
    backgroundColor: SCREEN_BG,
  },
  saveBtn: {
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: ms(16), fontWeight: FONTS.bold, color: "#FFFFFF" },
});
