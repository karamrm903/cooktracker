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
  FlatList,
  Modal,
  Image,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import { SPACING, RADIUS, FONTS, FONT_SIZES } from "../constants/theme";
import {
  moderateScale as ms,
  verticalScale as vs,
} from "../utils/responsive";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ExpandedNutrition } from "../components/NutritionExpansion";
import { exploreService } from "../services/exploreService";
import { useExplore } from "../context/ExploreContext";
import { saveRecipe, fetchAllRecipes } from "../services/recipeService";
import { useSubscription } from "../hooks/useSubscription";
import { useMealLogs } from "../context/MealLogsContext";
import PaywallModal from "../components/PaywallModal";
import CommonAlertModal from "../components/CommonModal";
import { DEFAULT_BG } from "@/styles/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ── Assets ────────────────────────────────────────────────────────────────────
const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const sunVector = require("../../assets/pngs/sunVector.png");
const sunCloudVector = require("../../assets/pngs/sunWithCloudVector.png");
const moonVector = require("../../assets/pngs/moonVector.png");
const glassVector = require("../../assets/pngs/glassVector.png");
const calendarPlanImg = require("../../assets/pngs/calenderPlan.png");

const CAT_ICON = {
  breakfast: sunVector,
  lunch: sunCloudVector,
  dinner: moonVector,
  snack: glassVector,
};

const MACRO_COLORS = { protein: "#EF4444", carbs: "#22C55E", fat: "#EAB308" };

// Saved-library cache. Module scope → loaded once per app launch and reused
// across tab focus / remounts; null means "not yet loaded this session".
let _exploreLibraryCache = null;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Bucket recipes into figma-style sections by their macro profile.
const SECTION_ORDER = [
  ["HIGH PROTEIN", "High Protein"],
  ["HEALTHY CARBS", "High Carbs"],
  ["HEALTHY FATS", "Healthy Fats"],
  ["BALANCED", "Balanced"],
  ["LOW CALORIE", "Low Calorie"],
];

const CATEGORIES = [
  { id: "all", labelKey: "explore.categories.all" },
  { id: "breakfast", labelKey: "explore.categories.breakfast" },
  { id: "lunch", labelKey: "explore.categories.lunch" },
  { id: "dinner", labelKey: "explore.categories.dinner" },
  { id: "snack", labelKey: "explore.categories.snack" },
];

// Meal-type picker options (same set as SearchFoodScreen) used when saving a
// recipe into the dashboard's Today's meals.
// Cap the swipe carousel to a random subset — fewer cards means far fewer
// signed-image fetches up front, so the deck loads fast even with a big library.
const CAROUSEL_DECK_LIMIT = 30;

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function dbToItem(r) {
  const protein = r.protein ?? 0;
  const carbs = r.carbs ?? 0;
  const fat = r.fat ?? 0;
  let ingredients = [];
  try {
    ingredients = JSON.parse(r.ingredients ?? "[]");
  } catch { }
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

// ── Instagram-style post card ─────────────────────────────────────────────────
// A single full-width recipe card inside the horizontal pager. Owns its own
// image fetch so a load resolution only re-renders this card.
const PostCard = React.memo(function PostCard({
  card,
  preloadedImage,
  colors,
  saved,
  onSave,
  onOpen,
}) {
  const ratingData = useMemo(() => getRating(card.name), [card.name]);
  const tagText = useMemo(() => getRecipeTag(card), [card]);
  // Prefer the URL the carousel resolved; fall back to the inline imageUrl the
  // swipe payload already shipped so the card paints without waiting on any fetch.
  const imageUrl = preloadedImage ?? card.imageUrl ?? null;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => onOpen?.(card)}
      style={[
        styles.postCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          transition={150}
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

      {/* Top Header Badge (save icon moved down next to kcal) */}
      <View style={styles.cardHeader}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>🌱 {tagText}</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        {/* Row 1 — title + kcal */}
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={2}>
            {card.name}
          </Text>
          <View style={styles.caloriesBadge}>
            <Ionicons
              name="flame"
              size={ms(11)}
              color="#FF6B35"
              style={{ marginRight: ms(3) }}
            />
            <Text style={styles.caloriesText}>{card.calories} kcal</Text>
          </View>
        </View>

        {/* Row 2 — rating / meta + save */}
        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaLeft}>
            <View style={styles.metaItem}>
              <Ionicons
                name="star"
                size={ms(13)}
                color="#FFB300"
                style={{ marginRight: ms(3) }}
              />
              <Text style={styles.metaText}>
                {ratingData.rating} ({ratingData.reviews})
              </Text>
            </View>
            <Text style={styles.metaDivider}>·</Text>
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={ms(13)}
                color="#fff"
                style={{ marginRight: ms(3) }}
              />
              <Text style={styles.metaText}>{card.time || "30 min"}</Text>
            </View>
            <Text style={styles.metaDivider}>·</Text>
            <View style={styles.metaItem}>
              <Ionicons
                name="restaurant-outline"
                size={ms(13)}
                color="#fff"
                style={{ marginRight: ms(3) }}
              />
              <Text style={styles.metaText}>{card.difficulty || "Easy"}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.cardSaveBtn, saved && { backgroundColor: "#fff" }]}
            activeOpacity={0.85}
            onPress={() => onSave?.(card)}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={ms(16)}
              color={saved ? colors.primary : "#fff"}
            />
          </TouchableOpacity>
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
    </TouchableOpacity>
  );
});

// ── Instagram-style post carousel ─────────────────────────────────────────────
// Full-width, paging horizontal list — swipe left/right snaps cleanly between
// recipe cards (like sliding through photos in an Instagram post). Endless:
// the data is tripled and the scroll position is parked in the middle copy, so
// the user can keep swiping in either direction forever without hitting an end.
function PostCarousel({ cards, totalCount, session, images, colors, savedNames, onSave, onOpen, onLoadMore }) {
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);

  const [bulkImages, setBulkImages] = useState({});

  const onViewableItemsChanged = useCallback(({ viewableItems: vItems }) => {
    const ids = vItems.map((v) => v.item.id).filter(id => !images?.[id] && bulkImages[id] === undefined);

    const lastIndex = vItems.length ? vItems[vItems.length - 1].index : -1;
    if (lastIndex !== -1 && lastIndex >= cards.length - 5) {
      onLoadMore();
    }

    if (ids.length > 0) {
      setBulkImages(prev => {
        const next = { ...prev };
        ids.forEach(id => next[id] = null);
        return next;
      });
      exploreService.loadRecipeImages(session, ids).then((map) => {
        setBulkImages(prev => ({ ...prev, ...map }));
        Object.entries(map).forEach(([id, url]) => {
          if (url) {
            ExpoImage.prefetch(url).catch(() => { });
          } else {
            const item = cards.find(c => c.id === id);
            if (item) {
              exploreService.fetchRecipeImage(session, id, item.name).then(fallbackUrl => {
                exploreService.seedImageCache({ [id]: fallbackUrl });
                setBulkImages(prev => ({ ...prev, [id]: fallbackUrl }));
                if (fallbackUrl) ExpoImage.prefetch(fallbackUrl).catch(() => { });
              }).catch(() => { });
            }
          }
        });
      }).catch(() => { });
    }
  }, [images, bulkImages, session, cards.length, onLoadMore]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 0,
  }).current;

  const n = totalCount && totalCount > cards.length ? totalCount : cards.length;

  const getItemLayout = useCallback(
    (_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i }),
    [],
  );

  const onScroll = useCallback(
    (e) => {
      const raw = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setIndex(prev => (prev !== raw ? raw : prev));
      if (raw >= cards.length - 10) {
        onLoadMore();
      }
    },
    [cards.length, onLoadMore],
  );

  return (
    <View style={{ flex: 1, backgroundColor: DEFAULT_BG }}>
      <FlatList
        ref={listRef}
        data={cards}
        keyExtractor={(c, i) => `${c.id}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        extraData={savedNames}
        renderItem={({ item }) => (
          <View style={styles.postPage}>
            <PostCard
              card={item}
              session={session}
              preloadedImage={images?.[item.id] ?? bulkImages[item.id] ?? null}
              colors={colors}
              saved={savedNames.has(item.name)}
              onSave={onSave}
              onOpen={onOpen}
            />
          </View>
        )}
      />

      {n > 1 && (
        <View style={styles.pageCounter} pointerEvents="none">
          <Text style={styles.pageCounterText}>
            {index + 1}/{n}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Trending row ──────────────────────────────────────────────────────────────
function TrendingRow({ items, session, onPress, colors }) {
  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    // Trending payload already carries imageUrl inline — render it directly and
    // only lazy-fetch the rare item that arrived without one. Avoids a per-card
    // POST against the single Render worker for images the server already gave us.
    const seeded = {};
    items.forEach((it) => {
      if (it.imageUrl && imageUrls[it.id] === undefined) seeded[it.id] = it.imageUrl;
    });
    if (Object.keys(seeded).length) {
      setImageUrls((prev) => ({ ...prev, ...seeded }));
    }
    items
      .filter((it) => !it.imageUrl && imageUrls[it.id] === undefined)
      .forEach((it) => {
        setImageUrls((prev) => ({ ...prev, [it.id]: null }));
        exploreService
          .fetchRecipeImageCached(session, it.id, it.name)
          .then((url) => setImageUrls((prev) => ({ ...prev, [it.id]: url })))
          .catch(() => setImageUrls((prev) => ({ ...prev, [it.id]: null })));
      });
  }, [items, session]);

  if (!items.length) return null;
  return (
    <View style={{ marginBottom: ms(24) }}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        Trending Now
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: ms(24), gap: ms(12) }}
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
              <ExpoImage
                source={{ uri: imageUrls[it.id] }}
                style={styles.trendingImage}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View
                style={[
                  styles.trendingImage,
                  styles.cardImageFallback,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Text style={{ fontSize: ms(32) }}>{it.emoji ?? "🍽️"}</Text>
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
            size={ms(12)}
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

// ── Horizontal recipe card (category carousels) ───────────────────────────────
const HRecipeCard = React.memo(function HRecipeCard({
  item,
  img,
  colors,
  t,
  onStartCooking,
  saved,
  onSave,
}) {
  const [expanded, setExpanded] = useState(false);
  const { rating } = useMemo(() => getRating(item.name), [item.name]);

  const p = item.macros?.protein ?? 0;
  const cb = item.macros?.carbs ?? 0;
  const f = item.macros?.fat ?? 0;
  const pCal = p * 4;
  const cCal = cb * 4;
  const fCal = f * 9;
  const macroTotal = pCal + cCal + fCal;

  const macros = [
    { l: "Protein", v: p, c: MACRO_COLORS.protein },
    { l: "Carbs", v: cb, c: MACRO_COLORS.carbs },
    { l: "Fat", v: f, c: MACRO_COLORS.fat },
  ];

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  }

  return (
    <View style={[styles.hCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {img ? (
        <ExpoImage
          source={{ uri: img }}
          style={styles.hCardImg}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.hCardImg, styles.cardImageFallback, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={{ fontSize: ms(34) }}>{item.emoji ?? "🍽️"}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.hBookmark, saved && { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
        onPress={() => onSave?.(item)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons
          name={saved ? "bookmark" : "bookmark-outline"}
          size={ms(15)}
          color={saved ? "#fff" : colors.textSecondary}
        />
      </TouchableOpacity>

      <View style={styles.hCardBody}>
        <TouchableOpacity
          style={styles.hCardTitleRow}
          activeOpacity={0.7}
          onPress={toggle}
        >
          <Text style={[styles.hCardName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={ms(16)}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        <Text style={[styles.hCardMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {item.calories} kcal · {item.time || "45 min"} · ★ {rating}
        </Text>

        {expanded && (
          <>
            <View style={[styles.hDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.hCardKcal, { color: colors.text }]}>{item.calories} kcal</Text>

            <View style={[styles.hBar, { backgroundColor: colors.surfaceAlt }]}>
              {macroTotal > 0 && (
                <View style={styles.hBarFill}>
                  <View style={{ flex: pCal, backgroundColor: MACRO_COLORS.protein }} />
                  <View style={{ flex: cCal, backgroundColor: MACRO_COLORS.carbs }} />
                  <View style={{ flex: fCal, backgroundColor: MACRO_COLORS.fat }} />
                </View>
              )}
            </View>

            <View style={styles.hMacroList}>
              {macros.map((m) => (
                <View key={m.l} style={styles.hMacroRow}>
                  <View style={[styles.hDot, { backgroundColor: m.c }]} />
                  <Text style={[styles.hMacroLabel, { color: colors.textSecondary }]}>{m.l}</Text>
                  <Text style={[styles.hMacroVal, { color: colors.text }]}>{m.v}g</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={() => onStartCooking(item)}
            >
              <Text style={styles.startBtnText}>{t("explore.startCooking")}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
});

const CAROUSEL_LIMIT = 10;

function RecipeCarousel({ title, items, session, colors, t, onStartCooking, onSeeAll, savedNames, onSave }) {
  const displayItems = items;

  const [images, setImages] = useState({});

  const onViewableItemsChanged = useCallback(({ viewableItems: vItems }) => {
    const visibleIds = vItems.map((v) => v.item?.id);
    const lastIndex = vItems.length ? vItems[vItems.length - 1].index : -1;
    const nextIds = [];
    if (lastIndex !== -1 && lastIndex + 1 < displayItems.length) nextIds.push(displayItems[lastIndex + 1].id);
    if (lastIndex !== -1 && lastIndex + 2 < displayItems.length) nextIds.push(displayItems[lastIndex + 2].id);

    const allIdsToLoad = [...new Set([...visibleIds, ...nextIds])];
    const ids = allIdsToLoad.filter(id => id && images[id] === undefined);
    if (ids.length > 0) {
      setImages(prev => {
        const next = { ...prev };
        ids.forEach(id => next[id] = null);
        return next;
      });
      exploreService.loadRecipeImages(session, ids).then((map) => {
        setImages(prev => ({ ...prev, ...map }));
        Object.entries(map).forEach(([id, url]) => {
          if (url) {
            ExpoImage.prefetch(url).catch(() => { });
          } else {
            const item = displayItems.find(c => c.id === id);
            if (item) {
              exploreService.fetchRecipeImage(session, id, item.name).then(fallbackUrl => {
                exploreService.seedImageCache({ [id]: fallbackUrl });
                setImages(prev => ({ ...prev, [id]: fallbackUrl }));
                if (fallbackUrl) ExpoImage.prefetch(fallbackUrl).catch(() => { });
              }).catch(() => { });
            }
          }
        });
      }).catch(() => { });
    }
  }, [images, session]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 1,
    minimumViewTime: 100,
  }).current;

  if (!items.length) return null;
  return (
    <View style={{ marginBottom: ms(24) }}>
      <View style={styles.carouselHeader}>
        <Text style={[styles.carouselTitle, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.seeAll, { color: colors.textMuted }]}>{t("explore.seeAll")}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: ms(24), gap: ms(14), alignItems: "flex-start" }}
        data={displayItems}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <HRecipeCard
            item={item}
            img={images[item.id] ?? null}
            colors={colors}
            t={t}
            onStartCooking={onStartCooking}
            saved={savedNames.has(item.name)}
            onSave={onSave}
          />
        )}
        ListFooterComponent={() => (
          <TouchableOpacity
            style={[
              styles.seeAllCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.85}
            onPress={onSeeAll}
          >
            <View style={[styles.seeAllIconWrap, { backgroundColor: colors.tintOrange }]}>
              <Ionicons name="arrow-forward" size={ms(22)} color={colors.primary} />
            </View>
            <Text style={[styles.seeAllCardText, { color: colors.text }]}>
              {t("explore.seeAll")}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ── Carousel shimmer ──────────────────────────────────────────────────────────
// Pulsing placeholder shown while the deck is still loading — exact same
// footprint (full width × CARD_HEIGHT) as a real carousel card.
function CarouselSkeleton({ colors }) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <View style={styles.deckSection}>
      <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
        <Animated.View
          style={[styles.skeletonBlock, { backgroundColor: colors.surfaceAlt, opacity: anim }]}
        />
        {/* Faux text lines at the bottom, matching the card info area */}
        <View style={styles.skeletonInfo}>
          <Animated.View
            style={[styles.skeletonLineLg, { backgroundColor: colors.surfaceAlt, opacity: anim }]}
          />
          <Animated.View
            style={[styles.skeletonLineSm, { backgroundColor: colors.surfaceAlt, opacity: anim }]}
          />
        </View>
      </View>
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
    totalDeckCount,
    trending: preloadedTrending,
    images: preloadedImages,
    cardsLoaded: exploreCardsLoaded,
    loading: exploreLoading,
    ensure: ensureExplore,
    refresh: refreshExplore,
    loadMoreDeck,
  } = useExplore();
  const { meals, addMeal } = useMealLogs() || {};

  // A recipe counts as "saved" once it's logged into today's dashboard meals.
  const savedNames = useMemo(
    () => new Set((meals ?? []).map((m) => m.name)),
    [meals],
  );

  const [savePickerRecipe, setSavePickerRecipe] = useState(null);
  const [savingMeal, setSavingMeal] = useState(false);
  const [savingType, setSavingType] = useState(null);
  const [resultModal, setResultModal] = useState({
    visible: false,
    variant: "success",
    message: "",
  });

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [dbRecipes, setDbRecipes] = useState(() => _exploreLibraryCache ?? []);
  const [dbLoading, setDbLoading] = useState(false);
  // Whether the library fetch has resolved at least once this session (true
  // immediately if the cache is already warm). Drives the deck shimmer.
  const [dbLoaded, setDbLoaded] = useState(() => _exploreLibraryCache !== null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [swipeError, setSwipeError] = useState(null);

  // Filter the preloaded deck by the selected category client-side — avoids a
  // round trip when the user just toggles a pill. Fall back to the user's saved
  // library when the curated server deck is empty so the swiper is never blank.
  const swipeCards = useMemo(() => {
    const base = preloadedCards.length ? preloadedCards : dbRecipes;
    return selectedCategory === "all"
      ? base
      : base.filter((c) => c.category === selectedCategory);
  }, [preloadedCards, dbRecipes, selectedCategory]);

  const trending = preloadedTrending;

  // Group the user's library into figma-style horizontal sections by macro tag.
  const recipeSections = useMemo(() => {
    const groups = {};
    dbRecipes.forEach((r) => {
      const tag = getRecipeTag(r);
      (groups[tag] = groups[tag] || []).push(r);
    });
    return SECTION_ORDER.filter(([key]) => groups[key]?.length).map(
      ([key, label]) => ({ title: label, items: groups[key] }),
    );
  }, [dbRecipes]);

  // The deck is "resolved" only once the library fetch has returned AND the
  // curated server deck has settled — otherwise an empty server deck would flash
  // "No recipes available" while the library (the real fallback) is still loading.
  const deckResolved = dbLoaded && (exploreCardsLoaded || !exploreLoading);

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

      // Library: fetch once per app launch, then reuse the session cache on
      // every subsequent focus instead of hitting the server again.
      if (_exploreLibraryCache === null) {
        setDbLoading(true);
        fetchAllRecipes(session)
          .then((rows) => {
            const mapped = (rows ?? []).map(dbToItem);
            _exploreLibraryCache = mapped;
            setDbRecipes(mapped);
            // Warm the shared image cache for the WHOLE library in one (chunked)
            // bulk request, before the per-macro section carousels mount. Each
            // section's own loadRecipeImages then hits the cache instead of
            // firing its own POST — collapses ~5 concurrent requests into 1.
            const ids = mapped.map((m) => m.id);
            for (let i = 0; i < ids.length; i += 100) {
              exploreService
                .loadRecipeImages(session, ids.slice(i, i + 100))
                .catch(() => { });
            }
          })
          .catch(() => { })
          .finally(() => {
            setDbLoading(false);
            setDbLoaded(true);
          });
      }

      // No-op if the dashboard already preloaded (context is session-guarded).
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

  function handleCardInfo(card) {
    handleStartCooking(card);
  }

  // Tapping the save icon (carousel card or horizontal list) opens the
  // meal-type picker; choosing a slot logs the recipe into today's meals.
  function handleSaveRequest(recipe) {
    setSavePickerRecipe(recipe);
  }

  async function logRecipeAsMeal(mealType) {
    const recipe = savePickerRecipe;
    if (!recipe || savingMeal || !addMeal) return;
    setSavingMeal(true);
    setSavingType(mealType);
    const now = new Date();
    const p = recipe.macros?.protein ?? 0;
    const c = recipe.macros?.carbs ?? 0;
    const f = recipe.macros?.fat ?? 0;
    const meal = {
      name: recipe.name,
      calories: recipe.calories ?? 0,
      protein: p,
      carbs: c,
      fat: f,
      macros: { protein: p, carbs: c, fat: f },
      mealType,
      meal: MEAL_LABELS[mealType],
      time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      loggedAt: now.toISOString(),
      dateKey: now.toISOString().slice(0, 10),
      source: "recipe",
      emoji: recipe.emoji ?? null,
      recipeId: recipe._dbId ?? recipe.id,
    };
    try {
      await addMeal(meal);
      setSavePickerRecipe(null);
      setResultModal({
        visible: true,
        variant: "success",
        message: `${recipe.name} added to ${MEAL_LABELS[mealType]}.`,
      });
    } catch (err) {
      setSavePickerRecipe(null);
      setResultModal({
        visible: true,
        variant: "error",
        message: err?.message || "Could not log this recipe. Try again.",
      });
    } finally {
      setSavingMeal(false);
      setSavingType(null);
    }
  }

  const isSearching = query.trim().length > 0;
  const filteredResults =
    selectedCategory === "all"
      ? aiResults
      : aiResults.filter((r) => r.category === selectedCategory);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: DEFAULT_BG }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image source={leafImg} style={styles.headerLeaf} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>
            {t("explore.title")}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {t("explore.subtitle")}
          </Text>
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={ms(18)} color={colors.textMuted} />
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
                size={ms(18)}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category pills shown in both browse + search modes (drive the deck too). */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const icon = CAT_ICON[cat.id];
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isActive ? colors.tintOrange : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleCategoryChange(cat.id)}
                activeOpacity={0.7}
              >
                {icon && (
                  <Image source={icon} style={styles.pillIcon} resizeMode="contain" />
                )}
                <Text
                  style={[
                    styles.pillText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                    isActive && { fontWeight: FONTS.semibold },
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
            <TouchableOpacity
              style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate("Plan")}
              activeOpacity={0.7}
            >
              <View style={[styles.planIconWrap, { backgroundColor: colors.tintGreen }]}>
                <Image source={calendarPlanImg} style={styles.planIcon} resizeMode="contain" />
              </View>
              <View style={styles.planText}>
                <Text style={[styles.planTitle, { color: colors.text }]}>
                  {t("explore.planTitle")}
                </Text>
                <Text style={[styles.planSub, { color: colors.textMuted }]}>
                  {t("explore.planSub")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={ms(16)} color={colors.textMuted} />
            </TouchableOpacity>

            {swipeCards.length > 0 ? (
              <View style={styles.deckSection}>
                <PostCarousel
                  cards={swipeCards}
                  totalCount={totalDeckCount}
                  session={session}
                  images={preloadedImages}
                  colors={colors}
                  savedNames={savedNames}
                  onSave={handleSaveRequest}
                  onOpen={handleCardInfo}
                  onLoadMore={() => loadMoreDeck(session)}
                />
              </View>
            ) : swipeError ? (
              <View style={styles.deckContainer}>
                <View
                  style={[
                    styles.emptyDeck,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      padding: ms(20),
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={ms(32)}
                    color="#FF6B35"
                  />
                  <Text
                    style={{
                      color: colors.text,
                      marginTop: SPACING.sm,
                      fontSize: FONT_SIZES.label,
                      fontWeight: "500",
                      textAlign: "center",
                    }}
                  >
                    {swipeError}
                  </Text>
                  <TouchableOpacity
                    onPress={loadSwipeDeck}
                    style={{
                      marginTop: ms(12),
                      paddingHorizontal: SPACING.md,
                      paddingVertical: ms(6),
                      borderRadius: ms(20),
                      backgroundColor: colors.text,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.background,
                        fontSize: FONT_SIZES.small,
                        fontWeight: "600",
                      }}
                    >
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : !deckResolved ? (
              <CarouselSkeleton colors={colors} />
            ) : (
              <View style={styles.deckContainer}>
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
                      { color: colors.text, marginTop: SPACING.sm },
                    ]}
                  >
                    No recipes available
                  </Text>
                </View>
              </View>
            )}

            {dbLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.text} />
              </View>
            ) : (
              recipeSections.map((section) => (
                <RecipeCarousel
                  key={section.title}
                  title={section.title}
                  items={section.items}
                  session={session}
                  colors={colors}
                  t={t}
                  onStartCooking={handleStartCooking}
                  savedNames={savedNames}
                  onSave={handleSaveRequest}
                  onSeeAll={() =>
                    navigation.navigate("RecipeList", {
                      title: section.title,
                      items: section.items,
                    })
                  }
                />
              ))
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

      {/* Save → choose meal slot (same picker as SearchFoodScreen) */}
      <Modal
        visible={!!savePickerRecipe}
        transparent
        animationType="fade"
        onRequestClose={() => !savingMeal && setSavePickerRecipe(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !savingMeal && setSavePickerRecipe(null)}
        >
          <View
            style={[
              styles.mealPickerModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.mealPickerTitle, { color: colors.text }]}>
              {t("explore.saveTo", { defaultValue: "Save to" })}
            </Text>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt}
                style={[
                  styles.mealPickerOption,
                  savingMeal && savingType !== mt && { opacity: 0.4 },
                ]}
                disabled={savingMeal}
                onPress={() => logRecipeAsMeal(mt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.mealPickerOptionText, { color: colors.text }]}
                >
                  {t(`mealType.${mt}`, { defaultValue: MEAL_LABELS[mt] })}
                </Text>
                {savingType === mt ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="add" size={ms(18)} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success / error after logging */}
      <CommonAlertModal
        visible={resultModal.visible}
        variant={resultModal.variant}
        title={
          resultModal.variant === "success"
            ? t("common.success", { defaultValue: "Logged!" })
            : t("common.error", { defaultValue: "Error" })
        }
        message={resultModal.message}
        primaryText={t("common.ok", { defaultValue: "Done" })}
        onPrimary={() => setResultModal((m) => ({ ...m, visible: false }))}
      />

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

// Full-bleed Instagram-style aspect — shorter than the old tall deck card.
const CARD_HEIGHT = Math.round(SCREEN_WIDTH * 0.95);
// Horizontal carousel sizing — keep the See-All tile identical to a recipe card.
const HCARD_WIDTH = ms(240);
const HCARD_COLLAPSED_HEIGHT = ms(210);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, marginBottom: ms(18) },
  headerLeaf: { position: "absolute", right: ms(8), top: ms(4), width: ms(90), height: ms(90), opacity: 0.6 },
  title: { fontSize: ms(30), fontWeight: FONTS.bold, letterSpacing: -0.5, marginBottom: SPACING.xs },
  headerSubtitle: { fontSize: FONT_SIZES.small, fontWeight: FONTS.regular },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(12),
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.body, fontWeight: FONTS.regular, padding: 0 },

  pillsRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: ms(20) },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    paddingHorizontal: ms(14),
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  pillIcon: { width: ms(15), height: ms(15) },
  pillText: { fontSize: FONT_SIZES.small, fontWeight: FONTS.medium },

  // Swipe deck
  deckContainer: {
    marginHorizontal: SPACING.lg,
    height: CARD_HEIGHT + ms(12),
    marginBottom: ms(28),
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
  cardEmoji: { fontSize: ms(90) },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardHeader: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    top: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  badgeContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    color: "#111",
    fontSize: ms(10),
    fontWeight: FONTS.semibold,
  },
  bookmarkBtn: {
    backgroundColor: "rgba(0,0,0,0.35)",
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { position: "absolute", left: SPACING.md, right: SPACING.md, bottom: SPACING.md },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: ms(8),
    marginBottom: ms(8),
  },
  cardName: {
    flex: 1,
    fontSize: ms(22),
    fontWeight: FONTS.bold,
    color: "#fff",
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ms(10),
  },
  cardSaveBtn: {
    backgroundColor: "rgba(0,0,0,0.4)",
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: FONT_SIZES.caption,
  },
  metaDivider: {
    color: "rgba(255,255,255,0.4)",
    marginHorizontal: ms(6),
  },
  caloriesBadge: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
  },
  caloriesText: {
    color: "#fff",
    fontSize: FONT_SIZES.caption,
    fontWeight: FONTS.semibold,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: ms(10),
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
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.bold,
  },
  macroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: ms(9),
    marginTop: 1,
  },
  macroColDivider: {
    width: 1,
    height: ms(20),
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  stamp: {
    position: "absolute",
    top: ms(32),
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderWidth: 3,
    borderRadius: RADIUS.sm,
    zIndex: 200,
  },
  stampLike: {
    right: ms(24),
    borderColor: "#22C55E",
    transform: [{ rotate: "15deg" }],
  },
  stampSkip: {
    left: ms(24),
    borderColor: "#EF4444",
    transform: [{ rotate: "-15deg" }],
  },
  stampText: {
    color: "#fff",
    fontSize: ms(22),
    fontWeight: FONTS.bold,
    letterSpacing: 2,
  },

  controls: {
    position: "absolute",
    bottom: SPACING.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: ms(18),
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
    gap: ms(10),
  },
  deckEmoji: { fontSize: ms(56) },
  deckText: { fontSize: ms(16), fontWeight: FONTS.semibold },
  resetBtn: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  resetText: { fontSize: FONT_SIZES.label, fontWeight: FONTS.medium },

  // Trending
  trendingCard: {
    width: ms(160),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  trendingImage: { width: "100%", height: vs(100) },
  trendingMeta: { padding: ms(10), gap: ms(2) },
  trendingName: { fontSize: FONT_SIZES.small, fontWeight: FONTS.semibold },
  trendingSub: { fontSize: FONT_SIZES.caption },

  // Plan card + library
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(13),
    gap: ms(12),
    marginBottom: ms(18),
  },
  planIconWrap: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  planIcon: { width: ms(22), height: ms(22) },
  planText: { flex: 1 },
  planTitle: { fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold, marginBottom: ms(2) },
  planSub: { fontSize: ms(12), fontWeight: FONTS.regular },

  sectionLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: SPACING.lg,
    marginBottom: ms(12),
  },
  listCard: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg },

  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(14),
    gap: ms(12),
  },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold, marginBottom: ms(3) },
  recipeMeta: { fontSize: ms(12), fontWeight: FONTS.regular },
  recipeRight: { alignItems: "flex-end", gap: ms(3) },
  recipeCalories: { fontSize: FONT_SIZES.small, fontWeight: FONTS.regular },
  chevron: { marginTop: 1 },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: ms(76) },

  emptyState: {
    alignItems: "center",
    paddingTop: SPACING.xxl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyEmoji: { fontSize: ms(48), marginBottom: SPACING.md },
  emptyTitle: {
    fontSize: FONT_SIZES.button,
    fontWeight: FONTS.semibold,
    marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.regular,
    textAlign: "center",
    lineHeight: ms(20),
  },

  loadingState: { alignItems: "center", paddingTop: SPACING.xxl * 2, gap: SPACING.md },
  loadingText: { fontSize: FONT_SIZES.label, fontWeight: FONTS.regular },

  // Category carousels
  carouselHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    marginBottom: ms(14),
  },
  carouselTitle: { fontSize: ms(18), fontWeight: FONTS.bold, letterSpacing: -0.3 },
  seeAll: { fontSize: FONT_SIZES.small, fontWeight: FONTS.medium },

  hCard: {
    width: HCARD_WIDTH,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  hCardImg: { width: "100%", height: ms(130) },
  hBookmark: {
    position: "absolute",
    top: ms(10),
    right: ms(10),
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  hCardBody: { padding: ms(14) },
  hDivider: { height: StyleSheet.hairlineWidth, marginTop: ms(12) },
  hBar: { height: ms(6), borderRadius: ms(3), overflow: "hidden", marginBottom: ms(14) },
  hBarFill: { flex: 1, flexDirection: "row" },
  hCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  hCardName: { flex: 1, fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold },
  hCardMeta: { fontSize: ms(12), marginTop: ms(3) },
  hCardKcal: { fontSize: FONT_SIZES.body, fontWeight: FONTS.bold, marginTop: ms(10), marginBottom: SPACING.sm },
  hMacroList: { gap: ms(6), marginBottom: ms(14) },
  hMacroRow: { flexDirection: "row", alignItems: "center" },
  hDot: { width: ms(8), height: ms(8), borderRadius: ms(4), marginRight: SPACING.sm },
  hMacroLabel: { flex: 1, fontSize: FONT_SIZES.small },
  hMacroVal: { fontSize: FONT_SIZES.small, fontWeight: FONTS.semibold },
  startBtn: {
    borderRadius: RADIUS.full,
    paddingVertical: ms(11),
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnText: { fontSize: FONT_SIZES.label, fontWeight: FONTS.bold, color: "#FFFFFF" },

  // "See All" tile — same footprint as a recipe card, terminates the carousel.
  seeAllCard: {
    width: HCARD_WIDTH,
    height: HCARD_COLLAPSED_HEIGHT,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: ms(10),
  },
  seeAllIconWrap: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: "center",
    justifyContent: "center",
  },
  seeAllCardText: { fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold },

  // Instagram-style paged carousel
  deckSection: { marginBottom: ms(28) },
  postPage: { width: SCREEN_WIDTH },
  postCard: {
    width: "100%",
    height: CARD_HEIGHT,
    overflow: "hidden",
  },
  skeletonBlock: { flex: 1 },
  skeletonInfo: { padding: SPACING.md, gap: ms(8) },
  skeletonLineLg: { height: ms(20), width: "60%", borderRadius: ms(6) },
  skeletonLineSm: { height: ms(14), width: "40%", borderRadius: ms(6) },
  pageCounter: {
    position: "absolute",
    top: ms(12),
    right: ms(12),
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: RADIUS.full,
  },
  pageCounterText: {
    color: "#fff",
    fontSize: FONT_SIZES.caption,
    fontWeight: FONTS.semibold,
  },

  // Save → meal-type picker modal (mirrors SearchFoodScreen)
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
