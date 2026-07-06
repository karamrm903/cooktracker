import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackActions, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { CalorieRing } from "../components/CalorieRing";
import CommonAlertModal from "../components/CommonModal";
import {
  ExpandedNutrition,
  MacroBar,
  NutrientRow,
} from "../components/NutritionExpansion";
import { FONTS, FONT_SIZES, RADIUS, SPACING } from "../constants/theme";
import {
  moderateScale as ms,
  horizontalScale as hs,
  verticalScale as vs,
  SCREEN_WIDTH,
} from "../utils/responsive";

// Hero "Today" card sizing — derived from screen WIDTH (not height) and clamped,
// so the ring + side columns always fit: floor keeps it usable on small phones,
// ceiling stops it ballooning on tablets. Utensils track the ring height.
const HERO_RING_SIZE = Math.round(
  Math.min(ms(168), Math.max(122, SCREEN_WIDTH * 0.42)),
);
const HERO_UTENSIL_HEIGHT = Math.round(Math.min(vs(140), HERO_RING_SIZE * 0.9));
import { useMealLogs } from "../context/MealLogsContext";
import { useTheme } from "../context/ThemeContext";
import { profileService } from "../services/profile.service";
import {
  subscriptionService,
  isUsageLimitError,
} from "../services/subscription.service";
import { useSubscription } from "../hooks/useSubscription";
import { useExplore } from "../context/ExploreContext";
import { RootState } from "../store";
import { Meal, UserProfile } from "../types";
import PaywallModal, { PaywallFeature } from "../components/PaywallModal";
import SafeAreaViewCustom from "@/components/atoms/SafeAreaViewCustom";

// ── New UI assets ───────────────────────────────────────────────────────────
const cupPlantImg = require("../../assets/webp/CupPlant.webp");
const streakFireImg = require("../../assets/webp/StreakFire.webp");
const arrowRightImg = require("../../assets/webp/ArrowRight.webp");
const forkImg = require("../../assets/webp/Fork.webp");
const knifeImg = require("../../assets/webp/Knife.webp");
const doubleStarImg = require("../../assets/webp/DoubleStar.webp");
const singleLeafImg = require("../../assets/webp/Plant.webp");
const chevronRightImg = require("../../assets/webp/ChevronRight.webp");
const deleteImg = require("../../assets/webp/Delete.webp");
const sunImg = require("../../assets/webp/Sun.webp");
const sunCloudImg = require("../../assets/webp/SunUnderCloud.webp");
const moonImg = require("../../assets/webp/Moon.webp");
const plantImg = require("../../assets/webp/leafPlan.webp");

// Per meal-type visuals (icon image, tinted box bg key, chip emoji)
const MEAL_VISUALS: Record<
  string,
  { img: any; bg: keyof ReturnType<typeof useTheme>["colors"]; emoji: string }
> = {
  breakfast: { img: sunImg, bg: "tintOrange", emoji: "☀️" },
  lunch: { img: sunCloudImg, bg: "tintMint", emoji: "🌤️" },
  dinner: { img: moonImg, bg: "tintPurple", emoji: "🌙" },
  snack: { img: plantImg, bg: "tintGreen", emoji: "🍪" },
};

type RootStackParamList = {
  Dashboard: undefined;
  Analyzing: { url: string };
  LogMeal: { defaultMealType: string };
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Dashboard"
>;

interface DashboardProps {
  navigation: NavigationProp;
}

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }: DashboardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mealLogsContext = useMealLogs() as any;
  const allMeals: Meal[] =
    mealLogsContext.allMeals || mealLogsContext.meals || [];
  const removeMeal = mealLogsContext.removeMeal || (() => {});
  const updateMeal = mealLogsContext.updateMeal || (() => {});
  const refreshMeals = mealLogsContext.refreshMeals || (() => {});
  const isLoadingMeals: boolean = mealLogsContext.isLoadingMeals ?? false;
  const isInitialLoad: boolean = mealLogsContext.isInitialLoad ?? true;
  const showMealSkeleton = isLoadingMeals && isInitialLoad;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [errorAlert, setErrorAlert] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    id: string;
    name: string;
  }>({ visible: false, id: "", name: "" });
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [importChecking, setImportChecking] = useState(false);
  const { session, user } = useSelector((state: RootState) => state.auth);
  const streak = useSelector((state: RootState) => state.meals.streak);
  const { isSubscribed } = useSubscription();
  const { ensure: ensureExplore } = useExplore();

  // Re-fetch meals + profile whenever Dashboard comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshMeals();
      if (!session?.access_token) {
        setIsLoadingProfile(false);
        return;
      }
      setIsLoadingProfile(true);
      profileService
        .getProfile(session)
        .then((p) => setProfileData(p))
        .catch((err: any) => {
          console.error("Dashboard profile fetch error:", err);
          setErrorAlert({
            visible: true,
            message: err.message || t("dashboard.profileLoadFailedMsg"),
          });
        })
        .finally(() => setIsLoadingProfile(false));

      // Warm the Explore deck + image cache in the background so the swiper
      // is instant when the user opens the Explore tab.
      ensureExplore(session).catch(() => {});
    }, [refreshMeals, session, ensureExplore]),
  );

  async function handleImport() {
    const url = importUrl.trim();
    if (!url || importChecking) return;

    setImportChecking(true);
    try {
      await subscriptionService.checkRecipeImport(session);
      setImportUrl("");
      navigation.dispatch(StackActions.push("Analyzing", { url }));
    } catch (err: any) {
      if (isUsageLimitError(err)) {
        setPaywallVisible(true);
      } else {
        // Non-limit error — let it through (fail open)
        setImportUrl("");
        navigation.dispatch(StackActions.push("Analyzing", { url }));
      }
    } finally {
      setImportChecking(false);
    }
  }
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isLoadingProfile || showMealSkeleton) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isLoadingProfile, showMealSkeleton, skeletonAnim]);

  // Use email prefix if available, otherwise just 'Chef'.
  const emailPrefix = user?.email ? user.email.split("@")[0] : "Chef";
  const firstName = profileData?.name || emailPrefix;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  const todaysMeals = allMeals
    .filter((meal) => meal.dateKey === todayKey)
    .sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));

  const totalCalories = todaysMeals.reduce(
    (sum, meal) => sum + (meal.calories || 0),
    0,
  );
  const totalProtein = todaysMeals.reduce(
    (sum, meal) => sum + (meal.protein || 0),
    0,
  );
  const totalCarbs = todaysMeals.reduce(
    (sum, meal) => sum + (meal.carbs || 0),
    0,
  );
  const totalFat = todaysMeals.reduce((sum, meal) => sum + (meal.fat || 0), 0);

  const calorieGoal = profileData?.calories ?? 0;
  const proteinGoal = profileData?.protein ?? 0;
  const carbsGoal = profileData?.carbs ?? 0;
  const fatGoal = profileData?.fat ?? 0;

  const caloriePct = Math.min(totalCalories / calorieGoal, 1);
  const caloriesLeft = Math.max(calorieGoal - totalCalories, 0);

  const mealSections = [
    { key: "breakfast", emoji: "🍳", icon: "sunny-outline" as const },
    { key: "lunch", emoji: "🥗", icon: "restaurant-outline" as const },
    { key: "dinner", emoji: "🍽️", icon: "moon-outline" as const },
    { key: "snack", emoji: "🍪", icon: "cafe-outline" as const },
  ].map((section) => {
    const label = t(`mealType.${section.key}`);
    const meals = todaysMeals.filter((meal) => meal.mealType === section.key);

    return {
      ...section,
      label,
      meals:
        meals.length > 0
          ? meals
          : [
              {
                id: `pending_${section.key}`,
                name: label,
                pending: true,
                mealType: section.key as any,
                emoji: section.emoji,
              } as Meal,
            ],
    };
  });

  const hasNoMealsLogged = todaysMeals.length === 0;

  function handleToggle(id) {
    LayoutAnimation.configureNext({
      duration: 260,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setExpandedId((prev) => (prev === id ? null : id));
  }
  function handleEditLoggedGrams(meal) {
    if (!meal || meal.source !== "recipe") return;

    Alert.prompt(
      t("dashboard.editGrams"),
      t("dashboard.editGrams"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: (value) => {
            const grams = Number(value);
            if (!grams || grams <= 0) return;

            const total = meal.fullRecipeNutrition ?? {
              calories: meal.calories ?? 0,
              protein: meal.protein ?? 0,
              carbs: meal.carbs ?? 0,
              fat: meal.fat ?? 0,
            };

            const estimatedRecipeGrams = meal.estimatedRecipeGrams ?? 600;
            const ratio = grams / estimatedRecipeGrams;

            const calories = Math.round((total.calories ?? 0) * ratio);
            const protein = Math.round((total.protein ?? 0) * ratio);
            const carbs = Math.round((total.carbs ?? 0) * ratio);
            const fat = Math.round((total.fat ?? 0) * ratio);

            updateMeal(meal.id, {
              calories,
              protein,
              carbs,
              fat,
              gramsEaten: grams,
            });
          },
        },
      ],
      "plain-text",
      String(meal.gramsEaten ?? ""),
    );
  }

  const macros = [
    { label: t("macros.protein"), value: totalProtein, goal: proteinGoal },
    { label: t("macros.carbs"), value: totalCarbs, goal: carbsGoal },
    { label: t("macros.fat"), value: totalFat, goal: fatGoal },
  ];

  return (
    <SafeAreaViewCustom
      style={[styles.safe, { backgroundColor: "#FCF7F3" }]}
      edges={["top"]}
    >
      <Image
        source={cupPlantImg}
        style={styles.headerPlant}
        resizeMode="contain"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: "#7F6C64" }]}>
            {t("dashboard.welcomeBack")},
          </Text>
          <Text style={[styles.name, { color: "#493026" }]}>{firstName}</Text>
          <View style={styles.headerMeta}>
            <Text style={[styles.dateText, { color: "#7F6C64" }]}>{today}</Text>
            <View
              style={[
                styles.streakChip,
                { backgroundColor: colors.tintOrange },
              ]}
            >
              <Image
                source={streakFireImg}
                style={styles.streakFire}
                resizeMode="contain"
              />
              <Text style={[styles.streakText, { color: colors.primary }]}>
                {`${Math.max(1, streak ?? 0)} day${Math.max(1, streak ?? 0) === 1 ? "" : "s"}`}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.importCard,
            { backgroundColor: "#FFFFFF", borderColor: "#FCF7F3" },
          ]}
        >
          <View style={[styles.importIconBox, { backgroundColor: "#FCF7F3" }]}>
            <Ionicons name="link-outline" size={ms(20)} color={"#7F6C64"} />
          </View>
          <TextInput
            style={[styles.importInput, { color: colors.text }]}
            placeholder={t("dashboard.pasteLinkPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={importUrl}
            onChangeText={setImportUrl}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleImport}
          />
          <TouchableOpacity
            style={[
              styles.importGoBtn,
              {
                backgroundColor: colors.tintOrange,
                opacity: importChecking || !importUrl.trim() ? 0.5 : 1,
              },
            ]}
            onPress={handleImport}
            activeOpacity={0.7}
            disabled={importChecking || !importUrl.trim()}
          >
            <Image
              source={arrowRightImg}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: "#493026" }]}>Today</Text>

          <View
            style={[
              styles.heroCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {isLoadingProfile || showMealSkeleton ? (
              <View style={styles.skeletonRingContainer}>
                <Animated.View
                  style={[styles.skeletonRing, { opacity: skeletonAnim }]}
                />
              </View>
            ) : (
              <View style={styles.heroRow}>
                {/* Goal — left */}
                <View style={styles.heroSideRow}>
                  <Image
                    source={forkImg}
                    style={styles.heroUtensilFolk}
                    resizeMode="cover"
                  />
                  <View style={styles.heroSideTextCol}>
                    <Image
                      source={doubleStarImg}
                      style={styles.heroStar}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        styles.heroSideLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      {t("dashboard.goal")}
                    </Text>
                    <Text
                      style={[
                        styles.heroSideValue,
                        { color: colors.secondary },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {calorieGoal.toLocaleString()}
                    </Text>
                    <Text
                      style={[styles.heroSideUnit, { color: colors.textMuted }]}
                    >
                      kcal
                    </Text>
                  </View>
                </View>

                {/* Ring — center */}
                <View
                  style={{
                    position: "relative",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CalorieRing
                    calories={totalCalories}
                    goal={calorieGoal}
                    textColor={colors.text}
                    subColor={colors.textMuted}
                    trackColor={colors.surfaceAlt}
                    size={HERO_RING_SIZE}
                  />
                  <Image
                    source={plantImg}
                    style={{
                      position: "absolute",
                      top: ms(30),
                      width: ms(48),
                      height: ms(24),
                    }}
                    resizeMode="cover"
                  />
                  <Image
                    source={singleLeafImg}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: -ms(20),
                      width: ms(40),
                      height: ms(20),
                    }}
                    resizeMode="contain"
                  />
                </View>

                {/* Eaten — right */}
                <View style={styles.heroSideRow}>
                  <View style={styles.heroSideTextCol}>
                    <Image
                      source={doubleStarImg}
                      style={styles.heroStar}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        styles.heroSideLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      {t("dashboard.eaten")}
                    </Text>
                    <Text
                      style={[styles.heroSideValue, { color: colors.primary }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {totalCalories.toLocaleString()}
                    </Text>
                    <Text
                      style={[styles.heroSideUnit, { color: colors.textMuted }]}
                    >
                      kcal
                    </Text>
                  </View>
                  <Image
                    source={knifeImg}
                    style={styles.heroUtensil}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            {/* Macro grid */}
            {!isLoadingProfile && !showMealSkeleton && (
              <View
                style={[styles.macroGrid, { borderTopColor: colors.border }]}
              >
                {macros.map((m, i) => (
                  <View key={m.label} style={styles.macroCol}>
                    <Text
                      style={[
                        styles.macroColLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      {m.label}
                    </Text>
                    <Text
                      style={[styles.macroColValue, { color: colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {m.value}
                      <Text style={{ color: colors.textMuted }}>
                        {" "}
                        / {m.goal}g
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── TODAY'S MEALS ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {t("dashboard.todaysMeals")}
          </Text>
          {showMealSkeleton ? (
            <View
              style={[
                styles.mealsCard,
                {
                  backgroundColor: colors.surface,
                  padding: SPACING.md,
                  gap: ms(12),
                },
              ]}
            >
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.mealSkeletonRow,
                    {
                      backgroundColor: colors.surfaceAlt,
                      opacity: skeletonAnim,
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            mealSections.map((section) => {
              const visual = MEAL_VISUALS[section.key] ?? MEAL_VISUALS.snack;
              const chipTextColors: Record<string, string> = {
                breakfast: colors.primary,
                lunch: colors.rolloverGreenText || colors.secondary,
                dinner: "#7B1FA2",
                snack: colors.secondary,
              };

              return (
                <React.Fragment key={section.key}>
                  {section.meals.map((meal) => {
                    const isExpanded = expandedId === meal.id;

                    return (
                      <View
                        key={meal.id}
                        style={[
                          styles.mealsCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.mealRow}
                          activeOpacity={meal.pending ? 0.7 : 0.65}
                          onPress={
                            meal.pending
                              ? () =>
                                  navigation.navigate("SearchFood", {
                                    defaultMealType: meal.mealType,
                                  })
                              : () => handleToggle(meal.id)
                          }
                        >
                          {/* Tinted icon box */}
                          <View
                            style={[
                              styles.mealIconBox,
                              { backgroundColor: colors[visual.bg] as string },
                            ]}
                          >
                            <Image
                              source={visual.img}
                              style={styles.mealIcon}
                              resizeMode="contain"
                            />
                          </View>

                          <View style={styles.mealInfo}>
                            <Text
                              style={[
                                styles.mealRemaining,
                                { color: colors.secondary },
                              ]}
                            >
                              {caloriesLeft.toLocaleString()}{" "}
                              {t("dashboard.kcalRemaining")}
                            </Text>

                            <Text
                              style={[styles.mealName, { color: colors.text }]}
                              numberOfLines={1}
                            >
                              {meal.pending ? section.label : meal.name}
                            </Text>

                            <View style={styles.mealChipRow}>
                              <View
                                style={[
                                  styles.mealChip,
                                  { backgroundColor: colors[visual.bg] },
                                ]}
                              >
                                <Text style={styles.mealChipEmoji}>
                                  {visual.emoji}
                                </Text>
                                <Text
                                  style={[
                                    styles.mealChipText,
                                    {
                                      color:
                                        chipTextColors[section.key] ||
                                        colors.text,
                                    },
                                  ]}
                                >
                                  {meal.pending ? 0 : meal.calories} kcal
                                </Text>
                              </View>
                            </View>

                            {!meal.pending && (
                              <Text
                                style={[
                                  styles.mealMeta,
                                  { color: colors.textMuted },
                                ]}
                              >
                                {section.label} · {meal.time}
                              </Text>
                            )}
                          </View>

                          {/* Right actions */}
                          {meal.pending ? (
                            <View
                              style={[
                                styles.plusBtn,
                                { backgroundColor: colors.tintOrange },
                              ]}
                            >
                              <Ionicons
                                name="add"
                                size={ms(20)}
                                color={colors.primary}
                              />
                            </View>
                          ) : (
                            <View style={styles.mealRightCol}>
                              <Ionicons
                                name={
                                  isExpanded ? "chevron-up" : "chevron-down"
                                }
                                size={ms(14)}
                                color={colors.textMuted}
                              />
                              <View style={styles.mealActions}>
                                <TouchableOpacity
                                  onPress={() =>
                                    setDeleteModal({
                                      visible: true,
                                      id: meal.id,
                                      name: meal.name,
                                    })
                                  }
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}
                                >
                                  <Image
                                    source={deleteImg}
                                    style={styles.actionIcon}
                                    resizeMode="contain"
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </TouchableOpacity>

                        {isExpanded &&
                          (meal.macros || meal.protein != null) && (
                            <View style={styles.expandedWrapper}>
                              <Text
                                style={[
                                  styles.portionEatenLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {t("dashboard.portionEaten")}:{" "}
                                <Text
                                  style={{
                                    fontWeight: FONTS.bold,
                                    color: colors.text,
                                  }}
                                >
                                  {meal.gramsEaten ?? 400} g
                                </Text>
                              </Text>

                              <View
                                style={[
                                  styles.expandedCard,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                  },
                                ]}
                              >
                                <View style={styles.expandedHeader}>
                                  <Text
                                    style={[
                                      styles.expandedCalValue,
                                      { color: colors.text },
                                    ]}
                                  >
                                    {meal.calories} kcal
                                  </Text>

                                  {meal.gramsEaten != null && (
                                    <TouchableOpacity
                                      style={styles.editGramsBtn}
                                      onPress={() =>
                                        handleEditLoggedGrams(meal)
                                      }
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons
                                        name="create-outline"
                                        size={ms(15)}
                                        color={colors.textSecondary}
                                        style={{ marginRight: 4 }}
                                      />
                                      <Text
                                        style={[
                                          styles.editGramsBtnText,
                                          { color: colors.textSecondary },
                                        ]}
                                      >
                                        {t("dashboard.editGrams")}
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>

                                <MacroBar
                                  protein={meal.protein ?? 0}
                                  carbs={meal.carbs ?? 0}
                                  fat={meal.fat ?? 0}
                                />

                                <View style={styles.expandedNutrientsGrid}>
                                  <NutrientRow
                                    label="Protein"
                                    value={meal.protein ?? 0}
                                    color="#EF4444"
                                    colors={colors}
                                  />
                                  <NutrientRow
                                    label="Carbs"
                                    value={meal.carbs ?? 0}
                                    color="#22C55E"
                                    colors={colors}
                                  />
                                  <NutrientRow
                                    label="Fat"
                                    value={meal.fat ?? 0}
                                    color="#F59E0B"
                                    colors={colors}
                                  />
                                </View>
                              </View>
                            </View>
                          )}
                      </View>
                    );
                  })}
                </React.Fragment>
              );
            })
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.motivationCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.8}
        >
          <Image
            source={singleLeafImg}
            style={styles.motivationLeaf}
            resizeMode="contain"
          />
          <Text style={[styles.motivationText, { color: colors.text }]}>
            {t("dashboard.stayConsistent")}
          </Text>
          <Image
            source={chevronRightImg}
            style={styles.motivationChevron}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Delete confirmation */}
      <CommonAlertModal
        visible={deleteModal.visible}
        title={t("dashboard.removeMeal")}
        message={`${t("dashboard.removeFromToday")} "${deleteModal.name}"`}
        variant="warning"
        primaryText={t("dashboard.removeMeal")}
        onPrimary={() => {
          removeMeal(deleteModal.id);
          setDeleteModal({ visible: false, id: "", name: "" });
        }}
        secondaryText="Cancel"
        onSecondary={() => setDeleteModal({ visible: false, id: "", name: "" })}
      />

      {/* Profile load error */}
      {errorAlert.visible && (
        <CommonAlertModal
          visible={errorAlert.visible}
          title={t("dashboard.profileLoadFailed")}
          message={errorAlert.message}
          variant="warning"
          primaryText={t("common.ok")}
          onPrimary={() => setErrorAlert({ visible: false, message: "" })}
        />
      )}

      {/* Import limit paywall */}
      <PaywallModal
        visible={paywallVisible}
        feature="recipe_import"
        onClose={() => setPaywallVisible(false)}
        onUpgrade={() => {
          setPaywallVisible(false);
          navigation.navigate("Subscription" as any);
        }}
      />
    </SafeAreaViewCustom>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerPlant: {
    position: "absolute",
    right: -ms(30),
    top: vs(100),
    width: hs(240),
    height: hs(240),
    zIndex: 0,
  },
  greeting: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.regular,
    marginBottom: ms(2),
  },
  name: {
    fontSize: ms(30),
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    marginBottom: ms(12),
  },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  dateText: { fontSize: FONT_SIZES.small, fontWeight: FONTS.regular },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    paddingHorizontal: ms(10),
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  streakFire: { width: ms(14), height: ms(14) },
  streakText: { fontSize: ms(12), fontWeight: FONTS.semibold },

  // Import card
  importCard: {
    marginHorizontal: SPACING.lg,
    marginTop: ms(12),
    marginBottom: ms(18),
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(11),
    gap: ms(10),
  },
  importIconBox: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  importInput: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    fontWeight: FONTS.regular,
    paddingVertical: SPACING.xs,
  },
  importGoBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: { width: ms(18), height: ms(18) },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.bold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: SPACING.md,
  },

  // Hero card
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingHorizontal: SPACING.xs,
    paddingVertical: ms(20),
    overflow: "hidden",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Each side takes an equal share of the space left around the centred ring,
  // so the columns stay symmetric and never collide with it on narrow screens.
  heroSideRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  heroSideTextCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: ms(10),
  },
  heroStar: { width: ms(20), height: ms(20) },
  heroUtensilFolk: { width: ms(42), height: HERO_UTENSIL_HEIGHT },
  heroUtensil: { width: ms(48), height: HERO_UTENSIL_HEIGHT },
  heroSideLabel: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.regular },
  heroSideValue: { fontSize: ms(16), fontWeight: FONTS.bold, marginTop: 1 },
  heroSideUnit: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.regular },

  // Macro grid
  macroGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: ms(18),
    paddingTop: SPACING.md,
  },
  macroCol: {
    flex: 1,
    alignItems: "center",
  },
  macroColLabel: {
    fontSize: ms(12),
    fontWeight: FONTS.regular,
    marginBottom: SPACING.xs,
  },
  macroColValue: { fontSize: FONT_SIZES.body, fontWeight: FONTS.bold },

  // Meals list — one card per section
  mealsCard: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: ms(12),
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(14),
    paddingHorizontal: SPACING.md,
    gap: ms(12),
  },
  mealIconBox: {
    width: ms(48),
    height: ms(48),
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  mealIcon: { width: ms(28), height: ms(28) },
  mealInfo: { flex: 1 },
  mealRemaining: {
    fontSize: FONT_SIZES.caption,
    fontWeight: FONTS.medium,
    marginBottom: ms(2),
  },
  mealName: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.semibold,
    marginBottom: SPACING.xs,
  },
  mealChipRow: { flexDirection: "row" },
  mealChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    paddingHorizontal: SPACING.sm,
    paddingVertical: ms(3),
    borderRadius: RADIUS.full,
  },
  mealChipEmoji: { fontSize: FONT_SIZES.caption },
  mealChipText: { fontSize: FONT_SIZES.caption, fontWeight: FONTS.medium },
  mealMeta: {
    fontSize: FONT_SIZES.caption,
    fontWeight: FONTS.regular,
    marginTop: SPACING.xs,
  },
  mealRightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingVertical: SPACING.xs,
  },
  mealActions: { flexDirection: "row", alignItems: "center", gap: ms(12) },
  actionIcon: { width: ms(18), height: ms(18) },
  expandedWrapper: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  portionEatenLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: FONTS.medium,
  },
  expandedCard: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(12),
  },
  expandedCalValue: {
    fontSize: ms(22),
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
  },
  editGramsBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  editGramsBtnText: {
    fontSize: FONT_SIZES.small,
    fontWeight: FONTS.semibold,
  },
  expandedNutrientsGrid: {
    gap: SPACING.sm,
  },
  plusBtn: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: ms(76) },

  // Motivation footer
  motivationCard: {
    marginHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(14),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  motivationLeaf: { width: ms(22), height: ms(22) },
  motivationText: {
    flex: 1,
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.medium,
  },
  motivationChevron: { width: ms(16), height: ms(16), opacity: 0.5 },

  // Skeleton
  skeletonRingContainer: {
    width: "100%",
    height: vs(180),
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonRing: {
    width: ms(160),
    height: ms(160),
    borderRadius: ms(80),
    borderWidth: ms(12),
    borderColor: "#E1E1E1",
    borderStyle: "dashed",
  },
  emptyStateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: ms(14),
    marginTop: ms(12),
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    marginBottom: ms(2),
  },
  emptyStateSub: { fontSize: FONT_SIZES.small },
  mealSkeletonRow: { height: ms(52), borderRadius: RADIUS.md },
});
