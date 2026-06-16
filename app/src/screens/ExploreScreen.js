import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  PanResponder,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import { SPACING, RADIUS, FONTS } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ExpandedNutrition } from "../components/NutritionExpansion";
import { exploreService } from "../services/exploreService";
import { useExplore } from "../context/ExploreContext";
import { saveRecipe, fetchAllRecipes } from "../services/recipeService";
import { useSubscription } from "../hooks/useSubscription";
import PaywallModal from "../components/PaywallModal";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 220;

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

// ── Swipe card ────────────────────────────────────────────────────────────────
// Holds its own animated state; the parent drives only the topmost card by
// passing live pan handlers and a transform style.
function getRecipeTag(card) {
  const p = card.macros?.protein ?? 0;
  const f = card.macros?.fat ?? 0;
  const c = card.macros?.carbs ?? 0;
  if (p >= 30) return "HIGH PROTEIN";
  if (f >= 20) return "HEALTHY FATS";
  if (c >= 60) return "HEALTHY CARBS";
  if (p + f + c === 0) return "BALANCED";
  return "LOW CALORIE";
}

function getRating(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rating = 4.5 + Math.abs(hash % 5) / 10;
  const reviews = 50 + Math.abs(hash % 200);
  return { rating: rating.toFixed(1), reviews };
}

// passing live pan handlers and a transform style.
// Each card owns its own image fetch so a load resolution does not re-render
// the whole deck — only the card whose URL changed.
const SwipeCard = React.memo(function SwipeCard({
  card,
  session,
  preloadedImage,
  style,
  panHandlers,
  colors,
  onBookmark,
}) {
  const ratingData = useMemo(() => getRating(card.name), [card.name]);
  const tagText = useMemo(() => getRecipeTag(card), [card]);
  const [imageUrl, setImageUrl] = useState(preloadedImage ?? null);

  // Hydrate from preload when it arrives later (parent passed null initially).
  useEffect(() => {
    if (preloadedImage && preloadedImage !== imageUrl) {
      setImageUrl(preloadedImage);
    }
  }, [preloadedImage]);

  // Fallback: only self-fetch when nothing was preloaded for this card.
  useEffect(() => {
    if (preloadedImage) return;
    let cancelled = false;
    exploreService
      .fetchRecipeImage(session, card.id, card.name)
      .then((url) => {
        if (cancelled || !url) return;
        Image.prefetch(url).catch(() => {});
        setImageUrl(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [card.id, session, preloadedImage]);

  const cardStyle = useMemo(
    () => [
      styles.card,
      { backgroundColor: colors.surface, borderColor: colors.border },
      style,
    ],
    [colors.surface, colors.border, style],
  );

  return (
    <Animated.View {...(panHandlers ?? {})} style={cardStyle}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.cardImage,
            styles.cardImageFallback,
            { backgroundColor: colors.surfaceAlt },
          ]}
        >
          <Text style={styles.cardEmoji}>{card.emoji ?? "🍽️"}</Text>
        </View>
      )}

      {/* Dark gradient overlay at the bottom for readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
        style={styles.cardOverlay}
      />

      {/* Top Header Badge & Bookmark Icon */}
      <View style={styles.cardHeader}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>🌱 {tagText}</Text>
        </View>
        {onBookmark ? (
          <TouchableOpacity
            style={styles.bookmarkBtn}
            activeOpacity={0.85}
            onPress={() => onBookmark(card)}
          >
            <Ionicons name="bookmark-outline" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.bookmarkBtn}>
            <Ionicons name="bookmark-outline" size={18} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>
          {card.name}
        </Text>

        {/* Rating and Details Row */}
        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaLeft}>
            <View style={styles.metaItem}>
              <Ionicons
                name="star"
                size={13}
                color="#FFB300"
                style={{ marginRight: 3 }}
              />
              <Text style={styles.metaText}>
                {ratingData.rating} ({ratingData.reviews})
              </Text>
            </View>
            <Text style={styles.metaDivider}>·</Text>
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={13}
                color="#fff"
                style={{ marginRight: 3 }}
              />
              <Text style={styles.metaText}>{card.time || "30 min"}</Text>
            </View>
            <Text style={styles.metaDivider}>·</Text>
            <View style={styles.metaItem}>
              <Ionicons
                name="restaurant-outline"
                size={13}
                color="#fff"
                style={{ marginRight: 3 }}
              />
              <Text style={styles.metaText}>{card.difficulty || "Easy"}</Text>
            </View>
          </View>
          <View style={styles.caloriesBadge}>
            <Ionicons
              name="flame"
              size={11}
              color="#FF6B35"
              style={{ marginRight: 3 }}
            />
            <Text style={styles.caloriesText}>{card.calories} kcal</Text>
          </View>
        </View>

        {/* Horizontal Divider Line */}
        <View style={styles.cardDivider} />

        {/* Macros Row */}
        <View style={styles.macrosRow}>
          <View style={styles.macroCol}>
            <Text style={styles.macroValue}>{card.macros?.protein ?? 0}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroColDivider} />
          <View style={styles.macroCol}>
            <Text style={styles.macroValue}>{card.macros?.carbs ?? 0}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroColDivider} />
          <View style={styles.macroCol}>
            <Text style={styles.macroValue}>{card.macros?.fat ?? 0}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
          <View style={styles.macroColDivider} />
          <View style={styles.macroCol}>
            <Text style={styles.macroValue}>
              {card.estimatedGrams ? Math.round(card.estimatedGrams / 50) : 8}g
            </Text>
            <Text style={styles.macroLabel}>Fiber</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

// ── Swipe deck ────────────────────────────────────────────────────────────────
function SwipeDeck({ cards, session, images, colors, onLike, onSkip, onInfo }) {
  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  // Reset deck when the underlying card set changes.
  useEffect(() => {
    setIndex(0);
    position.setValue({ x: 0, y: 0 });
  }, [cards]);

  const forceSwipe = useCallback(
    (direction) => {
      const x =
        direction === "right" ? SCREEN_WIDTH * 1.25 : -SCREEN_WIDTH * 1.25;
      Animated.timing(position, {
        toValue: { x, y: 0 },
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: false,
      }).start(() => {
        const card = cards[index];
        if (direction === "right") onLike?.(card);
        else onSkip?.(card);
        position.setValue({ x: 0, y: 0 });
        setIndex((i) => i + 1);
      });
    },
    [index, cards, onLike, onSkip, position],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
        onPanResponderMove: (_, gesture) =>
          position.setValue({ x: gesture.dx, y: gesture.dy }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) forceSwipe("right");
          else if (gesture.dx < -SWIPE_THRESHOLD) forceSwipe("left");
          else {
            // Treat a release with negligible movement as a tap → open details.
            const isTap = Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5;
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              friction: 5,
              useNativeDriver: false,
            }).start(() => {
              if (isTap) onInfo?.(cards[index]);
            });
          }
        },
      }),
    [forceSwipe, position, onInfo, cards, index],
  );

  // Memoize interpolation nodes — position ref is stable, so these never change.
  const rotate = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        outputRange: ["-12deg", "0deg", "12deg"],
      }),
    [position],
  );
  const likeOpacity = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [position],
  );
  const skipOpacity = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [-SWIPE_THRESHOLD, 0],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [position],
  );

  const topAnimatedStyle = useMemo(
    () => ({
      transform: [
        { translateX: position.x },
        { translateY: position.y },
        { rotate },
      ],
      zIndex: 99,
    }),
    [position, rotate],
  );

  const backCardStyle = useMemo(
    () => ({
      transform: [{ translateX: 28 }, { scale: 0.94 }, { rotate: "1deg" }],
      zIndex: 1,
    }),
    [],
  );

  if (index >= cards.length) {
    return (
      <View
        style={[
          styles.emptyDeck,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={styles.deckEmoji}>🎉</Text>
        <Text style={[styles.deckText, { color: colors.text }]}>
          You're all caught up
        </Text>
        <TouchableOpacity
          onPress={() => setIndex(0)}
          style={[styles.resetBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.resetText, { color: colors.text }]}>
            Start over
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.deckWrap}>
      {/* Render in reverse so the active card paints on top */}
      {cards
        .map((card, i) => {
          if (i < index) return null;
          if (i > index + 1) return null;
          if (i === index) {
            return (
              <SwipeCard
                key={card.id}
                card={card}
                session={session}
                preloadedImage={images?.[card.id] ?? null}
                style={topAnimatedStyle}
                panHandlers={panResponder.panHandlers}
                colors={colors}
                onBookmark={onLike}
              />
            );
          }
          // Card behind — slight scale down + shifted right.
          return (
            <SwipeCard
              key={card.id}
              card={card}
              session={session}
              preloadedImage={images?.[card.id] ?? null}
              style={backCardStyle}
              colors={colors}
            />
          );
        })
        .reverse()}

      {/* Like/Skip stamps */}
      <Animated.View
        style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.stampText}>SAVE</Text>
      </Animated.View>
      <Animated.View
        style={[styles.stamp, styles.stampSkip, { opacity: skipOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.stampText}>NOPE</Text>
      </Animated.View>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <ControlBtn
          icon="close"
          color="#FF6B35"
          onPress={() => forceSwipe("left")}
        />
        <ControlBtn
          icon="information"
          size={46}
          color="#6B7280"
          onPress={() => onInfo?.(cards[index])}
        />
        <ControlBtn
          icon="heart"
          color="#4CAF50"
          onPress={() => forceSwipe("right")}
        />
      </View>
    </View>
  );
}

function ControlBtn({ icon, color, size = 60, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.controlBtn,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </TouchableOpacity>
  );
}

// ── Trending row ──────────────────────────────────────────────────────────────
function TrendingRow({ items, session, onPress, colors }) {
  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    items.forEach((it) => {
      if (imageUrls[it.id] !== undefined) return;
      setImageUrls((prev) => ({ ...prev, [it.id]: null }));
      exploreService
        .fetchRecipeImage(session, it.id, it.name)
        .then((url) => setImageUrls((prev) => ({ ...prev, [it.id]: url })))
        .catch(() => setImageUrls((prev) => ({ ...prev, [it.id]: null })));
    });
  }, [items, session]);

  if (!items.length) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        Trending Now
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
      >
        {items.map((it) => (
          <TouchableOpacity
            key={it.id}
            style={[
              styles.trendingCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => onPress?.(it)}
            activeOpacity={0.85}
          >
            {imageUrls[it.id] ? (
              <Image
                source={{ uri: imageUrls[it.id] }}
                style={styles.trendingImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.trendingImage,
                  styles.cardImageFallback,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Text style={{ fontSize: 32 }}>{it.emoji ?? "🍽️"}</Text>
              </View>
            )}
            <View style={styles.trendingMeta}>
              <Text
                style={[styles.trendingName, { color: colors.text }]}
                numberOfLines={1}
              >
                {it.name}
              </Text>
              <Text style={[styles.trendingSub, { color: colors.textMuted }]}>
                {it.calories} kcal
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Recipe row (saved-library accordion) ──────────────────────────────────────
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
        <Text>{item?.emoji || ""}</Text>
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
  const { isSubscribed } = useSubscription();
  const {
    cards: preloadedCards,
    trending: preloadedTrending,
    images: preloadedImages,
    cardsLoaded: exploreCardsLoaded,
    loading: exploreLoading,
    ensure: ensureExplore,
    refresh: refreshExplore,
  } = useExplore();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [dbRecipes, setDbRecipes] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [swipeError, setSwipeError] = useState(null);

  // Filter the preloaded deck by the selected category client-side — avoids a
  // round trip when the user just toggles a pill.
  const swipeCards = useMemo(() => {
    if (selectedCategory === "all") return preloadedCards;
    return preloadedCards.filter((c) => c.category === selectedCategory);
  }, [preloadedCards, selectedCategory]);

  const trending = preloadedTrending;
  // Spinner only on true cold start — once cards arrive (DB query, fast) we render
  // the deck immediately. Signed image URLs stream in afterwards without blocking.
  const swipeLoading = exploreLoading && !exploreCardsLoaded;

  const loadSwipeDeck = useCallback(() => {
    if (!session?.access_token) return;
    setSwipeError(null);
    refreshExplore(session).catch((err) => {
      setSwipeError(err?.message || "Failed to load recipe deck");
    });
  }, [session, refreshExplore]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.access_token) return;
      setDbLoading(true);
      fetchAllRecipes(session)
        .then((rows) => setDbRecipes((rows ?? []).map(dbToItem)))
        .catch(() => {})
        .finally(() => setDbLoading(false));

      // No-op if the dashboard already preloaded.
      ensureExplore(session).catch((err) => {
        setSwipeError(err?.message || "Failed to load recipe deck");
      });
    }, [session, ensureExplore]),
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
        const { results } = await exploreService.searchFood(
          session,
          q.trim(),
          language,
        );
        setAiResults(results);
      } catch (err) {
        if (err.isUsageLimit) {
          setPaywallVisible(true);
          setHasSearched(false);
        } else {
          setSearchError(err.message);
        }
        setAiResults([]);
      } finally {
        setLoading(false);
      }
    },
    [session, language],
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

  // Swiping right saves the curated recipe into the user's library.
  async function handleLikeCard(card) {
    try {
      await saveRecipe(
        session,
        {
          title: card.name,
          emoji: card.emoji,
          steps: card.steps,
          ingredients: card.ingredients,
          nutrition: card.nutrition,
          estimatedGrams: card.estimatedGrams,
        },
        null,
      );
      // Refresh library silently.
      fetchAllRecipes(session)
        .then((rows) => setDbRecipes((rows ?? []).map(dbToItem)))
        .catch(() => {});
    } catch (err) {
      console.warn("[ExploreScreen] like save failed:", err?.message ?? err);
    }
  }

  function handleCardInfo(card) {
    handleStartCooking(card);
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("explore.title")}
          </Text>
        </View>

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

        {/* Category pills shown in both browse + search modes (drive the deck too). */}
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
                    backgroundColor: isActive ? colors.text : colors.surfaceAlt,
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

        {/* ── Default browse mode: swipe deck → trending → library ────── */}
        {!isSearching ? (
          <>
            <View style={styles.deckContainer}>
              {swipeLoading ? (
                <View
                  style={[
                    styles.emptyDeck,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.textMuted} />
                  <Text
                    style={{
                      color: colors.textMuted,
                      marginTop: 8,
                      fontSize: 13,
                    }}
                  >
                    Loading recipes...
                  </Text>
                </View>
              ) : swipeError ? (
                <View
                  style={[
                    styles.emptyDeck,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      padding: 20,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={32}
                    color="#FF6B35"
                  />
                  <Text
                    style={{
                      color: colors.text,
                      marginTop: 8,
                      fontSize: 14,
                      fontWeight: "500",
                      textAlign: "center",
                    }}
                  >
                    {swipeError}
                  </Text>
                  <TouchableOpacity
                    onPress={loadSwipeDeck}
                    style={{
                      marginTop: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: colors.text,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.background,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : swipeCards.length === 0 ? (
                <View
                  style={[
                    styles.emptyDeck,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={styles.deckEmoji}>🍽️</Text>
                  <Text
                    style={[
                      styles.deckText,
                      { color: colors.text, marginTop: 8 },
                    ]}
                  >
                    No recipes available
                  </Text>
                </View>
              ) : (
                <SwipeDeck
                  cards={swipeCards}
                  session={session}
                  images={preloadedImages}
                  colors={colors}
                  onLike={handleLikeCard}
                  onSkip={() => {}}
                  onInfo={handleCardInfo}
                />
              )}
            </View>

            {/* <TrendingRow
              items={trending}
              session={session}
              colors={colors}
              onPress={handleStartCooking}
            /> */}

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
            ) : null}
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

      <PaywallModal
        visible={paywallVisible}
        feature="search"
        onClose={() => setPaywallVisible(false)}
        onUpgrade={() => {
          setPaywallVisible(false);
          navigation.navigate("Subscription");
        }}
      />
    </SafeAreaView>
  );
}

const CARD_HEIGHT = 440;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  header: { paddingHorizontal: 24, paddingTop: SPACING.lg, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: FONTS.bold, letterSpacing: -0.5 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.sm,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: FONTS.regular, padding: 0 },

  pillsRow: { paddingHorizontal: 24, gap: SPACING.sm, marginBottom: 18 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  pillText: { fontSize: 13, fontWeight: FONTS.medium },

  // Swipe deck
  deckContainer: {
    marginHorizontal: 24,
    height: CARD_HEIGHT + 90,
    marginBottom: 16,
    overflow: "visible",
  },
  deckWrap: { flex: 1, position: "relative", overflow: "visible" },
  card: {
    position: "absolute",
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: "100%" },
  cardImageFallback: { alignItems: "center", justifyContent: "center" },
  cardEmoji: { fontSize: 90 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardHeader: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  badgeContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    color: "#111",
    fontSize: 10,
    fontWeight: FONTS.semibold,
  },
  bookmarkBtn: {
    backgroundColor: "rgba(0,0,0,0.35)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { position: "absolute", left: 16, right: 16, bottom: 16 },
  cardName: {
    fontSize: 22,
    fontWeight: FONTS.bold,
    color: "#fff",
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    color: "#fff",
    fontSize: 11,
  },
  metaDivider: {
    color: "rgba(255,255,255,0.4)",
    marginHorizontal: 6,
  },
  caloriesBadge: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
  },
  caloriesText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: FONTS.semibold,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 10,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroCol: {
    alignItems: "center",
    flex: 1,
  },
  macroValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: FONTS.bold,
  },
  macroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    marginTop: 1,
  },
  macroColDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  stamp: {
    position: "absolute",
    top: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 3,
    borderRadius: 8,
    zIndex: 200,
  },
  stampLike: {
    right: 24,
    borderColor: "#22C55E",
    transform: [{ rotate: "15deg" }],
  },
  stampSkip: {
    left: 24,
    borderColor: "#EF4444",
    transform: [{ rotate: "-15deg" }],
  },
  stampText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: FONTS.bold,
    letterSpacing: 2,
  },

  controls: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  controlBtn: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  emptyDeck: {
    flex: 1,
    minHeight: CARD_HEIGHT,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  deckEmoji: { fontSize: 56 },
  deckText: { fontSize: 16, fontWeight: FONTS.semibold },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  resetText: { fontSize: 14, fontWeight: FONTS.medium },

  // Trending
  trendingCard: {
    width: 160,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  trendingImage: { width: "100%", height: 100 },
  trendingMeta: { padding: 10, gap: 2 },
  trendingName: { fontSize: 13, fontWeight: FONTS.semibold },
  trendingSub: { fontSize: 11 },

  // Plan card + library
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
  listCard: { marginHorizontal: 24, borderRadius: RADIUS.lg },

  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
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

  loadingState: { alignItems: "center", paddingTop: SPACING.xxl * 2, gap: 16 },
  loadingText: { fontSize: 14, fontWeight: FONTS.regular },
});
