import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useSavedMeals } from '../context/SavedMealsContext';
import { RECIPES } from '../data/placeholder';
import { ExpandedNutrition } from '../components/NutritionExpansion';
import SaveModal from '../components/SaveModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Data (dessert excluded) ───────────────────────────────────────────────────
const ALL_RECIPES = RECIPES.filter((r) => r.category !== 'dessert');

const isQuick = (r) => {
  const m = r.time.match(/^(\d+)\s*min$/);
  return (m && parseInt(m[1], 10) <= 15) ||
    r.tags?.some((t) => t === 'Quick' || t === 'No Cook');
};

const SECTIONS = [
  {
    id: 'trending',
    title: 'Trending Now',
    icon: 'flame-outline',
    recipes: [...ALL_RECIPES]
      .filter((r) => r.rating >= 4.6)
      .sort((a, b) => b.reviews - a.reviews),
  },
  {
    id: 'high_protein',
    title: 'High Protein',
    icon: 'barbell-outline',
    recipes: ALL_RECIPES.filter((r) => r.tags?.includes('High Protein')),
  },
  {
    id: 'quick',
    title: 'Quick & Easy',
    icon: 'timer-outline',
    recipes: ALL_RECIPES.filter(isQuick),
  },
  {
    id: 'healthy_dinners',
    title: 'Healthy Dinners',
    icon: 'moon-outline',
    recipes: ALL_RECIPES.filter((r) => r.category === 'dinner'),
  },
];

const CATEGORIES = [
  { id: 'all',       label: 'All'       },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch',     label: 'Lunch'     },
  { id: 'dinner',    label: 'Dinner'    },
  { id: 'snack',     label: 'Snacks'    },
];

// ── Recipe row (accordion + bookmark) ────────────────────────────────────────
function RecipeRow({ item, isLast, isExpanded, onToggle, onBookmark, isSaved, colors }) {
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
          <Text style={[styles.recipeName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.recipeMeta, { color: colors.textMuted }]}>
            {item.time} · ⭐ {item.rating}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onBookmark}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.bookmarkBtn}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={17}
            color={isSaved ? colors.text : colors.textMuted}
          />
        </TouchableOpacity>
        <View style={styles.recipeRight}>
          <Text style={[styles.recipeCalories, { color: colors.textSecondary }]}>
            {item.calories} kcal
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={colors.textMuted}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && item.macros && (
        <ExpandedNutrition item={item} colors={colors} buttonLabel="Start Cooking" />
      )}

      {!isLast && !isExpanded && (
        <View style={[styles.hairline, { backgroundColor: colors.border }]} />
      )}
    </>
  );
}

// ── Recipe list card ──────────────────────────────────────────────────────────
function RecipeListCard({ recipes, expandedId, onToggle, onBookmark, isSavedFn, colors }) {
  return (
    <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
      {recipes.map((item, i) => (
        <RecipeRow
          key={item.id}
          item={item}
          isLast={i === recipes.length - 1}
          isExpanded={expandedId === item.id}
          onToggle={() => onToggle(item.id)}
          onBookmark={() => onBookmark(item)}
          isSaved={isSavedFn(item.name)}
          colors={colors}
        />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ExploreScreen({ navigation }) {
  const { colors } = useTheme();
  const { isSaved, getSavedCategory, saveMeal, unsaveMeal } = useSavedMeals();
  const [query,            setQuery]            = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId,       setExpandedId]       = useState(null);
  const [modalMeal,        setModalMeal]        = useState(null);
  const [toastText,        setToastText]        = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const isSearching = query.trim().length > 0;

  function showToast(text) {
    setToastText(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setToastText(null));
  }

  function handleToggle(id) {
    LayoutAnimation.configureNext({
      duration: 260,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleCategoryChange(id) {
    setSelectedCategory(id);
    setExpandedId(null);
  }

  function handleQueryChange(text) {
    setQuery(text);
    setExpandedId(null);
  }

  function handleSave(category) {
    saveMeal(modalMeal, category);
    setModalMeal(null);
    showToast(`Saved to ${category}`);
  }

  function handleRemove() {
    unsaveMeal(modalMeal.name);
    setModalMeal(null);
    showToast('Removed from Saved');
  }

  const searchResults = ALL_RECIPES.filter((r) => {
    const matchesQuery = r.name.toLowerCase().includes(query.toLowerCase());
    const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  const browseList =
    selectedCategory === 'all'
      ? null
      : ALL_RECIPES.filter((r) => r.category === selectedCategory);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Explore</Text>
        </View>

        {/* ── AI Search bar ────────────────────────────────────────────── */}
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search any food or recipe..."
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
          />
          {isSearching ? (
            <TouchableOpacity
              onPress={() => handleQueryChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          )}
        </View>

        {/* ── Category pills ───────────────────────────────────────────── */}
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
                  { backgroundColor: isActive ? colors.text : colors.surfaceAlt },
                ]}
                onPress={() => handleCategoryChange(cat.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isActive ? colors.background : colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Plan My Meals card ──────────────────────────────────────── */}
        {!isSearching && (
          <TouchableOpacity
            style={[styles.planCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Plan')}
            activeOpacity={0.7}
          >
            <View style={[styles.planIconWrap, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.planText}>
              <Text style={[styles.planTitle, { color: colors.text }]}>Plan My Meals</Text>
              <Text style={[styles.planSub, { color: colors.textMuted }]}>
                Build a full day based on your goals
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ── Content ─────────────────────────────────────────────────── */}
        {isSearching ? (
          searchResults.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
              </Text>
              <RecipeListCard
                recipes={searchResults}
                expandedId={expandedId}
                onToggle={handleToggle}
                onBookmark={setModalMeal}
                isSavedFn={isSaved}
                colors={colors}
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Try a different food or recipe name
              </Text>
            </View>
          )
        ) : browseList !== null ? (
          browseList.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {browseList.length} {browseList.length === 1 ? 'recipe' : 'recipes'}
              </Text>
              <RecipeListCard
                recipes={browseList}
                expandedId={expandedId}
                onToggle={handleToggle}
                onBookmark={setModalMeal}
                isSavedFn={isSaved}
                colors={colors}
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                More recipes coming soon
              </Text>
            </View>
          )
        ) : (
          SECTIONS.map((section) =>
            section.recipes.length === 0 ? null : (
              <View key={section.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name={section.icon}
                    size={16}
                    color={colors.textSecondary}
                    style={styles.sectionIcon}
                  />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {section.title}
                  </Text>
                </View>
                <RecipeListCard
                  recipes={section.recipes}
                  expandedId={expandedId}
                  onToggle={handleToggle}
                  onBookmark={setModalMeal}
                  isSavedFn={isSaved}
                  colors={colors}
                />
              </View>
            )
          )
        )}
      </ScrollView>

      {/* ── Save modal ──────────────────────────────────────────────── */}
      <SaveModal
        meal={modalMeal}
        visible={!!modalMeal}
        onClose={() => setModalMeal(null)}
        onSave={handleSave}
        onRemove={handleRemove}
        savedCategory={modalMeal ? getSavedCategory(modalMeal.name) : null}
        colors={colors}
      />

      {/* ── Toast ───────────────────────────────────────────────────── */}
      {toastText && (
        <Animated.View
          style={[styles.toast, { backgroundColor: colors.text, opacity: toastAnim }]}
          pointerEvents="none"
        >
          <Text style={[styles.toastText, { color: colors.background }]}>{toastText}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  // ── Header ────────────────────────────────────────────────────────
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

  // ── Search bar ────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // ── Category pills ────────────────────────────────────────────────
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

  // ── Plan My Meals card ────────────────────────────────────────────
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  planText: { flex: 1 },
  planTitle: { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 2 },
  planSub:   { fontSize: 12, fontWeight: FONTS.regular },

  // ── Sections ──────────────────────────────────────────────────────
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionIcon: { marginRight: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: FONTS.bold,
    letterSpacing: -0.2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 12,
  },

  // ── List card ─────────────────────────────────────────────────────
  listCard: {
    marginHorizontal: 24,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },

  // ── Recipe row ────────────────────────────────────────────────────
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText:      { fontSize: 22 },
  recipeInfo:     { flex: 1 },
  recipeName:     { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 3 },
  recipeMeta:     { fontSize: 12, fontWeight: FONTS.regular },
  bookmarkBtn:    { padding: 2 },
  recipeRight:    { alignItems: 'flex-end', gap: 3 },
  recipeCalories: { fontSize: 13, fontWeight: FONTS.regular },
  chevron:        { marginTop: 1 },
  hairline:       { height: StyleSheet.hairlineWidth, marginLeft: 76 },

  // ── Empty state ───────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
    paddingHorizontal: 24,
  },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 17, fontWeight: FONTS.semibold, marginBottom: SPACING.xs },
  emptySub:   { fontSize: 14, fontWeight: FONTS.regular, textAlign: 'center' },

  // ── Toast ─────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  toastText: { fontSize: 14, fontWeight: FONTS.medium },
});
