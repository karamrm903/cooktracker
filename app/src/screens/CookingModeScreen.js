import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FONTS, FONT_SIZES, RADIUS, SPACING } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import { useTheme } from "../context/ThemeContext";
import { useMealLogs } from "../context/MealLogsContext";
import CommonAlertModal from "../components/CommonModal";

// ── Assets ────────────────────────────────────────────────
const cornerLeafImg = require("../../assets/webp/SignInLeaf.webp");
const sprigLeafImg = require("../../assets/pngs/cookingModeLeaf.png");
const tickImg = require("../../assets/pngs/tickVector.png");

// ── Figma palette ─────────────────────────────────────────
const SCREEN_BG = "#FCF7F3";
const ORANGE = "#FF8A45";
const HEADING = "#493026";
const TRACK_BG = "#FCEFE2";
const CHECK_OUTER = "#FBE6D6";
const CHECK_GREEN = "#7CA15C";

// ── Helpers ─────────────────────────────────────────────

function inferMealType(recipe, now = new Date()) {
  const hour = now.getHours();

  const snackKeywords = [
    "cake",
    "brownie",
    "cookie",
    "cookies",
    "chocolate",
    "dessert",
    "muffin",
    "donut",
    "doughnut",
    "croissant",
    "sweet",
    "candy",
    "ice cream",
    "nutella",
    "frosting",
    "cupcake",
    "oreo",
  ];

  const title = (recipe.title ?? "").toLowerCase();

  const ingredientText = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
        .map((ing) => (typeof ing === "string" ? ing : (ing.name ?? "")))
        .join(" ")
        .toLowerCase()
    : "";

  const combined = `${title} ${ingredientText}`;

  const looksLikeSnack = snackKeywords.some((word) => combined.includes(word));

  if (looksLikeSnack) return "snack";

  if (hour >= 5 && hour < 12) return "breakfast";
  if (hour >= 12 && hour < 17) return "lunch";

  return "dinner";
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TimerBar({ timer, colors, bottomOffset }) {
  const barAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!timer) return;
    const pct = timer.remainingSeconds / timer.totalSeconds;
    if (timer.remainingSeconds === timer.totalSeconds) {
      barAnim.setValue(1);
    } else {
      Animated.timing(barAnim, {
        toValue: pct,
        duration: 950,
        useNativeDriver: false,
      }).start();
    }
  }, [timer?.remainingSeconds]);

  if (!timer) return null;

  // Red only in the final stretch — otherwise stay on the warm orange theme.
  const isCritical = timer.remainingSeconds <= 10 && timer.remainingSeconds > 0;
  const accent = isCritical ? colors.error : ORANGE;

  return (
    <View
      style={[
        tb.wrap,
        { backgroundColor: colors.surface, bottom: bottomOffset },
      ]}
    >
      <View style={tb.row}>
        <View style={tb.icon}>
          <Ionicons name="timer-outline" size={ms(16)} color={accent} />
        </View>

        <View style={tb.info}>
          <Text style={tb.label} numberOfLines={1}>
            {timer.label}
          </Text>
          <View style={tb.track}>
            <Animated.View
              style={[
                tb.fill,
                {
                  backgroundColor: accent,
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>

        <Text style={[tb.time, { color: accent }]}>
          {fmt(timer.remainingSeconds)}
        </Text>
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: ms(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: ms(12) },
  icon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TRACK_BG,
  },
  info: { flex: 1, gap: ms(7) },
  label: { fontSize: FONT_SIZES.small, fontWeight: FONTS.semibold, color: HEADING },
  track: { height: ms(5), borderRadius: ms(3), overflow: "hidden", backgroundColor: TRACK_BG },
  fill: { height: "100%", borderRadius: ms(3) },
  time: {
    fontSize: ms(19),
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    minWidth: ms(52),
    textAlign: "right",
  },
});

export default function CookingModeScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { recipe } = route.params;
  const { colors } = useTheme();
  const { addMealLog } = useMealLogs();
  const insets = useSafeAreaInsets();

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [timer, setTimer] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: "",
    message: "",
    variant: "info",
    isLogConfirm: false,
  });

  const intervalRef = useRef(null);
  const warnedRef = useRef(false);
  const startedSteps = useRef(new Set());

  const totalSteps = recipe.steps.length;
  const currentStep = recipe.steps[stepIndex];
  const progress = done ? 1 : stepIndex / Math.max(totalSteps - 1, 1);

  const navBarH = done ? 126 + insets.bottom : 76 + insets.bottom;
  const timerBottom = navBarH + ms(16);

  const startTimer = useCallback((step) => {
    if (!step.timerMinutes) return;
    clearInterval(intervalRef.current);
    warnedRef.current = false;
    const total = step.timerMinutes * 60;
    setTimer({
      label: step.timerLabel ?? "Timer",
      totalSeconds: total,
      remainingSeconds: total,
    });
  }, []);

  useEffect(() => {
    if (done || !currentStep?.timerMinutes) return;
    const key = `step_${stepIndex}`;
    if (startedSteps.current.has(key)) return;
    startedSteps.current.add(key);
    const t = setTimeout(() => startTimer(currentStep), 500);
    return () => clearTimeout(t);
  }, [stepIndex, done, currentStep, startTimer]);

  useEffect(() => {
    if (done) {
      clearInterval(intervalRef.current);
      setTimer(null);
      return;
    }

    if (!timer || timer.remainingSeconds <= 0) return;

    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (!prev) return null;
        const next = prev.remainingSeconds - 1;

        if (next === 60 && !warnedRef.current) {
          warnedRef.current = true;
          setAlertModal({
            visible: true,
            title: t("cookingMode.timerAlert.oneMinTitle"),
            message: t("cookingMode.timerAlert.oneMinMsg", {
              label: prev.label.toLowerCase(),
            }),
            variant: "warning",
          });
        }

        if (next <= 0) {
          clearInterval(intervalRef.current);
          setAlertModal({
            visible: true,
            title: t("cookingMode.timerAlert.doneTitle"),
            message: t("cookingMode.timerAlert.doneMsg", { label: prev.label }),
            variant: "success",
          });
          return null;
        }

        return { ...prev, remainingSeconds: next };
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [done, timer?.label, timer?.totalSeconds]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  function goNext() {
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  }

  function goBack() {
    if (done) {
      navigation.navigate("MainTabs");
      return;
    }

    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  }

  function handleLogWhatIAte() {
    setAlertModal({
      visible: true,
      title: t("cookingMode.logMealTitle"),
      message: t("cookingMode.logMealMessage", { title: recipe.title }),
      variant: "info",
      isLogConfirm: true,
    });
  }

  async function saveConsumedMeal() {
    const gramsEaten = recipe.estimatedGrams ?? 600;
    const now = new Date();
    const mealType = inferMealType(recipe, now);

    const total = recipe.nutrition?.total ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    const estimatedRecipeGrams = recipe.estimatedGrams ?? 600;

    const ratio = gramsEaten / estimatedRecipeGrams;

    const calories = Math.round((total.calories ?? 0) * ratio);
    const protein = Math.round((total.protein ?? 0) * ratio);
    const carbs = Math.round((total.carbs ?? 0) * ratio);
    const fat = Math.round((total.fat ?? 0) * ratio);

    const mealLabel =
      mealType === "snack"
        ? "Snack"
        : mealType.charAt(0).toUpperCase() + mealType.slice(1);

    const mealEmoji =
      mealType === "breakfast"
        ? "🍳"
        : mealType === "lunch"
          ? "🥗"
          : mealType === "dinner"
            ? "🍽️"
            : "🍪";

    setIsSaving(true);
    try {
      await addMealLog({
        id: `meal_${Date.now()}`,
        name: recipe.title,
        calories,
        protein,
        carbs,
        fat,
        macros: { protein, carbs, fat },
        mealType,
        meal: mealLabel,
        time: now.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        loggedAt: now.toISOString(),
        dateKey: now.toISOString().slice(0, 10),
        source: "recipe",
        emoji: recipe.emoji ?? mealEmoji,
        recipeId: recipe.id,
        gramsEaten,
        estimatedRecipeGrams,
      });
    } finally {
      setIsSaving(false);
    }

    navigation.navigate("MainTabs");
  }

  return (
    <SafeAreaView
      style={[cm.safe, { backgroundColor: SCREEN_BG }]}
      edges={["top", "bottom"]}
    >
      <View style={cm.topBar}>
        <View style={cm.topRow}>
          <TouchableOpacity
            style={[cm.closeBtn, { backgroundColor: colors.surface }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={ms(18)} color={colors.text} />
          </TouchableOpacity>

          {!done && (
            <Text style={cm.counter}>
              {t("cookingMode.stepOf", {
                current: stepIndex + 1,
                total: totalSteps,
              })}
            </Text>
          )}
        </View>

        <View style={[cm.progressTrack, { backgroundColor: TRACK_BG }]}>
          <View style={[cm.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Decorative leaves */}
      <Image
        source={cornerLeafImg}
        style={cm.cornerLeaf}
        resizeMode="contain"
        pointerEvents="none"
      />
      <Image
        source={sprigLeafImg}
        style={cm.sprigLeaf}
        resizeMode="contain"
        pointerEvents="none"
      />

      <View style={cm.content}>
        {done ? (
          <View style={cm.doneWrap}>
            <View style={cm.checkOuter}>
              <Image
                source={sprigLeafImg}
                style={cm.checkLeafLeft}
                resizeMode="contain"
              />
              <Image
                source={sprigLeafImg}
                style={cm.checkLeafRight}
                resizeMode="contain"
              />
              <View style={cm.checkInner}>
                {timer ? (
                  <Ionicons
                    name="hourglass-outline"
                    size={ms(34)}
                    color="#fff"
                  />
                ) : (
                  <Image
                    source={tickImg}
                    style={cm.checkTick}
                    resizeMode="contain"
                  />
                )}
              </View>
            </View>

            <Text style={cm.doneTitle}>
              {timer
                ? t("cookingMode.almostDone")
                : t("cookingMode.cookingFinished")}
            </Text>

            <Text style={[cm.doneSub, { color: colors.textMuted }]}>
              {timer
                ? t("cookingMode.almostDoneSub", {
                    label: timer.label.toLowerCase(),
                  })
                : t("cookingMode.finishedSub", { title: recipe.title })}
            </Text>
          </View>
        ) : (
          <View style={cm.stepWrap}>
            <Text style={cm.stepNum}>
              {t("cookingMode.stepLabel", { number: stepIndex + 1 })}
            </Text>

            <Text style={cm.stepText}>{currentStep.text}</Text>

            {currentStep.timerMinutes && (
              <View style={[cm.timerHint, { backgroundColor: TRACK_BG }]}>
                <Ionicons name="timer-outline" size={ms(14)} color={ORANGE} />
                <Text style={[cm.timerHintText, { color: ORANGE }]}>
                  {t("cookingMode.timerHint", {
                    minutes: currentStep.timerMinutes,
                  })}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TimerBar timer={timer} colors={colors} bottomOffset={timerBottom} />

      <View style={[cm.navBar, { paddingBottom: insets.bottom + ms(8) }]}>
        {done ? (
          <>
            <TouchableOpacity
              style={[
                cm.btn,
                cm.btnSecondary,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => navigation.navigate("MainTabs")}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={ms(18)} color={ORANGE} />
              <Text style={cm.btnTextSecondary}>
                {t("cookingMode.dashboard")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[cm.btn, cm.btnPrimary, { opacity: isSaving ? 0.6 : 1 }]}
              onPress={handleLogWhatIAte}
              activeOpacity={0.85}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={cm.btnTextPrimary}>
                  {t("cookingMode.logWhatIAte")}
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[
                cm.btn,
                cm.btnSecondary,
                { backgroundColor: colors.surface },
                stepIndex === 0 && { opacity: 0.4 },
              ]}
              onPress={goBack}
              disabled={stepIndex === 0}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={ms(18)} color={ORANGE} />
              <Text style={cm.btnTextSecondary}>{t("common.back")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[cm.btn, cm.btnPrimary]}
              onPress={goNext}
              activeOpacity={0.85}
            >
              <Text style={cm.btnTextPrimary}>
                {stepIndex === totalSteps - 1
                  ? t("common.finish")
                  : t("common.next")}
              </Text>
              <Ionicons
                name={
                  stepIndex === totalSteps - 1 ? "checkmark" : "arrow-forward"
                }
                size={ms(18)}
                color="#fff"
              />
            </TouchableOpacity>
          </>
        )}
      </View>
      <CommonAlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        primaryText={
          alertModal.isLogConfirm
            ? t("common.yes")
            : t("cookingMode.timerAlert.ok")
        }
        onPrimary={() => {
          setAlertModal((a) => ({ ...a, visible: false }));
          if (alertModal.isLogConfirm) saveConsumedMeal();
        }}
        secondaryText={alertModal.isLogConfirm ? t("common.no") : undefined}
        onSecondary={() => setAlertModal((a) => ({ ...a, visible: false }))}
      />
    </SafeAreaView>
  );
}

const cm = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: ms(12),
    paddingBottom: ms(20),
    gap: ms(12),
    zIndex: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: ms(40),
  },
  closeBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  counter: {
    fontSize: FONT_SIZES.small,
    fontWeight: FONTS.semibold,
    color: ORANGE,
  },

  progressTrack: {
    height: ms(4),
    borderRadius: ms(2),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: ms(2),
    backgroundColor: ORANGE,
  },

  // Decorations
  cornerLeaf: {
    position: "absolute",
    top: ms(140),
    right: 0,
    width: ms(150),
    height: ms(180),
    opacity: 0.95,
    zIndex: 0,
  },
  sprigLeaf: {
    position: "absolute",
    left: ms(12),
    bottom: ms(150),
    width: ms(95),
    height: ms(95),
    opacity: 0.9,
    zIndex: 0,
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: ms(28),
    zIndex: 1,
  },

  stepWrap: { gap: ms(20) },
  stepNum: {
    fontSize: FONT_SIZES.small,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: ORANGE,
  },
  stepText: {
    fontSize: ms(24),
    fontWeight: FONTS.bold,
    lineHeight: ms(33),
    letterSpacing: -0.3,
    color: HEADING,
  },

  timerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderRadius: RADIUS.full,
    alignSelf: "flex-start",
  },
  timerHintText: { fontSize: FONT_SIZES.small, fontWeight: FONTS.medium },

  doneWrap: { alignItems: "center", gap: ms(16) },
  checkOuter: {
    width: ms(140),
    height: ms(140),
    borderRadius: ms(70),
    backgroundColor: CHECK_OUTER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ms(8),
  },
  checkInner: {
    width: ms(76),
    height: ms(76),
    borderRadius: ms(38),
    backgroundColor: CHECK_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  checkTick: { width: ms(36), height: ms(36) },
  checkLeafLeft: {
    position: "absolute",
    left: -ms(34),
    bottom: ms(4),
    width: ms(64),
    height: ms(64),
    opacity: 0.9,
  },
  checkLeafRight: {
    position: "absolute",
    right: -ms(34),
    bottom: ms(4),
    width: ms(64),
    height: ms(64),
    opacity: 0.9,
    transform: [{ scaleX: -1 }],
  },
  doneTitle: {
    fontSize: ms(28),
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    color: HEADING,
  },
  doneSub: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.regular,
    textAlign: "center",
    lineHeight: ms(22),
    paddingHorizontal: ms(20),
  },

  navBar: {
    flexDirection: "row",
    gap: ms(12),
    paddingHorizontal: SPACING.lg,
    paddingTop: ms(12),
    zIndex: 2,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(8),
    paddingVertical: ms(15),
    borderRadius: RADIUS.full,
  },
  btnSecondary: { borderWidth: 1, borderColor: "#EFDFD2" },
  btnPrimary: { backgroundColor: ORANGE },
  btnTextSecondary: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.bold,
    color: ORANGE,
  },
  btnTextPrimary: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.bold,
    color: "#fff",
  },
});
