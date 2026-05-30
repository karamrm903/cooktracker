import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import RecipeAvatar from '../components/RecipeAvatar';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useSavedMeals } from '../context/SavedMealsContext';
import { ExpandedNutrition } from '../components/NutritionExpansion';
import SaveModal from '../components/SaveModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = [
  { id: 'All',       label: 'All'       },
  { id: 'Breakfast', label: 'Breakfast' },
  { id: 'Lunch',     label: 'Lunch'     },
  { id: 'Dinner',    label: 'Dinner'    },
  { id: 'Snack',     label: 'Snacks'    },
];

export default function SavedMealsScreen() {
  const { colors } = useTheme();
  const { savedMeals, loading, saveMeal, unsaveMeal } = useSavedMeals();
  const [selected,   setSelected]   = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [modalMeal,  setModalMeal]  = useState(null);
  const [toastText,  setToastText]  = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const meals =
    selected === 'All'
      ? savedMeals
      : savedMeals.filter((m) => m.category === selected);

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
    setSelected(id);
    setExpandedId(null);
  }

  async function handleSave(category) {
    await saveMeal(modalMeal.id, category);
    setModalMeal(null);
    showToast(`Moved to ${category}`);
  }

  async function handleRemove() {
    await unsaveMeal(modalMeal.id);
    setModalMeal(null);
    setExpandedId(null);
    showToast('Removed from Saved');
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Saved</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {meals.length} {meals.length === 1 ? 'recipe' : 'recipes'}
          </Text>
        </View>

        {/* ── Category pills ───────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selected === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.pill,
                  isActive
                    ? { backgroundColor: colors.text }
                    : { backgroundColor: colors.surfaceAlt },
                ]}
                activeOpacity={0.7}
                onPress={() => handleCategoryChange(cat.id)}
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

        {/* ── Meal list or empty state ─────────────────────────────────── */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 80 }} color={colors.textMuted} />
        ) : meals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔖</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No saved recipes
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {selected === 'All'
                ? 'Recipes you save will appear here'
                : `No ${CATEGORIES.find((c) => c.id === selected)?.label.toLowerCase()} recipes saved yet`}
            </Text>
          </View>
        ) : (
          <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
            {meals.map((meal, index) => {
              const isExpanded = expandedId === meal.id;
              const prevExpanded = index > 0 && expandedId === meals[index - 1]?.id;
              return (
                <React.Fragment key={meal.id}>
                  {index > 0 && !prevExpanded && (
                    <View style={[styles.hairline, { backgroundColor: colors.border }]} />
                  )}

                  {/* Row */}
                  <TouchableOpacity
                    style={styles.mealRow}
                    activeOpacity={0.65}
                    onPress={() => handleToggle(meal.id)}
                  >
                    <RecipeAvatar name={meal.name} size={44} />
                    <View style={styles.mealInfo}>
                      <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
                        {meal.name}
                      </Text>
                      <Text style={[styles.mealMeta, { color: colors.textMuted }]}>
                        {meal.category}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setModalMeal(meal)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.bookmarkBtn}
                    >
                      <Ionicons name="bookmark" size={17} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.mealRight}>
                      <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>
                        {meal.calories} kcal
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={12}
                        color={colors.textMuted}
                        style={styles.chevron}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded nutrition panel */}
                  {isExpanded && meal.macros && (
                    <ExpandedNutrition item={meal} colors={colors} buttonLabel="Start Cooking" />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Save modal ──────────────────────────────────────────────── */}
      <SaveModal
        meal={modalMeal}
        visible={!!modalMeal}
        onClose={() => setModalMeal(null)}
        onSave={handleSave}
        onRemove={handleRemove}
        savedCategory={modalMeal?.category ?? null}
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
  safe:    { flex: 1 },
  scroll:  { flex: 1 },
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: FONTS.regular,
  },

  // ── Category pills ────────────────────────────────────────────────
  pillsRow: {
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: 24,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  pillText: {
    fontSize: 13,
    fontWeight: FONTS.medium,
  },

  // ── List card ─────────────────────────────────────────────────────
  listCard: {
    marginHorizontal: 24,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  mealRow: {
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
  emojiText:    { fontSize: 22 },
  mealInfo:     { flex: 1 },
  mealName:     { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 3 },
  mealMeta:     { fontSize: 12, fontWeight: FONTS.regular },
  bookmarkBtn:  { padding: 2 },
  mealRight:    { alignItems: 'flex-end', gap: 3 },
  mealCalories: { fontSize: 13, fontWeight: FONTS.regular },
  chevron:      { marginTop: 1 },
  hairline:     { height: StyleSheet.hairlineWidth, marginLeft: 76 },

  // ── Empty state ───────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
    paddingHorizontal: 24,
  },
  emptyEmoji:  { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle:  { fontSize: 17, fontWeight: FONTS.semibold, marginBottom: SPACING.xs },
  emptySub:    { fontSize: 14, fontWeight: FONTS.regular, textAlign: 'center' },

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
