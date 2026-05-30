import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackActions, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import { ExpandedNutrition } from "../components/NutritionExpansion";
import SaveModal from "../components/SaveModal";
import { FONTS, RADIUS, SPACING } from "../constants/theme";
import { useMealLogs } from "../context/MealLogsContext";
import { useSavedMeals } from "../context/SavedMealsContext";
import { useTheme } from "../context/ThemeContext";
import { profileService } from "../services/profile.service";
import {
  subscriptionService,
  isUsageLimitError,
} from "../services/subscription.service";
import { useSubscription } from "../hooks/useSubscription";
import { RootState } from "../store";
import { Meal, UserProfile } from "../types";
import PaywallModal, { PaywallFeature } from "../components/PaywallModal";

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
  const { isSaved, getSavedCategory, saveMeal, unsaveMeal } = useSavedMeals();
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
    }, [refreshMeals, session]),
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
  const [modalMeal, setModalMeal] = useState<Meal | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isLoadingProfile || showMealSkeleton) {
      Animated.loop(
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
      ).start();
    }
  }, [isLoadingProfile, showMealSkeleton]);

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

  function showToast(text) {
    setToastText(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(1600),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => setToastText(null));
  }

  function handleSave(category: string) {
    if (!modalMeal) return;

    const mealType = category.toLowerCase() as Meal["mealType"];
    const mealEmoji =
      { breakfast: "🍳", lunch: "🥗", dinner: "🍽️", snack: "🍪" }[mealType] ??
      modalMeal.emoji;

    // Move meal to selected section
    updateMeal(modalMeal.id, { mealType, meal: category, emoji: mealEmoji });

    // Also bookmark the recipe if it has a source recipe
    if (modalMeal.recipeId) {
      saveMeal(modalMeal.recipeId, category);
    }

    setModalMeal(null);
    showToast(t("dashboard.movedTo", { category }));
  }

  function handleRemove() {
    if (!modalMeal) return;

    if (modalMeal.recipeId) {
      unsaveMeal(modalMeal.recipeId);
    }

    setModalMeal(null);
    showToast(t("dashboard.removedFromSaved"));
  }

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
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            {t("dashboard.welcomeBack")},
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>{firstName}</Text>
          <View style={styles.headerMeta}>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {today}
            </Text>
            <View
              style={[
                styles.streakChip,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Ionicons name="flame" size={13} color="#FF6B35" />
                <Text
                  style={[styles.streakText, { color: colors.textSecondary }]}
                >
                  {`${Math.max(1, streak ?? 0)} day${Math.max(1, streak ?? 0) === 1 ? "" : "s"}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Import recipe card ────────────────────────────────────────── */}
        <View
          style={[
            styles.importCard,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <View
            style={[
              styles.importIconBox,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <Ionicons
              name="link-outline"
              size={20}
              color={colors.textSecondary}
            />
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
          {importUrl.length > 0 && (
            <TouchableOpacity
              style={[
                styles.importGoBtn,
                {
                  backgroundColor: colors.text,
                  opacity: importChecking ? 0.5 : 1,
                },
              ]}
              onPress={handleImport}
              activeOpacity={0.7}
              disabled={importChecking}
            >
              <Ionicons
                name="arrow-forward"
                size={16}
                color={colors.background}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ── TODAY calories ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Today
          </Text>
          <View style={styles.caloriesTopRow}>
            <View />
            {!showMealSkeleton && !isLoadingProfile && (
              <Text
                style={[styles.caloriesLeftText, { color: colors.textMuted }]}
              >
                {caloriesLeft.toLocaleString()} left
              </Text>
            )}
          </View>

          <View style={{ alignItems: "center", marginVertical: 20 }}>
            {isLoadingProfile || showMealSkeleton ? (
              <View style={styles.skeletonRingContainer}>
                <Animated.View
                  style={[styles.skeletonRing, { opacity: skeletonAnim }]}
                />
              </View>
            ) : (
              <CalorieRing calories={totalCalories} goal={calorieGoal} />
            )}
          </View>

          {hasNoMealsLogged && !isLoadingProfile && !showMealSkeleton && (
            <TouchableOpacity
              style={[
                styles.emptyStateCard,
                { backgroundColor: colors.surfaceAlt },
              ]}
              onPress={() =>
                navigation.navigate("SearchFood", {
                  defaultMealType: "breakfast",
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="rocket-outline"
                size={28}
                color={colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  {t("dashboard.noMealsTitle")}
                </Text>
                <Text
                  style={[styles.emptyStateSub, { color: colors.textMuted }]}
                >
                  {t("dashboard.noMealsSubtitle", { goal: calorieGoal })}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
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
                { backgroundColor: colors.surface, padding: 16, gap: 12 },
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
            <View
              style={[styles.mealsCard, { backgroundColor: colors.surface }]}
            >
              {mealSections.map((section, sectionIndex) => (
                <View key={section.key}>
                  {sectionIndex > 0 && (
                    <View
                      style={[
                        styles.sectionSpacer,
                        { backgroundColor: colors.background },
                      ]}
                    />
                  )}

                  <View style={styles.mealGroupHeader}>
                    <Ionicons
                      name={section.icon}
                      size={16}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.greetingSubtitle,
                        { color: colors.textMuted },
                      ]}
                    >
                      {caloriesLeft} kcal remaining today
                    </Text>
                    <Text
                      style={[styles.mealGroupTitle, { color: colors.text }]}
                    >
                      {section.label}
                    </Text>
                  </View>

                  {section.meals.map((meal, index) => {
                    const isExpanded = expandedId === meal.id;

                    return (
                      <React.Fragment key={meal.id}>
                        {index > 0 && (
                          <View
                            style={[
                              styles.hairline,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        )}

                        <TouchableOpacity
                          style={styles.mealRow}
                          activeOpacity={meal.pending ? 0.7 : 0.65}
                          onPress={
                            meal.pending
                              ? () =>
                                  navigation.navigate("SearchFood", {
                                    defaultMealType: meal.mealType,
                                  })
                              : () => {
                                  handleToggle(meal.id);

                                  if (
                                    meal.source === "recipe" &&
                                    meal.gramsEaten != null
                                  ) {
                                    handleEditLoggedGrams(meal);
                                    setSelectedMeal(meal);
                                  }
                                }
                          }
                        >
                          <Ionicons
                            name={section.icon}
                            size={22}
                            color={colors.textSecondary}
                            style={styles.mealEmojiIcon}
                          />

                          <View style={styles.mealInfo}>
                            {meal.pending ? (
                              <Text
                                style={[
                                  styles.mealNameMuted,
                                  { color: colors.textMuted },
                                ]}
                              >
                                {t("dashboard.addMealSection", {
                                  label: section.label,
                                })}
                              </Text>
                            ) : (
                              <>
                                <Text
                                  style={[
                                    styles.mealName,
                                    { color: colors.text },
                                  ]}
                                >
                                  {meal.name}
                                </Text>
                                <Text
                                  style={[
                                    styles.mealMeta,
                                    { color: colors.textMuted },
                                  ]}
                                >
                                  {meal.meal} · {meal.time}
                                </Text>
                              </>
                            )}
                          </View>

                          {!meal.pending && (
                            <View style={styles.mealActions}>
                              <TouchableOpacity
                                onPress={() => setModalMeal(meal)}
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                                style={styles.bookmarkBtn}
                              >
                                <Ionicons
                                  name={
                                    isSaved(meal.id ?? meal.name)
                                      ? "bookmark"
                                      : "bookmark-outline"
                                  }
                                  size={17}
                                  color={
                                    isSaved(meal.id ?? meal.name)
                                      ? colors.text
                                      : colors.textMuted
                                  }
                                />
                              </TouchableOpacity>

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
                                style={styles.bookmarkBtn}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={17}
                                  color={colors.error}
                                />
                              </TouchableOpacity>
                            </View>
                          )}

                          {meal.pending ? (
                            <Ionicons
                              name="add-circle-outline"
                              size={22}
                              color={colors.textMuted}
                            />
                          ) : (
                            <View style={styles.mealRight}>
                              <Text
                                style={[
                                  styles.mealCalories,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {meal.calories} kcal
                              </Text>
                              <Ionicons
                                name={
                                  isExpanded ? "chevron-up" : "chevron-down"
                                }
                                size={12}
                                color={colors.textMuted}
                                style={styles.chevron}
                              />
                            </View>
                          )}
                        </TouchableOpacity>

                        {isExpanded &&
                          (meal.macros || meal.protein != null) && (
                            <>
                              {meal.gramsEaten != null && (
                                <View
                                  style={{
                                    paddingHorizontal: 16,
                                    paddingTop: 10,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: colors.textMuted,
                                      fontSize: 13,
                                    }}
                                  >
                                    {t("dashboard.portionEaten")}:{" "}
                                    {meal.gramsEaten} g
                                  </Text>

                                  <TouchableOpacity
                                    onPress={() => handleEditLoggedGrams(meal)}
                                  >
                                    <Text
                                      style={{
                                        color: colors.text,
                                        fontSize: 13,
                                        fontWeight: "600",
                                      }}
                                    >
                                      {t("dashboard.editGrams")}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}

                              <ExpandedNutrition
                                item={{
                                  ...meal,
                                  macros: meal.macros ?? {
                                    protein: meal.protein ?? 0,
                                    carbs: meal.carbs ?? 0,
                                    fat: meal.fat ?? 0,
                                  },
                                }}
                                colors={colors}
                              />
                            </>
                          )}
                      </React.Fragment>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {/* ── Save modal ──────────────────────────────────────────────── */}
      <SaveModal
        meal={modalMeal}
        visible={!!modalMeal}
        onClose={() => setModalMeal(null)}
        onSave={handleSave}
        onRemove={handleRemove}
        savedCategory={
          modalMeal
            ? getSavedCategory(modalMeal.recipeId ?? modalMeal.id)
            : null
        }
        colors={colors}
        title="Move to…"
      />

      {/* ── Toast ───────────────────────────────────────────────────── */}
      {toastText && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.text, opacity: toastAnim },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.toastText, { color: colors.background }]}>
            {toastText}
          </Text>
        </Animated.View>
      )}

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
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  greeting: { fontSize: 14, fontWeight: FONTS.regular, marginBottom: 2 },
  greetingSubtitle: { fontSize: 12, fontWeight: FONTS.regular, flex: 1 },
  name: {
    fontSize: 28,
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  dateText: { fontSize: 13, fontWeight: FONTS.regular },
  streakChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  streakText: { fontSize: 12, fontWeight: FONTS.medium },

  // Import card
  importCard: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 12,
  },
  // Macro progress bar
  macroTrack: {
    width: "80%",
    height: 5,
    backgroundColor: "#2A2A2A",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 6,
  },

  macroFill: {
    height: "100%",
    borderRadius: 999,
  },
  importIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  importInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: FONTS.regular,
    paddingVertical: 4,
  },
  importGoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  importCounter: {
    fontSize: 11,
    fontWeight: "400",
    textAlign: "center",
    marginTop: -30,
    marginBottom: 12,
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    marginBottom: 36,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 16,
  },

  // Calories hero
  caloriesTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  caloriesBig: {
    fontSize: 48,
    fontWeight: FONTS.bold,
    letterSpacing: -1,
    lineHeight: 52,
  },
  caloriesGoalText: { fontSize: 13, fontWeight: FONTS.regular, marginTop: 3 },
  caloriesLeftText: {
    fontSize: 13,
    fontWeight: FONTS.regular,
    paddingBottom: 4,
  },
  progressTrack: { height: 3, borderRadius: RADIUS.full, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: RADIUS.full },

  // Macro summary
  macrosRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
  },
  macroCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    maxWidth: "33%",
  },
  macroDividerV: { width: 1, marginVertical: 2 },
  macroValue: {
    fontSize: 20,
    fontWeight: FONTS.bold,
    letterSpacing: -0.3,
  },
  macroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: { fontSize: 11, fontWeight: FONTS.regular },
  macroLeft: { fontSize: 11, fontWeight: FONTS.regular, marginTop: 2 },

  // Meals list
  mealsCard: { borderRadius: RADIUS.lg, overflow: "hidden" },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    gap: 12,
  },
  mealEmojiIcon: { width: 32, textAlign: "center" },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 2 },
  mealNameMuted: { fontSize: 15, fontWeight: FONTS.medium },
  mealMeta: { fontSize: 12, fontWeight: FONTS.regular },
  mealRight: { alignItems: "flex-end", gap: 3 },
  mealCalories: { fontSize: 13, fontWeight: FONTS.regular },
  chevron: { marginTop: 1 },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  bookmarkBtn: { padding: 2 },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionSpacer: {
    height: 14,
  },

  mealGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 8,
  },

  mealGroupTitle: {
    fontSize: 13,
    fontWeight: FONTS.semibold,
  },

  // Toast
  toast: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  toastText: {
    fontSize: 14,
    fontWeight: FONTS.medium,
  },
  loadingRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 14,
    borderRightColor: "#FF7A18",
    borderTopColor: "#FF7A18",
    opacity: 0.3,
  },
  skeletonRingContainer: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: "#E1E1E1",
    borderStyle: "dashed",
  },
  emptyStateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: RADIUS.lg,
    gap: 14,
    marginTop: 8,
  },
  emptyStateEmoji: {
    fontSize: 24,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  emptyStateSub: {
    fontSize: 13,
  },
  mealSkeletonRow: {
    height: 52,
    borderRadius: RADIUS.md,
  },
});
