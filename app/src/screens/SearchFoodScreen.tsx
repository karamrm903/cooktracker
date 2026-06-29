import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  Keyboard,
  ScrollView,
  Image,
  ImageStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useTheme } from "../context/ThemeContext";
import { FONTS, FONT_SIZES, RADIUS, SHADOWS, SPACING } from "../constants/theme";
import { BRAND_COLOR, DEFAULT_BG, TEXT_DARK, TEXT_MUTED, INPUT_BORDER } from "../styles/colors";
import {
  moderateScale as ms,
  verticalScale as vs,
} from "../utils/responsive";

const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const ginghamImg = require("../../assets/webp/UserInfoBottom.webp");
import {
  searchFoodSuggestions,
  searchFood,
  FoodItem,
} from "../services/foodSearch.service";
import { fetchAllRecipes } from "../services/recipeService";
import { isUsageLimitError } from "../services/subscription.service";
import { useSubscription } from "../hooks/useSubscription";
import PaywallModal from "../components/PaywallModal";
import SafeAreaViewCustom from "@/components/atoms/SafeAreaViewCustom";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const TABS = ["All", "My Recipes"] as const;

function recipeToFoodItem(r: any): FoodItem {
  return {
    id: String(r.id),
    name: r.title,
    verified: false,
    calories: r.calories ?? 0,
    servingSize: "1 serving",
    servingSizeGrams: r.estimatedGrams ?? 400,
    macros: {
      protein: r.protein ?? 0,
      carbs: r.carbs ?? 0,
      fat: r.fat ?? 0,
    },
  };
}

function VerifiedBadge() {
  return (
    <Ionicons
      name="shield-checkmark"
      size={ms(15)}
      color="#22C55E"
      style={{ marginLeft: ms(4) }}
    />
  );
}

interface FoodRowProps {
  item: FoodItem;
  onPress: (item: FoodItem) => void;
  colors: any;
}

function FoodRow({ item, onPress, colors }: FoodRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.foodRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.foodRowInfo}>
        <View style={styles.foodNameRow}>
          <Text style={[styles.foodName, { color: colors.text }]}>
            {item.name}
          </Text>
          {item.verified && <VerifiedBadge />}
        </View>
        <Text style={[styles.foodMeta, { color: colors.textMuted }]}>
          {item.calories} cal, {item.servingSize}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.addBtn,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
        onPress={() => onPress(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="add" size={ms(20)} color={colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SearchFoodScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { session } = useSelector((s: any) => s.auth);
  const { isSubscribed } = useSubscription();
  const defaultMealType: MealType =
    route.params?.defaultMealType ?? "breakfast";

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // ── All tab state ──────────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSugg, setIsLoadingSugg] = useState(false);
  const [bestMatch, setBestMatch] = useState<FoodItem | null>(null);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mode, setMode] = useState<"idle" | "suggesting" | "results">("idle");

  // ── My Recipes tab state ───────────────────────────────────────────────────
  const [savedRecipes, setSavedRecipes] = useState<FoodItem[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [recipesLoaded, setRecipesLoaded] = useState(false);
  const [recipesError, setRecipesError] = useState("");

  const suggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // ── Tab change ─────────────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    async (i: number) => {
      setActiveTab(i);
      // Clear query when switching tabs
      setQuery("");
      setMode("idle");
      setSuggestions([]);

      if (i === 1 && !recipesLoaded) {
        setIsLoadingRecipes(true);
        setRecipesError("");
        try {
          const data = await fetchAllRecipes(session);
          setSavedRecipes(data.map(recipeToFoodItem));
          setRecipesLoaded(true);
        } catch (err: any) {
          setRecipesError(err?.message || "Failed to load recipes.");
        }
        setIsLoadingRecipes(false);
      }
    },
    [session, recipesLoaded],
  );

  // ── All tab: debounced suggestions ─────────────────────────────────────────
  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);

      if (activeTab === 1) return; // My Recipes tab: client-side filter only

      if (!text.trim()) {
        setMode("idle");
        setSuggestions([]);
        setHasSearched(false);
        return;
      }
      setMode("suggesting");
      if (suggTimer.current) clearTimeout(suggTimer.current);
      suggTimer.current = setTimeout(async () => {
        setIsLoadingSugg(true);
        try {
          const sug = await searchFoodSuggestions(text.trim(), session);
          setSuggestions(sug);
        } catch {
          setSuggestions([]);
        }
        setIsLoadingSugg(false);
      }, 500);
    },
    [session, activeTab],
  );

  // ── All tab: full AI search ────────────────────────────────────────────────
  const handleSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      Keyboard.dismiss();

      // AI food search is premium — gate non-subscribers before the network call.
      if (!isSubscribed) {
        setPaywallVisible(true);
        return;
      }

      setMode("results");
      setHasSearched(true);
      setIsLoadingResults(true);
      setErrorMsg("");
      try {
        const data = await searchFood(trimmed, session);
        setBestMatch(data.bestMatch);
        setResults(data.results);
      } catch (err: any) {
        // Server-side gate backstop (handles a stale client premium flag).
        if (isUsageLimitError(err)) {
          setPaywallVisible(true);
          setMode("idle");
        } else {
          // Never surface raw server/JSON errors — show a simple message.
          setErrorMsg("Couldn't search food right now. Please try again.");
        }
      }
      setIsLoadingResults(false);
    },
    [session, isSubscribed],
  );

  const handleSelectSuggestion = (sug: string) => {
    setQuery(sug);
    handleSearch(sug);
  };

  const handleFoodPress = (item: FoodItem) => {
    navigation.navigate("FoodDetail", {
      food: item,
      defaultMealType: mealType,
    });
  };

  const clearQuery = () => {
    setQuery("");
    if (activeTab === 0) {
      setMode("idle");
      setSuggestions([]);
      setHasSearched(false);
    }
    inputRef.current?.focus();
  };

  // ── My Recipes: client-side filter ─────────────────────────────────────────
  const filteredRecipes = query.trim()
    ? savedRecipes.filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase()),
      )
    : savedRecipes;

  return (
    <SafeAreaViewCustom style={[styles.safe, { backgroundColor: "#FCF7F3" }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.closeBtn,
            { backgroundColor: colors.surface },
            SHADOWS.sm,
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={ms(22)} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mealPicker}
          onPress={() => setShowMealPicker(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.mealPickerText, { color: colors.text }]}>
            {MEAL_LABELS[mealType]}
          </Text>
          <Ionicons name="chevron-down" size={ms(16)} color={colors.text} />
        </TouchableOpacity>

        <View style={{ width: ms(36) }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchBarWrap}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="search"
            size={ms(18)}
            color={colors.textMuted}
            style={{ marginRight: ms(8) }}
          />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={
              activeTab === 0 ? "Search food..." : "Filter recipes..."
            }
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => activeTab === 0 && handleSearch(query)}
            returnKeyType={activeTab === 0 ? "search" : "done"}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={clearQuery}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={ms(18)}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            onPress={() => handleTabChange(i)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === i ? colors.primary : colors.textMuted },
                activeTab === i && { fontWeight: FONTS.semibold },
              ]}
            >
              {tab}
            </Text>
            {activeTab === i && (
              <View
                style={[
                  styles.tabIndicator,
                  { backgroundColor: colors.primary },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── All tab content ──────────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <>
          {mode === "idle" && (
            <View style={styles.emptyState}>
              {/* Decorative leaves + gingham corner */}
              <Image
                source={leafImg}
                style={styles.leafTopRight as ImageStyle}
                resizeMode="contain"
              />
              <Image
                source={leafImg}
                style={styles.leafCenterLeft as ImageStyle}
                resizeMode="contain"
              />
              <Image
                source={leafImg}
                style={styles.leafBottomLeft as ImageStyle}
                resizeMode="contain"
              />
              <Image
                source={ginghamImg}
                style={styles.ginghamBottomRight as ImageStyle}
                resizeMode="cover"
              />

              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Your meal log is empty
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Track your nutrition by logging your first meal.
              </Text>
              <TouchableOpacity
                style={[styles.addMealBtn, { backgroundColor: colors.primary }]}
                onPress={() =>
                  navigation.navigate("LogMeal", { defaultMealType: mealType })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.addMealText}>Add A Meal</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === "suggesting" && (
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Suggested Searches
              </Text>
              {isLoadingSugg && (
                <ActivityIndicator
                  size="small"
                  color={colors.textMuted}
                  style={{ marginTop: ms(16) }}
                />
              )}
              {suggestions.map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={styles.suggRow}
                  onPress={() => handleSelectSuggestion(sug)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="search-outline"
                    size={ms(16)}
                    color={colors.textMuted}
                    style={{ marginRight: ms(12) }}
                  />
                  <Text style={[styles.suggText, { color: colors.text }]}>
                    {sug}
                  </Text>
                </TouchableOpacity>
              ))}
              {query.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.searchAllRow}
                  onPress={() => handleSearch(query)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.searchAllIcon,
                      { backgroundColor: colors.info ?? "#3B82F6" },
                    ]}
                  >
                    <Ionicons name="search" size={ms(14)} color="#fff" />
                  </View>
                  <Text
                    style={[
                      styles.searchAllText,
                      { color: colors.info ?? "#3B82F6" },
                    ]}
                  >
                    Search all foods for: "{query}"
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {mode === "results" && (
            <FlatList
              data={[]}
              renderItem={null}
              ListHeaderComponent={
                <View>
                  {isLoadingResults ? (
                    <View style={styles.loadingWrap}>
                      <ActivityIndicator
                        size="large"
                        color={colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.loadingText,
                          { color: colors.textMuted },
                        ]}
                      >
                        Searching...
                      </Text>
                    </View>
                  ) : errorMsg ? (
                    <View style={styles.loadingWrap}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={ms(32)}
                        color={colors.error}
                      />
                      <Text
                        style={[
                          styles.loadingText,
                          { color: colors.textMuted },
                        ]}
                      >
                        {errorMsg}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {bestMatch && (
                        <View>
                          <View style={styles.resultsSectionHeader}>
                            <Text
                              style={[
                                styles.sectionTitle,
                                { color: colors.text, marginBottom: 0 },
                              ]}
                            >
                              Best Match
                            </Text>
                            <View
                              style={[
                                styles.onlyBadge,
                                {
                                  backgroundColor: colors.surfaceAlt,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Ionicons
                                name="shield-checkmark"
                                size={ms(11)}
                                color={colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.onlyBadgeText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Only
                              </Text>
                            </View>
                          </View>
                          <FoodRow
                            item={bestMatch}
                            onPress={handleFoodPress}
                            colors={colors}
                          />
                        </View>
                      )}
                      {results.length > 0 && (
                        <View>
                          <Text
                            style={[
                              styles.sectionTitle,
                              { color: colors.text },
                            ]}
                          >
                            More Results
                          </Text>
                          {results.map((item) => (
                            <FoodRow
                              key={item.id}
                              item={item}
                              onPress={handleFoodPress}
                              colors={colors}
                            />
                          ))}
                        </View>
                      )}
                      {!bestMatch && results.length === 0 && hasSearched && (
                        <View style={styles.loadingWrap}>
                          <Text
                            style={[
                              styles.loadingText,
                              { color: colors.textMuted },
                            ]}
                          >
                            No results found
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              }
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* ── My Recipes tab content ───────────────────────────────────────────── */}
      {activeTab === 1 && (
        <>
          {isLoadingRecipes ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.textMuted} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Loading recipes...
              </Text>
            </View>
          ) : recipesError ? (
            <View style={styles.loadingWrap}>
              <Ionicons
                name="alert-circle-outline"
                size={ms(32)}
                color={colors.error}
              />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                {recipesError}
              </Text>
            </View>
          ) : filteredRecipes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="book-outline"
                size={ms(48)}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {query.trim()
                  ? "No recipes match your search"
                  : "No saved recipes yet"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <FoodRow
                  item={item}
                  onPress={handleFoodPress}
                  colors={colors}
                />
              )}
              contentContainerStyle={[styles.listContent, { paddingTop: ms(12) }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}

      {/* Meal type picker modal */}
      <Modal visible={showMealPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMealPicker(false)}
        >
          <View
            style={[
              styles.mealPickerModal,
              { backgroundColor: DEFAULT_BG, borderColor: INPUT_BORDER },
            ]}
          >
            <Text style={[styles.mealPickerTitle, { color: TEXT_MUTED }]}>
              Select a Meal
            </Text>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt}
                style={[
                  styles.mealPickerOption,
                  mt === mealType && { backgroundColor: BRAND_COLOR + "14" },
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
                        mt === mealType ? TEXT_DARK : TEXT_MUTED,
                    },
                    mt === mealType && { fontWeight: FONTS.semibold },
                  ]}
                >
                  {MEAL_LABELS[mt]}
                </Text>
                {mt === mealType && (
                  <Ionicons name="checkmark" size={ms(16)} color={BRAND_COLOR} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <PaywallModal
        visible={paywallVisible}
        feature="search"
        onClose={() => setPaywallVisible(false)}
        onUpgrade={() => {
          setPaywallVisible(false);
          navigation.navigate("Subscription");
        }}
      />
    </SafeAreaViewCustom>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  mealPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
  },
  mealPickerText: {
    fontSize: ms(16),
    fontWeight: FONTS.semibold,
  },
  searchBarWrap: {
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(10),
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    padding: 0,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
    marginTop: ms(12),
  },
  tab: {
    marginRight: ms(20),
    paddingBottom: ms(10),
    position: "relative",
  },
  tabText: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.medium,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ms(2),
    borderRadius: ms(1),
  },
  sectionTitle: {
    fontSize: ms(16),
    fontWeight: FONTS.bold,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: ms(10),
  },
  suggRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(14),
  },
  suggText: { fontSize: FONT_SIZES.body },
  searchAllRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(14),
    gap: ms(12),
  },
  searchAllIcon: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    alignItems: "center",
    justifyContent: "center",
  },
  searchAllText: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.medium,
  },
  listContent: { paddingBottom: ms(40) },
  resultsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: ms(10),
  },
  onlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  onlyBadgeText: {
    fontSize: ms(12),
    fontWeight: FONTS.medium,
  },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: ms(14),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  foodRowInfo: { flex: 1 },
  foodNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  foodName: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.semibold,
  },
  foodMeta: {
    fontSize: FONT_SIZES.small,
    marginTop: ms(2),
  },
  addBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  loadingWrap: {
    alignItems: "center",
    paddingTop: ms(48),
    gap: ms(12),
  },
  loadingText: { fontSize: FONT_SIZES.label },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: ms(12),
    paddingHorizontal: ms(40),
  },
  emptyText: { fontSize: FONT_SIZES.body },
  emptyTitle: {
    fontSize: ms(24),
    fontWeight: FONTS.bold,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  emptySub: {
    fontSize: FONT_SIZES.body,
    textAlign: "center",
    marginTop: ms(-2),
    marginBottom: ms(12),
  },
  addMealBtn: {
    width: "100%",
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  addMealText: {
    fontSize: ms(16),
    fontWeight: FONTS.bold,
    color: "#FFFFFF",
  },
  leafTopRight: {
    position: "absolute",
    right: -ms(10),
    top: vs(40),
    width: ms(120),
    height: ms(120),
    opacity: 0.7,
  },
  leafCenterLeft: {
    position: "absolute",
    left: -ms(55),
    top: "32%",
    width: ms(120),
    height: ms(120),
    opacity: 0.7,
    transform: [{ scaleX: -1 }, { rotate: "25deg" }],
  },
  leafBottomLeft: {
    position: "absolute",
    left: -ms(16),
    bottom: vs(30),
    width: ms(120),
    height: ms(120),
    opacity: 0.7,
    transform: [{ scaleX: -1 }],
  },
  ginghamBottomRight: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: ms(130),
    height: ms(130),
    opacity: 0.85,
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
  mealPickerOptionText: { fontSize: FONT_SIZES.body },
});
