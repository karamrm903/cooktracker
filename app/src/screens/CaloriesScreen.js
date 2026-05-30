import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { TODAY_STATS } from '../data/placeholder';
import { MacroBar, ExpandedNutrition, C_PROTEIN, C_CARBS, C_FAT } from '../components/NutritionExpansion';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Goals ─────────────────────────────────────────────────────────────────────
const GOALS = {
  calories: TODAY_STATS.caloriesGoal,   // 2000
  protein:  TODAY_STATS.protein.goal,   // 120
  carbs:    TODAY_STATS.carbs.goal,     // 250
  fat:      TODAY_STATS.fat.goal,       // 65
};

const CATEGORY_ICONS = {
  Breakfast: '🌅',
  Lunch:     '☀️',
  Dinner:    '🌙',
  Snack:     '🍿',
};

// ── Seed week data ─────────────────────────────────────────────────────────────
const INITIAL_WEEK_DATA = {
  Monday: {
    date: 'Mar 3', protein: 118, carbs: 210, fat: 58,
    meals: [
      { id: 'mon1', name: 'Granola Parfait',        category: 'Breakfast', calories: 380, emoji: '🥣', macros: { protein: 12, carbs: 68, fat:  8 } },
      { id: 'mon2', name: 'Turkey Wrap',             category: 'Lunch',     calories: 520, emoji: '🫓', macros: { protein: 34, carbs: 52, fat: 18 } },
      { id: 'mon3', name: 'Steak & Roasted Veggies', category: 'Dinner',    calories: 750, emoji: '🥩', macros: { protein: 58, carbs: 42, fat: 38 } },
      { id: 'mon4', name: 'Mixed Nuts',              category: 'Snack',     calories: 200, emoji: '🥜', macros: { protein:  6, carbs: 14, fat: 16 } },
    ],
  },
  Tuesday: {
    date: 'Mar 4', protein: 135, carbs: 268, fat: 74,
    meals: [
      { id: 'tue1', name: 'Avocado Toast with Eggs', category: 'Breakfast', calories: 450, emoji: '🥑', macros: { protein: 14, carbs: 48, fat: 22 } },
      { id: 'tue2', name: 'Mediterranean Bowl',      category: 'Lunch',     calories: 560, emoji: '🫙', macros: { protein: 22, carbs: 72, fat: 18 } },
      { id: 'tue3', name: 'Chicken Tikka Masala',    category: 'Dinner',    calories: 640, emoji: '🍛', macros: { protein: 48, carbs: 62, fat: 22 } },
      { id: 'tue4', name: 'Greek Yogurt & Honey',    category: 'Snack',     calories: 280, emoji: '🍯', macros: { protein: 18, carbs: 42, fat:  8 } },
      { id: 'tue5', name: 'Dark Chocolate',           category: 'Snack',     calories: 220, emoji: '🍫', macros: { protein:  4, carbs: 28, fat: 14 } },
    ],
  },
  Wednesday: {
    date: 'Mar 5', protein: 96, carbs: 192, fat: 51,
    meals: [
      { id: 'wed1', name: 'Banana Smoothie',         category: 'Breakfast', calories: 310, emoji: '🍌', macros: { protein:  8, carbs: 58, fat:  4 } },
      { id: 'wed2', name: 'Vegetable Soup',           category: 'Lunch',     calories: 380, emoji: '🥣', macros: { protein: 14, carbs: 52, fat: 10 } },
      { id: 'wed3', name: 'Salmon Fillet',            category: 'Dinner',    calories: 680, emoji: '🐟', macros: { protein: 52, carbs: 28, fat: 32 } },
      { id: 'wed4', name: 'Hummus & Crackers',        category: 'Snack',     calories: 390, emoji: '🫓', macros: { protein: 14, carbs: 48, fat: 14 } },
    ],
  },
  Thursday: {
    date: 'Mar 6', protein: 125, carbs: 228, fat: 61,
    meals: [
      { id: 'thu1', name: 'Scrambled Eggs',           category: 'Breakfast', calories: 320, emoji: '🍳', macros: { protein: 22, carbs:  8, fat: 24 } },
      { id: 'thu2', name: 'Caesar Salad',              category: 'Lunch',     calories: 490, emoji: '🥗', macros: { protein: 24, carbs: 32, fat: 22 } },
      { id: 'thu3', name: 'Beef Stir Fry',             category: 'Dinner',    calories: 720, emoji: '🥘', macros: { protein: 52, carbs: 58, fat: 28 } },
      { id: 'thu4', name: 'Protein Bar',               category: 'Snack',     calories: 240, emoji: '🍫', macros: { protein: 20, carbs: 28, fat:  8 } },
      { id: 'thu5', name: 'Yogurt',                    category: 'Snack',     calories: 150, emoji: '🥛', macros: { protein: 12, carbs: 18, fat:  4 } },
    ],
  },
  Friday: {
    date: 'Mar 7', protein: 110, carbs: 262, fat: 70,
    meals: [
      { id: 'fri1', name: 'Pancakes',                 category: 'Breakfast', calories: 520, emoji: '🥞', macros: { protein: 12, carbs: 82, fat: 18 } },
      { id: 'fri2', name: 'Grilled Chicken Wrap',     category: 'Lunch',     calories: 580, emoji: '🌯', macros: { protein: 42, carbs: 48, fat: 22 } },
      { id: 'fri3', name: 'Pasta Bolognese',           category: 'Dinner',    calories: 680, emoji: '🍝', macros: { protein: 32, carbs: 92, fat: 22 } },
      { id: 'fri4', name: 'Nuts & Dark Chocolate',    category: 'Snack',     calories: 190, emoji: '🍫', macros: { protein:  6, carbs: 16, fat: 14 } },
      { id: 'fri5', name: 'Apple',                     category: 'Snack',     calories:  80, emoji: '🍎', macros: { protein:  0, carbs: 22, fat:  0 } },
    ],
  },
  Saturday: {
    date: 'Mar 8', protein: 148, carbs: 295, fat: 90,
    meals: [
      { id: 'sat1', name: 'Eggs Benedict',             category: 'Breakfast', calories: 680, emoji: '🍳', macros: { protein: 28, carbs: 48, fat: 38 } },
      { id: 'sat2', name: 'BBQ Burger',                category: 'Lunch',     calories: 750, emoji: '🍔', macros: { protein: 48, carbs: 62, fat: 42 } },
      { id: 'sat3', name: 'Chicken Parmesan',          category: 'Dinner',    calories: 620, emoji: '🍗', macros: { protein: 48, carbs: 52, fat: 28 } },
      { id: 'sat4', name: 'Chips & Guacamole',         category: 'Snack',     calories: 250, emoji: '🥑', macros: { protein:  4, carbs: 32, fat: 18 } },
    ],
  },
  Sunday: {
    date: 'Mar 9', protein: TODAY_STATS.protein.consumed, carbs: TODAY_STATS.carbs.consumed, fat: TODAY_STATS.fat.consumed,
    isToday: true,
    meals: [
      { id: 'sun1', name: 'Greek Yogurt Parfait',      category: 'Breakfast', calories: 380, emoji: '🥣', macros: { protein: 18, carbs: 52, fat:  8 } },
      { id: 'sun2', name: 'Grilled Chicken Salad',     category: 'Lunch',     calories: 520, emoji: '🥗', macros: { protein: 48, carbs: 28, fat: 22 } },
      { id: 'sun3', name: 'Apple & Almond Butter',     category: 'Snack',     calories: 220, emoji: '🍎', macros: { protein:  6, carbs: 24, fat: 12 } },
      { id: 'sun4', name: 'Protein Shake',             category: 'Snack',     calories: 220, emoji: '🥛', macros: { protein: 24, carbs: 28, fat:  4 } },
    ],
  },
};

const DAY_ORDER = ['Sunday', 'Saturday', 'Friday', 'Thursday', 'Wednesday', 'Tuesday', 'Monday'];

// ── Add Food Modal ────────────────────────────────────────────────────────────
const SAVE_CATS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const EMPTY_FORM = { name: '', calories: '', protein: '', carbs: '', fat: '', category: 'Breakfast' };

function AddFoodModal({ visible, onClose, onAdd, colors }) {
  const [showing, setShowing] = useState(false);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim    = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setForm(EMPTY_FORM);
      setShowing(true);
      backdropAnim.setValue(0);
      sheetAnim.setValue(500);
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(sheetAnim,    { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetAnim,    { toValue: 500, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setShowing(false); });
    }
  }, [visible]);

  function handleAdd() {
    const name = form.name.trim();
    const calories = parseInt(form.calories, 10);
    if (!name || isNaN(calories) || calories <= 0) return;
    onAdd({
      name,
      calories,
      macros: {
        protein: parseInt(form.protein, 10) || 0,
        carbs:   parseInt(form.carbs,   10) || 0,
        fat:     parseInt(form.fat,     10) || 0,
      },
      category: form.category,
      emoji:    CATEGORY_ICONS[form.category] ?? '🍽️',
      id:       Date.now().toString(),
    });
  }

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  if (!showing) return null;

  return (
    <Modal transparent animationType="none" visible={showing} onRequestClose={onClose}>
      <Animated.View style={[af.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[af.sheet, { backgroundColor: colors.surface, transform: [{ translateY: sheetAnim }] }]}>
        <View style={[af.handle, { backgroundColor: colors.border }]} />
        <Text style={[af.title, { color: colors.textMuted }]}>Add Food</Text>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Name */}
          <Text style={[af.label, { color: colors.textSecondary }]}>Food name</Text>
          <TextInput
            style={[af.input, { color: colors.text, borderBottomColor: colors.border }]}
            placeholder="e.g. Homemade Pasta"
            placeholderTextColor={colors.placeholder}
            value={form.name}
            onChangeText={set('name')}
            returnKeyType="next"
          />

          {/* Calories */}
          <Text style={[af.label, { color: colors.textSecondary, marginTop: 20 }]}>Calories</Text>
          <TextInput
            style={[af.input, { color: colors.text, borderBottomColor: colors.border }]}
            placeholder="kcal"
            placeholderTextColor={colors.placeholder}
            value={form.calories}
            onChangeText={set('calories')}
            keyboardType="numeric"
            returnKeyType="next"
          />

          {/* Macros row */}
          <Text style={[af.label, { color: colors.textSecondary, marginTop: 20 }]}>Macros (optional)</Text>
          <View style={af.macroInputRow}>
            {[
              { key: 'protein', label: 'Protein', color: C_PROTEIN },
              { key: 'carbs',   label: 'Carbs',   color: C_CARBS   },
              { key: 'fat',     label: 'Fat',      color: C_FAT     },
            ].map(({ key, label, color }) => (
              <View key={key} style={af.macroInputCell}>
                <View style={[af.macroDot, { backgroundColor: color }]} />
                <Text style={[af.macroInputLabel, { color: colors.textMuted }]}>{label}</Text>
                <TextInput
                  style={[af.macroInput, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholder="0g"
                  placeholderTextColor={colors.placeholder}
                  value={form[key]}
                  onChangeText={set(key)}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>
            ))}
          </View>

          {/* Category */}
          <Text style={[af.label, { color: colors.textSecondary, marginTop: 20 }]}>Category</Text>
          <View style={af.catRow}>
            {SAVE_CATS.map((cat) => {
              const active = form.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[af.catPill, { backgroundColor: active ? colors.text : colors.surfaceAlt }]}
                  activeOpacity={0.7}
                  onPress={() => set('category')(cat)}
                >
                  <Text style={[af.catText, { color: active ? colors.background : colors.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Buttons */}
          <View style={af.btnRow}>
            <TouchableOpacity
              style={[af.btnCancel, { backgroundColor: colors.surfaceAlt }]}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={[af.btnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[af.btnAdd, { backgroundColor: colors.btnPrimary }]}
              activeOpacity={0.85}
              onPress={handleAdd}
            >
              <Text style={[af.btnAddText, { color: colors.btnPrimaryText }]}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const af = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 11, fontWeight: FONTS.semibold,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 20,
  },
  label: {
    fontSize: 12, fontWeight: FONTS.medium,
    letterSpacing: 0.2, marginBottom: 8,
  },
  input: {
    fontSize: 16, fontWeight: FONTS.regular,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  macroInputCell: { flex: 1 },
  macroDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 6 },
  macroInputLabel: { fontSize: 11, fontWeight: FONTS.medium, marginBottom: 6 },
  macroInput: {
    fontSize: 15, fontWeight: FONTS.regular,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  catText: { fontSize: 13, fontWeight: FONTS.medium },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  btnCancel: {
    flex: 1, paddingVertical: 14,
    borderRadius: RADIUS.full, alignItems: 'center',
  },
  btnCancelText: { fontSize: 15, fontWeight: FONTS.medium },
  btnAdd: {
    flex: 2, paddingVertical: 14,
    borderRadius: RADIUS.full, alignItems: 'center',
  },
  btnAddText: { fontSize: 15, fontWeight: FONTS.semibold },
});

// ── Day card ──────────────────────────────────────────────────────────────────
function DayCard({ dayName, data, isExpanded, onToggle, onAddFood, expandedMealId, onToggleMeal, colors }) {
  const totalCals = data.meals.reduce((s, m) => s + m.calories, 0);
  const diff      = totalCals - GOALS.calories;
  const isOver    = diff > 0;
  const diffText  = isOver ? `+${diff.toLocaleString()} kcal` : `${diff.toLocaleString()} kcal`;

  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View>
      {/* Tappable header */}
      <TouchableOpacity activeOpacity={0.7} onPress={onToggle} style={dc.header}>
        <View style={dc.headerLeft}>
          <Text style={[dc.dayName, { color: colors.text }]}>
            {dayName}
            {data.isToday
              ? <Text style={[dc.todayTag, { color: colors.textMuted }]}> · Today</Text>
              : null}
          </Text>
          <Text style={[dc.date, { color: colors.textMuted }]}>{data.date}</Text>
        </View>
        <View style={dc.headerRight}>
          <View style={dc.headerRightTop}>
            <Text style={[dc.calories, { color: colors.text }]}>
              {totalCals.toLocaleString()} kcal
            </Text>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </Animated.View>
          </View>
          <Text style={[dc.diff, { color: isOver ? colors.error : colors.success }]}>
            {diffText}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Macro bar + inline values */}
      <MacroBar protein={data.protein} carbs={data.carbs} fat={data.fat} />
      <View style={dc.macroRow}>
        {[
          { label: 'Protein', val: data.protein, color: C_PROTEIN },
          { label: 'Carbs',   val: data.carbs,   color: C_CARBS   },
          { label: 'Fat',     val: data.fat,      color: C_FAT     },
        ].map(({ label, val, color }) => (
          <View key={label} style={dc.macroItem}>
            <View style={[dc.dot, { backgroundColor: color }]} />
            <Text style={[dc.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[dc.macroVal, { color: colors.text }]}>{val}g</Text>
          </View>
        ))}
      </View>

      {/* Expanded meal list */}
      {isExpanded && (
        <View style={[dc.mealList, { borderTopColor: colors.border }]}>
          {data.meals.map((meal, index) => {
            const isMealExpanded = expandedMealId === meal.id;
            const prevExpanded   = index > 0 && expandedMealId === data.meals[index - 1]?.id;
            return (
              <React.Fragment key={meal.id}>
                {index > 0 && !prevExpanded && (
                  <View style={[dc.mealHairline, { backgroundColor: colors.borderLight }]} />
                )}

                {/* Meal row — tappable */}
                <TouchableOpacity
                  style={dc.mealRow}
                  activeOpacity={0.65}
                  onPress={() => onToggleMeal(meal.id)}
                >
                  <Text style={dc.mealEmoji}>{meal.emoji}</Text>
                  <View style={dc.mealInfo}>
                    <Text style={[dc.mealName, { color: colors.text }]} numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <Text style={[dc.mealMeta, { color: colors.textMuted }]}>
                      {CATEGORY_ICONS[meal.category]} {meal.category}
                    </Text>
                  </View>
                  <View style={dc.mealRight}>
                    <Text style={[dc.mealCals, { color: colors.textSecondary }]}>
                      {meal.calories} kcal
                    </Text>
                    <Ionicons
                      name={isMealExpanded ? 'chevron-up' : 'chevron-down'}
                      size={11}
                      color={colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded nutrition panel */}
                {isMealExpanded && meal.macros && (
                  <ExpandedNutrition item={meal} colors={colors} buttonLabel="Log Again" />
                )}
              </React.Fragment>
            );
          })}

          {/* Add Food button */}
          <TouchableOpacity
            style={[dc.addBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => onAddFood(dayName)}
          >
            <Ionicons name="add" size={16} color={colors.textSecondary} />
            <Text style={[dc.addBtnText, { color: colors.textSecondary }]}>Add Food</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const dc = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { gap: 3 },
  headerRight: { alignItems: 'flex-end', gap: 3 },
  headerRightTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayName: { fontSize: 15, fontWeight: FONTS.bold, letterSpacing: -0.2 },
  todayTag: { fontSize: 13, fontWeight: FONTS.regular },
  date: { fontSize: 12, fontWeight: FONTS.regular },
  calories: { fontSize: 15, fontWeight: FONTS.semibold },
  diff: { fontSize: 12, fontWeight: FONTS.medium },
  macroRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 4,
  },
  macroItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  macroLabel: { fontSize: 11, fontWeight: FONTS.regular, marginRight: 2 },
  macroVal: { fontSize: 12, fontWeight: FONTS.semibold },
  mealList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 4,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  mealEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: FONTS.medium, marginBottom: 2 },
  mealMeta: { fontSize: 12, fontWeight: FONTS.regular },
  mealCals: { fontSize: 13, fontWeight: FONTS.regular },
  mealRight: { alignItems: 'flex-end', gap: 3 },
  mealHairline: { height: StyleSheet.hairlineWidth, marginLeft: 40 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 11,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 14, fontWeight: FONTS.medium },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CaloriesScreen() {
  const { colors } = useTheme();

  const [weekData,      setWeekData]      = useState(INITIAL_WEEK_DATA);
  const [expandedDay,   setExpandedDay]   = useState(null);
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [addFoodDay,    setAddFoodDay]    = useState(null);
  const [toastText,     setToastText]     = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const todayData  = weekData.Sunday;
  const todayCals  = todayData.meals.reduce((s, m) => s + m.calories, 0);
  const remaining  = GOALS.calories - todayCals;
  const caloriePct = Math.min(todayCals / GOALS.calories, 1);

  function showToast(text) {
    setToastText(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setToastText(null));
  }

  function handleToggle(dayName) {
    LayoutAnimation.configureNext({
      duration: 260,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setExpandedMealId(null);
    setExpandedDay((prev) => (prev === dayName ? null : dayName));
  }

  function handleToggleMeal(mealId) {
    LayoutAnimation.configureNext({
      duration: 260,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setExpandedMealId((prev) => (prev === mealId ? null : mealId));
  }

  function handleAddFood(food) {
    const day = addFoodDay;
    setWeekData((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        protein: prev[day].protein + food.macros.protein,
        carbs:   prev[day].carbs   + food.macros.carbs,
        fat:     prev[day].fat     + food.macros.fat,
        meals:   [...prev[day].meals, food],
      },
    }));
    setAddFoodDay(null);
    showToast(`Added to ${day}`);
  }

  // Weekly total over/under
  const weeklyDiff = DAY_ORDER.reduce((sum, d) => {
    const cals = weekData[d].meals.reduce((s, m) => s + m.calories, 0);
    return sum + (cals - GOALS.calories);
  }, 0);
  const weeklyIsOver   = weeklyDiff > 0;
  const weeklyDiffText = weeklyIsOver
    ? `+${weeklyDiff.toLocaleString()} kcal`
    : `${weeklyDiff.toLocaleString()} kcal`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Calories</Text>
          <Text style={[styles.headerDate, { color: colors.textMuted }]}>
            Sunday, Mar 9
          </Text>
        </View>

        {/* ── Today hero ──────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={[styles.heroNumber, { color: colors.text }]}>
            {todayCals.toLocaleString()}
          </Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            of {GOALS.calories.toLocaleString()} kcal
            {'  ·  '}
            {remaining >= 0
              ? `${remaining.toLocaleString()} remaining`
              : `${Math.abs(remaining).toLocaleString()} over`}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${caloriePct * 100}%`, backgroundColor: colors.text },
              ]}
            />
          </View>
        </View>

        {/* ── Last Week ───────────────────────────────────────────────── */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Last Week</Text>

        <View style={styles.weekList}>
          {DAY_ORDER.map((dayName, index) => (
            <React.Fragment key={dayName}>
              <DayCard
                dayName={dayName}
                data={weekData[dayName]}
                isExpanded={expandedDay === dayName}
                onToggle={() => handleToggle(dayName)}
                onAddFood={setAddFoodDay}
                expandedMealId={expandedMealId}
                onToggleMeal={handleToggleMeal}
                colors={colors}
              />
              {index < DAY_ORDER.length - 1 && (
                <View style={[styles.daySeparator, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── Weekly total ────────────────────────────────────────────── */}
        <View style={[styles.weekTotal, { borderTopColor: colors.border }]}>
          <Text style={[styles.weekTotalLabel, { color: colors.textMuted }]}>This week</Text>
          <Text style={[styles.weekTotalValue, { color: weeklyIsOver ? colors.error : colors.success }]}>
            {weeklyDiffText}
          </Text>
        </View>
      </ScrollView>

      {/* ── Add food modal ──────────────────────────────────────────── */}
      <AddFoodModal
        visible={!!addFoodDay}
        onClose={() => setAddFoodDay(null)}
        onAdd={handleAddFood}
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  header: {
    paddingHorizontal: 24,
    paddingTop: SPACING.lg,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: FONTS.regular,
  },

  hero: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  heroNumber: {
    fontSize: 56,
    fontWeight: FONTS.bold,
    letterSpacing: -2,
    lineHeight: 56,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: FONTS.regular,
    marginTop: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: RADIUS.full,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },

  divider: {
    height: 1,
    marginHorizontal: 24,
    marginVertical: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 20,
  },

  weekList: {
    paddingHorizontal: 24,
  },
  daySeparator: {
    height: 1,
    marginVertical: 20,
  },

  weekTotal: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTotalLabel: {
    fontSize: 14,
    fontWeight: FONTS.medium,
  },
  weekTotalValue: {
    fontSize: 17,
    fontWeight: FONTS.bold,
    letterSpacing: -0.3,
  },

  toast: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  toastText: {
    fontSize: 14,
    fontWeight: FONTS.medium,
  },
});
