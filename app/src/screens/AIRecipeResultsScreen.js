import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import { moderateScale as ms } from "../utils/responsive";
import {
  FONTS,
  FONT_SIZES,
  RADIUS,
  SHADOWS,
  SPACING,
} from "../constants/theme";
import { aiRecipeService } from "../services/aiRecipe.service";
import {
  generateStart,
  generateSuccess,
  generateFail,
  resetWizard,
} from "../store/slices/aiRecipeSlice";

const SCREEN_BG = "#FCF9F3";
const CTA_BG = "#7CB342";
const HEADING = "#1F2A20";
const SUB_TEXT = "#8B7B70";
const CARD_BG = "#FFFFFF";
const PILL_BG = "#F2EFE8";
const SHOPPING_BG = "#FFE066";
const BUDGET_OVER = "#EF4444";
const BUDGET_OK = "#7CB342";
const CHECK_GREEN = "#7CB342";
const CHECK_IDLE = "#D8D5CE";

// Day tag colors (mirrors the reference screenshot's colored side rail).
const DAY_META = {
  mon: { label: "Mon", color: "#7CB342" },
  tue: { label: "Tue", color: "#4CAF50" },
  wed: { label: "Wed", color: "#26A69A" },
  thu: { label: "Thu", color: "#42A5F5" },
  fri: { label: "Fri", color: "#5C6BC0" },
  sat: { label: "Sat", color: "#AB47BC" },
  sun: { label: "Sun", color: "#EC407A" },
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function AIRecipeResultsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const session = useSelector((s) => s.auth.session);
  const redux = useSelector((s) => s.aiRecipe);
  const { loading, error, recipes, totalPrice, shoppingList } = redux;

  const budget = route?.params?.budget ?? redux.budget;
  const vibes = route?.params?.vibes ?? redux.vibes;
  const dietary = route?.params?.dietary ?? redux.dietary;
  const equipment = route?.params?.equipment ?? redux.equipment;

  const runGenerate = useCallback(
    async ({ force = false } = {}) => {
      dispatch(generateStart());
      try {
        const plan = await aiRecipeService.generate(session, {
          budget,
          vibes,
          dietary,
          equipment,
          force,
        });
        console.log(
          plan.cached
            ? `[ai-recipes] 🗄  SOURCE=DB_CACHE — received ${plan.recipes.length} recipes from server cache.`
            : `[ai-recipes] 🤖 SOURCE=CLAUDE_AI — received ${plan.recipes.length} fresh recipes from Claude.`,
        );
        dispatch(
          generateSuccess({
            recipes: plan.recipes,
            cached: plan.cached,
            totalPrice: plan.totalPrice,
            shoppingList: plan.shoppingList,
          }),
        );
        plan.recipes.forEach((r) => {
          if (r.imageUrl) ExpoImage.prefetch(r.imageUrl).catch(() => {});
        });
      } catch (err) {
        dispatch(generateFail(err?.message || "Failed to generate plan"));
      }
    },
    [budget, vibes, dietary, equipment, session, dispatch],
  );

  useEffect(() => {
    runGenerate({ force: false });
    // Run once on mount for these frozen inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedRecipes = useMemo(() => {
    const byDay = new Map();
    recipes.forEach((r) => {
      const d = (r.day || "").toLowerCase();
      if (!byDay.has(d)) byDay.set(d, r);
    });
    const inOrder = DAY_ORDER.map((d) => byDay.get(d)).filter(Boolean);
    recipes.forEach((r) => {
      const d = (r.day || "").toLowerCase();
      if (!DAY_ORDER.includes(d) && !inOrder.includes(r)) inOrder.push(r);
    });
    return inOrder;
  }, [recipes]);

  function openRecipe(r) {
    const recipe = {
      title: r.name,
      emoji: r.emoji,
      steps: Array.isArray(r.steps) ? r.steps : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      nutrition: r.nutrition ?? {
        total: {
          calories: r.calories ?? 0,
          protein: r.macros?.protein ?? 0,
          carbs: r.macros?.carbs ?? 0,
          fat: r.macros?.fat ?? 0,
        },
      },
      inferredIngredients: [],
      _analysis: { confidence: 0.9, confidenceLevel: "high", warnings: [] },
      sourceUrl: null,
    };
    navigation.navigate("RecipeSummary", { recipe, dbId: r.dbId ?? r.id });
  }

  function onClose() {
    dispatch(resetWizard());
    navigation.popToTop();
  }

  function onRegenerate() {
    if (loading) return;
    runGenerate({ force: true });
  }

  function onOpenShoppingList() {
    navigation.navigate("GroceryList");
  }

  const overBudget = totalPrice > budget;
  const hasShoppingList = shoppingList && shoppingList.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.iconBtn, SHADOWS.sm]}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={ms(20)} color={HEADING} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Plan</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={onRegenerate} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {/* Top summary bar: budget + shopping list CTA */}
          <View style={styles.summaryRow}>
            <View style={styles.budgetPill}>
              <Text style={styles.budgetLabel}>EST COST</Text>
              <Text style={styles.budgetValue}>
                <Text
                  style={{
                    color: overBudget ? BUDGET_OVER : BUDGET_OK,
                  }}
                >
                  ${totalPrice}
                </Text>
                <Text style={styles.budgetOf}> / ${budget}</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.shoppingPill,
                !hasShoppingList && { opacity: 0.5 },
              ]}
              onPress={onOpenShoppingList}
              disabled={!hasShoppingList}
              activeOpacity={0.85}
            >
              <Ionicons name="list-outline" size={ms(16)} color={HEADING} />
              <View style={{ alignItems: "flex-start" }}>
                <Text style={styles.shoppingLabel}>TAP TO VIEW</Text>
                <Text style={styles.shoppingTitle}>Shopping list</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Recipe list */}
          {orderedRecipes.map((r) => (
            <DayRecipeRow key={r.id} recipe={r} onPress={() => openRecipe(r)} />
          ))}
        </ScrollView>
      )}

      {!loading && !error && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.regenCta}
            activeOpacity={0.85}
            onPress={onRegenerate}
          >
            <Ionicons name="refresh" size={ms(18)} color="#FFFFFF" />
            <Text style={styles.regenText}>regenerate plan</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Day-tagged recipe row ────────────────────────────────────────────────────
function DayRecipeRow({ recipe, onPress }) {
  const dayKey = (recipe.day || "").toLowerCase();
  const meta = DAY_META[dayKey];
  const rail = meta?.color ?? "#B0BEC5";
  const label = meta?.label ?? "—";
  const stepCount = Array.isArray(recipe.steps) ? recipe.steps.length : 0;

  return (
    <TouchableOpacity
      style={[styles.dayRow, SHADOWS.sm]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.dayRail, { backgroundColor: rail }]}>
        <Text style={styles.dayLabel}>{label}</Text>
      </View>

      <View style={styles.dayBody}>
        {recipe.imageUrl ? (
          <ExpoImage
            source={{ uri: recipe.imageUrl }}
            style={styles.dayThumb}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.dayThumb, styles.emojiWrap]}>
            <Text style={styles.emoji}>{recipe.emoji ?? "🍽️"}</Text>
          </View>
        )}

        <View style={styles.dayInfo}>
          <View style={styles.dayTitleRow}>
            <Text style={styles.dayTitle} numberOfLines={2}>
              {recipe.name}
            </Text>
            {recipe.price != null && (
              <Text style={styles.dayPrice}>${recipe.price}</Text>
            )}
          </View>
          <View style={styles.dayTagRow}>
            {stepCount > 0 && (
              <View style={styles.tagPill}>
                <Ionicons name="time-outline" size={ms(11)} color={SUB_TEXT} />
                <Text style={styles.tagText}>
                  {stepCount} step{stepCount === 1 ? "" : "s"}
                </Text>
              </View>
            )}
            {(recipe.calories ?? 0) > 0 && (
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{recipe.calories} kcal</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Loading state: checklist hero ────────────────────────────────────────────
const LOADING_STEPS = [
  "analysing budget + preferences",
  "building your meal plan",
  "generating shopping list",
];

function LoadingState() {
  // Reveal each item every ~2.5s. When response lands, results screen unmounts
  // this — so cache hits will typically stop at the first item.
  const [activeIdx, setActiveIdx] = useState(0);
  const bagBob = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t1 = setTimeout(() => setActiveIdx(1), 2500);
    const t2 = setTimeout(() => setActiveIdx(2), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bagBob, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bagBob, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bagBob]);

  const translateY = bagBob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -ms(6)],
  });

  return (
    <View style={styles.loadingWrap}>
      <View style={styles.loadingHero}>
        <Text style={[styles.confetti, styles.confettiTL]}>🥕</Text>
        <Text style={[styles.confetti, styles.confettiTR]}>🥦</Text>
        <Text style={[styles.confetti, styles.confettiBL]}>🍅</Text>
        <Text style={[styles.confetti, styles.confettiBR]}>🌽</Text>
        <Animated.Text
          style={[styles.heroBag, { transform: [{ translateY }] }]}
        >
          🛍️
        </Animated.Text>
      </View>

      <Text style={styles.loadingTitle}>leave it with us…</Text>

      <View style={styles.checklist}>
        {LOADING_STEPS.map((label, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <View key={label} style={styles.checkRow}>
              <View
                style={[
                  styles.checkCircle,
                  done && { backgroundColor: CHECK_GREEN, borderColor: CHECK_GREEN },
                  active && { borderColor: CHECK_GREEN },
                  !done && !active && { borderColor: CHECK_IDLE },
                ]}
              >
                {done && (
                  <Ionicons name="checkmark" size={ms(12)} color="#FFFFFF" />
                )}
                {active && <View style={styles.activeDot} />}
              </View>
              <Text
                style={[
                  styles.checkLabel,
                  !done && !active && { color: SUB_TEXT },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.errorWrap}>
      <Ionicons name="alert-circle-outline" size={ms(48)} color="#EF4444" />
      <Text style={styles.errorTitle}>Couldn't generate plan</Text>
      <Text style={styles.errorMsg}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Ionicons name="refresh" size={ms(16)} color="#FFFFFF" />
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(12),
  },
  iconBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: ms(16),
    fontWeight: FONTS.semibold,
    color: HEADING,
  },

  scroll: { flex: 1 },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: ms(110),
    gap: ms(12),
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: ms(10),
    marginTop: ms(4),
    marginBottom: ms(8),
  },
  budgetPill: {
    flex: 1,
    padding: ms(12),
    borderRadius: RADIUS.lg,
    backgroundColor: CARD_BG,
    ...SHADOWS.sm,
  },
  budgetLabel: {
    fontSize: ms(10),
    fontWeight: FONTS.bold,
    color: SUB_TEXT,
    letterSpacing: 1.2,
  },
  budgetValue: {
    marginTop: ms(4),
    fontSize: ms(22),
    fontWeight: FONTS.bold,
    color: HEADING,
    letterSpacing: -0.4,
  },
  budgetOf: {
    fontSize: ms(14),
    fontWeight: FONTS.medium,
    color: SUB_TEXT,
  },

  shoppingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
    paddingHorizontal: ms(14),
    borderRadius: RADIUS.lg,
    backgroundColor: SHOPPING_BG,
    minWidth: ms(140),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  shoppingLabel: {
    fontSize: ms(9),
    fontWeight: FONTS.bold,
    color: HEADING,
    letterSpacing: 1,
  },
  shoppingTitle: {
    fontSize: ms(14),
    fontWeight: FONTS.bold,
    color: HEADING,
  },

  // Day row
  dayRow: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    minHeight: ms(96),
  },
  dayRail: {
    width: ms(46),
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(6),
  },
  dayLabel: {
    fontSize: ms(13),
    fontWeight: FONTS.bold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  dayBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: ms(10),
    gap: ms(12),
  },
  dayThumb: {
    width: ms(70),
    height: ms(70),
    borderRadius: RADIUS.md,
    backgroundColor: "#F1E3D3",
  },
  emojiWrap: { alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: ms(32) },
  dayInfo: { flex: 1, gap: ms(6) },
  dayTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: ms(8),
  },
  dayTitle: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.bold,
    color: HEADING,
    lineHeight: ms(20),
  },
  dayPrice: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.bold,
    color: HEADING,
  },
  dayTagRow: { flexDirection: "row", flexWrap: "wrap", gap: ms(6) },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    backgroundColor: PILL_BG,
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontSize: ms(11),
    color: HEADING,
    fontWeight: FONTS.semibold,
  },

  // Loading hero + checklist
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  loadingHero: {
    width: ms(180),
    height: ms(180),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ms(20),
  },
  heroBag: { fontSize: ms(120) },
  confetti: { position: "absolute", fontSize: ms(26) },
  confettiTL: { top: ms(8), left: ms(4) },
  confettiTR: { top: ms(12), right: ms(6) },
  confettiBL: { bottom: ms(14), left: ms(10) },
  confettiBR: { bottom: ms(4), right: ms(2) },
  loadingTitle: {
    fontSize: ms(24),
    fontWeight: FONTS.bold,
    color: HEADING,
    letterSpacing: -0.4,
    marginBottom: ms(24),
  },
  checklist: {
    gap: ms(12),
    alignSelf: "stretch",
    paddingHorizontal: ms(20),
    backgroundColor: CARD_BG,
    paddingVertical: ms(20),
    borderRadius: RADIUS.lg,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: ms(12) },
  checkCircle: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.semibold,
    color: HEADING,
  },
  activeDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: CHECK_GREEN,
  },

  // Error
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    gap: ms(10),
  },
  errorTitle: {
    fontSize: ms(18),
    fontWeight: FONTS.bold,
    color: HEADING,
    marginTop: ms(4),
  },
  errorMsg: {
    fontSize: FONT_SIZES.small,
    color: SUB_TEXT,
    textAlign: "center",
    lineHeight: ms(18),
  },
  retryBtn: {
    marginTop: ms(20),
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    backgroundColor: CTA_BG,
    paddingHorizontal: ms(24),
    paddingVertical: ms(14),
    borderRadius: RADIUS.full,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: FONTS.bold,
    fontSize: FONT_SIZES.body,
  },

  // Bottom regenerate bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: ms(40),
    paddingHorizontal: SPACING.lg,
    paddingTop: ms(10),
    paddingBottom: ms(18),
    backgroundColor: SCREEN_BG,
  },
  regenCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(10),
    paddingVertical: ms(16),
    borderRadius: RADIUS.full,
    backgroundColor: CTA_BG,
    shadowColor: CTA_BG,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  regenText: {
    color: "#FFFFFF",
    fontWeight: FONTS.bold,
    fontSize: FONT_SIZES.body,
    letterSpacing: 0.2,
  },
});
