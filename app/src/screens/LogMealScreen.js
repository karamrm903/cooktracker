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
import { FONTS, RADIUS, SPACING, SHADOWS } from "../constants/theme";

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
          <Ionicons name="close" size={20} color={colors.text} />
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
  leafTopLeft: { position: "absolute", left: -45, top: 70, width: 130, height: 130, opacity: 0.7 },
  leafMidRight: {
    position: "absolute",
    right: -45,
    top: "42%",
    width: 120,
    height: 120,
    opacity: 0.65,
    transform: [{ scaleX: -1 }],
  },
  ginghamCorner: { position: "absolute", right: 0, bottom: 0, width: 140, height: 140, opacity: 0.85 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: FONTS.semibold },

  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 180 },

  hero: { alignItems: "center", marginBottom: 28 },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroIcon: { width: 40, height: 40 },
  heroTitle: { fontSize: 28, fontWeight: FONTS.bold, letterSpacing: -0.4, marginBottom: 6 },
  heroSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  section: { marginBottom: 20 },
  row: { flexDirection: "row", gap: 12, marginBottom: 20 },
  half: { flex: 1 },

  label: { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 10 },

  input: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },

  helperText: { marginTop: 8, fontSize: 12 },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "47%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  typeIcon: { width: 18, height: 18 },
  typeText: { fontSize: 14, fontWeight: FONTS.medium },

  previewLabel: { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 10 },
  previewCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 16 },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  previewMain: { fontSize: 22, fontWeight: FONTS.bold },
  previewSub: { fontSize: 14, fontWeight: FONTS.medium },

  previewBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 16 },
  previewBarFill: { flex: 1, flexDirection: "row" },

  previewMacroItem: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  previewDot: { width: 9, height: 9, borderRadius: 4.5, marginRight: 10 },
  previewMacroLabel: { fontSize: 14, flex: 1 },
  previewMacroValue: { fontSize: 14, fontWeight: FONTS.bold },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: SCREEN_BG,
  },
  saveBtn: {
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: FONTS.bold, color: "#FFFFFF" },
});
