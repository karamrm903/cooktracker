import React, { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { SPACING, RADIUS, FONTS } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ExpandedNutrition } from "../components/NutritionExpansion";
import { exploreService } from "../services/exploreService";
import { saveRecipe, fetchAllRecipes } from "../services/recipeService";

const CATEGORIES = [
  { id: "all", labelKey: "explore.categories.all" },
  { id: "breakfast", labelKey: "explore.categories.breakfast" },
  { id: "lunch", labelKey: "explore.categories.lunch" },
  { id: "dinner", labelKey: "explore.categories.dinner" },
  { id: "snack", labelKey: "explore.categories.snack" },
];

function dbToItem(r) {
  const protein = r.protein ?? 0;
  const carbs = r.carbs ?? 0;
  const fat = r.fat ?? 0;
  let ingredients = [];
  try {
    ingredients = JSON.parse(r.ingredients ?? "[]");
  } catch {}
  return {
    id: String(r.id),
    name: r.title,
    emoji: r.emoji ?? "🍽️",
    calories: r.calories ?? 0,
    time: null,
    difficulty: null,
    macros: { protein, carbs, fat },
    steps: r.steps ?? [],
    ingredients,
    nutrition: r.nutrition ?? {
      total: { calories: r.calories ?? 0, protein, carbs, fat },
    },
    estimatedGrams: 600,
    _dbId: r.id,
  };
}

// ── Recipe row (accordion) ────────────────────────────────────────────────────
function RecipeRow({
  item,
  isLast,
  isExpanded,
  onToggle,
  onStartCooking,
  colors,
  t,
}) {
  return (
    <>
      <TouchableOpacity
        style={styles.recipeRow}
        activeOpacity={0.65}
        onPress={onToggle}
      >
        <View style={[styles.emojiBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={styles.emojiText}>{item.emoji}</Text>
        </View>
        <View style={styles.recipeInfo}>
          <Text
            style={[styles.recipeName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {(item.time || item.difficulty) && (
            <Text style={[styles.recipeMeta, { color: colors.textMuted }]}>
              {[item.time, item.difficulty].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>
        <View style={styles.recipeRight}>
          <Text
            style={[styles.recipeCalories, { color: colors.textSecondary }]}
          >
            {item.calories} kcal
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={12}
            color={colors.textMuted}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && item.macros && (
        <ExpandedNutrition
          item={item}
          colors={colors}
          buttonLabel={t("recipeSummary.letsCook")}
          onPress={() => onStartCooking(item)}
        />
      )}

      {!isLast && !isExpanded && (
        <View style={[styles.hairline, { backgroundColor: colors.border }]} />
      )}
    </>
  );
}

// ── Results list card ─────────────────────────────────────────────────────────
function ResultsCard({
  recipes,
  expandedId,
  onToggle,
  onStartCooking,
  colors,
  t,
}) {
  return (
    <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
      {recipes.map((item, i) => (
        <RecipeRow
          key={item.id}
          item={item}
          isLast={i === recipes.length - 1}
          isExpanded={expandedId === item.id}
          onToggle={() => onToggle(item.id)}
          onStartCooking={onStartCooking}
          colors={colors}
          t={t}
        />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ExploreScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const session = useSelector((state) => state.auth.session);

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [dbRecipes, setDbRecipes] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!session?.access_token) return;
      setDbLoading(true);
      fetchAllRecipes(session)
        .then((rows) => setDbRecipes((rows ?? []).map(dbToItem)))
        .catch(() => {})
        .finally(() => setDbLoading(false));
    }, [session])
  );

  function handleToggle(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleCategoryChange(id) {
    setSelectedCategory(id);
    setExpandedId(null);
  }

  const runSearch = useCallback(
    async (q) => {
      if (!q.trim()) {
        setAiResults([]);
        setSearchError(null);
        setHasSearched(false);
        return;
      }
      setLoading(true);
      setSearchError(null);
      setExpandedId(null);
      setHasSearched(true);
      try {
        const results = await exploreService.searchFood(
          session,
          q.trim(),
          language
        );
        setAiResults(results);
      } catch (err) {
        setSearchError(err.message);
        setAiResults([]);
      } finally {
        setLoading(false);
      }
    },
    [session, language]
  );

  function handleQueryChange(text) {
    setQuery(text);
    if (!text.trim()) {
      setAiResults([]);
      setSearchError(null);
      setLoading(false);
      setHasSearched(false);
    } else {
      setHasSearched(false);
    }
  }

  function handleSubmitSearch() {
    runSearch(query);
  }

  async function handleStartCooking(item) {
    const recipe = {
      title: item.name,
      emoji: item.emoji,
      steps: item.steps,
      ingredients: item.ingredients,
      nutrition: item.nutrition,
      estimatedGrams: item.estimatedGrams,
    };

    let dbId = item._dbId ?? null;
    if (!dbId) {
      try {
        const saved = await saveRecipe(session, recipe, null);
        dbId = saved.id;
      } catch (err) {
        console.warn("[ExploreScreen] saveRecipe failed:", err?.message ?? err);
      }
    }

    navigation.navigate("RecipeSummary", { recipe, dbId });
  }

  const isSearching = query.trim().length > 0;

  const filteredResults =
    selectedCategory === "all"
      ? aiResults
      : aiResults.filter((r) => r.category === selectedCategory);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("explore.title")}
          </Text>
        </View>

        {/* ── Search bar ───────────────────────────────────────────────── */}
        <View
          style={[styles.searchBar, { backgroundColor: colors.surfaceAlt }]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t("explore.searchPlaceholder")}
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
          />
          {loading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : isSearching ? (
            <TouchableOpacity
              onPress={() => handleQueryChange("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ) : (
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          )}
        </View>

        {/* ── Category pills — only when searching ─────────────────────── */}
        {isSearching && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isActive
                        ? colors.text
                        : colors.surfaceAlt,
                    },
                  ]}
                  onPress={() => handleCategoryChange(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: isActive
                          ? colors.background
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {t(cat.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Content ─────────────────────────────────────────────────── */}
        {!isSearching ? (
          <>
            {/* Plan My Meals card */}
            <TouchableOpacity
              style={[styles.planCard, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate("Plan")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.planIconWrap,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.text}
                />
              </View>
              <View style={styles.planText}>
                <Text style={[styles.planTitle, { color: colors.text }]}>
                  {t("plan.title")}
                </Text>
                <Text style={[styles.planSub, { color: colors.textMuted }]}>
                  {t("plan.emptySubtitle").split(",")[0]}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Your recipe library */}
            {dbLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.text} />
              </View>
            ) : dbRecipes.length > 0 ? (
              <>
                <Text
                  style={[styles.sectionLabel, { color: colors.textMuted }]}
                >
                  {"Your Recipes"} · {dbRecipes.length}
                </Text>
                <ResultsCard
                  recipes={dbRecipes}
                  expandedId={expandedId}
                  onToggle={handleToggle}
                  onStartCooking={handleStartCooking}
                  colors={colors}
                  t={t}
                />
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✨</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t("explore.searchPlaceholder")}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {t("explore.emptyHint")}
                </Text>
              </View>
            )}
          </>
        ) : searchError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>⚠️</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("analyzing.errorTitle")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {t("common.retry")}
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              {t("common.loading")}
            </Text>
          </View>
        ) : filteredResults.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {filteredResults.length}{" "}
              {filteredResults.length === 1
                ? t("explore.result")
                : t("explore.results")}
            </Text>
            <ResultsCard
              recipes={filteredResults}
              expandedId={expandedId}
              onToggle={handleToggle}
              onStartCooking={handleStartCooking}
              colors={colors}
              t={t}
            />
          </>
        ) : !hasSearched ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>⌨️</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("explore.pressEnter")}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("explore.noResults")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {t("explore.noResultsSub")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  header: {
    paddingHorizontal: 24,
    paddingTop: SPACING.lg,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.sm,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: FONTS.regular,
    padding: 0,
  },

  pillsRow: {
    paddingHorizontal: 24,
    gap: SPACING.sm,
    marginBottom: 28,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  pillText: {
    fontSize: 13,
    fontWeight: FONTS.medium,
  },

  planCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    gap: 12,
    marginBottom: 28,
  },
  planIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  planText: { flex: 1 },
  planTitle: { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 2 },
  planSub: { fontSize: 12, fontWeight: FONTS.regular },

  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 24,
    marginBottom: 12,
  },

  listCard: {
    marginHorizontal: 24,
    borderRadius: RADIUS.lg,
  },

  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 22 },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 3 },
  recipeMeta: { fontSize: 12, fontWeight: FONTS.regular },
  recipeRight: { alignItems: "flex-end", gap: 3 },
  recipeCalories: { fontSize: 13, fontWeight: FONTS.regular },
  chevron: { marginTop: 1 },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 76 },

  emptyState: {
    alignItems: "center",
    paddingTop: SPACING.xxl * 2,
    paddingHorizontal: 24,
  },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: {
    fontSize: 17,
    fontWeight: FONTS.semibold,
    marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: FONTS.regular,
    textAlign: "center",
    lineHeight: 20,
  },

  loadingState: {
    alignItems: "center",
    paddingTop: SPACING.xxl * 2,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: FONTS.regular,
  },
});
