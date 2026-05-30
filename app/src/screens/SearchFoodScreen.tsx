import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import { FONTS, RADIUS } from '../constants/theme';
import {
  searchFoodSuggestions,
  searchFood,
  FoodItem,
} from '../services/foodSearch.service';
import { fetchAllRecipes } from '../services/recipeService';
import { isUsageLimitError } from '../services/subscription.service';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from '../components/PaywallModal';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const TABS = ['All', 'My Recipes'] as const;

function recipeToFoodItem(r: any): FoodItem {
  return {
    id: String(r.id),
    name: r.title,
    verified: false,
    calories: r.calories ?? 0,
    servingSize: '1 serving',
    servingSizeGrams: r.estimatedGrams ?? 400,
    macros: {
      protein: r.protein ?? 0,
      carbs:   r.carbs   ?? 0,
      fat:     r.fat     ?? 0,
    },
  };
}

function VerifiedBadge() {
  return (
    <Ionicons name="shield-checkmark" size={15} color="#22C55E" style={{ marginLeft: 4 }} />
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
      style={[styles.foodRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.foodRowInfo}>
        <View style={styles.foodNameRow}>
          <Text style={[styles.foodName, { color: colors.text }]}>{item.name}</Text>
          {item.verified && <VerifiedBadge />}
        </View>
        <Text style={[styles.foodMeta, { color: colors.textMuted }]}>
          {item.calories} cal, {item.servingSize}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        onPress={() => onPress(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="add" size={20} color={colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SearchFoodScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { session } = useSelector((s: any) => s.auth);
  const { isSubscribed } = useSubscription();
  const defaultMealType: MealType = route.params?.defaultMealType ?? 'breakfast';

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [query, setQuery] = useState('');
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
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState<'idle' | 'suggesting' | 'results'>('idle');

  // ── My Recipes tab state ───────────────────────────────────────────────────
  const [savedRecipes, setSavedRecipes] = useState<FoodItem[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [recipesLoaded, setRecipesLoaded] = useState(false);
  const [recipesError, setRecipesError] = useState('');

  const suggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // ── Tab change ─────────────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    async (i: number) => {
      setActiveTab(i);
      // Clear query when switching tabs
      setQuery('');
      setMode('idle');
      setSuggestions([]);

      if (i === 1 && !recipesLoaded) {
        setIsLoadingRecipes(true);
        setRecipesError('');
        try {
          const data = await fetchAllRecipes(session);
          setSavedRecipes(data.map(recipeToFoodItem));
          setRecipesLoaded(true);
        } catch (err: any) {
          setRecipesError(err?.message || 'Failed to load recipes.');
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
        setMode('idle');
        setSuggestions([]);
        setHasSearched(false);
        return;
      }
      setMode('suggesting');
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

      setMode('results');
      setHasSearched(true);
      setIsLoadingResults(true);
      setErrorMsg('');
      try {
        const data = await searchFood(trimmed, session);
        setBestMatch(data.bestMatch);
        setResults(data.results);
      } catch (err: any) {
        // Server-side gate backstop (handles a stale client premium flag).
        if (isUsageLimitError(err)) {
          setPaywallVisible(true);
          setMode('idle');
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
    navigation.navigate('FoodDetail', { food: item, defaultMealType: mealType });
  };

  const clearQuery = () => {
    setQuery('');
    if (activeTab === 0) {
      setMode('idle');
      setSuggestions([]);
      setHasSearched(false);
    }
    inputRef.current?.focus();
  };

  // ── My Recipes: client-side filter ─────────────────────────────────────────
  const filteredRecipes = query.trim()
    ? savedRecipes.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : savedRecipes;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mealPicker}
          onPress={() => setShowMealPicker(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.mealPickerText, { color: colors.info ?? '#3B82F6' }]}>
            {MEAL_LABELS[mealType]}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.info ?? '#3B82F6'} />
        </TouchableOpacity>

        <View style={{ width: 36 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchBarWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.info ?? '#3B82F6'} style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={activeTab === 0 ? 'Search food...' : 'Filter recipes...'}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => activeTab === 0 && handleSearch(query)}
            returnKeyType={activeTab === 0 ? 'search' : 'done'}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
            <Text style={[styles.tabText, { color: activeTab === i ? colors.text : colors.textMuted }]}>
              {tab}
            </Text>
            {activeTab === i && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.text }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── All tab content ──────────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <>
          {mode === 'idle' && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Search for a food item
              </Text>
              <TouchableOpacity
                style={[styles.manualLogBtn, { borderColor: colors.border }]}
                onPress={() => navigation.navigate('LogMeal', { defaultMealType: mealType })}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.manualLogText, { color: colors.textSecondary }]}>
                  Log manually
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'suggesting' && (
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested Searches</Text>
              {isLoadingSugg && (
                <ActivityIndicator size="small" color={colors.textMuted} style={{ marginTop: 16 }} />
              )}
              {suggestions.map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={styles.suggRow}
                  onPress={() => handleSelectSuggestion(sug)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <Text style={[styles.suggText, { color: colors.text }]}>{sug}</Text>
                </TouchableOpacity>
              ))}
              {query.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.searchAllRow}
                  onPress={() => handleSearch(query)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.searchAllIcon, { backgroundColor: colors.info ?? '#3B82F6' }]}>
                    <Ionicons name="search" size={14} color="#fff" />
                  </View>
                  <Text style={[styles.searchAllText, { color: colors.info ?? '#3B82F6' }]}>
                    Search all foods for: "{query}"
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {mode === 'results' && (
            <FlatList
              data={[]}
              renderItem={null}
              ListHeaderComponent={
                <View>
                  {isLoadingResults ? (
                    <View style={styles.loadingWrap}>
                      <ActivityIndicator size="large" color={colors.textMuted} />
                      <Text style={[styles.loadingText, { color: colors.textMuted }]}>Searching...</Text>
                    </View>
                  ) : errorMsg ? (
                    <View style={styles.loadingWrap}>
                      <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
                      <Text style={[styles.loadingText, { color: colors.textMuted }]}>{errorMsg}</Text>
                    </View>
                  ) : (
                    <>
                      {bestMatch && (
                        <View>
                          <View style={styles.resultsSectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                              Best Match
                            </Text>
                            <View style={[styles.onlyBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                              <Ionicons name="shield-checkmark" size={11} color={colors.textSecondary} />
                              <Text style={[styles.onlyBadgeText, { color: colors.textSecondary }]}>Only</Text>
                            </View>
                          </View>
                          <FoodRow item={bestMatch} onPress={handleFoodPress} colors={colors} />
                        </View>
                      )}
                      {results.length > 0 && (
                        <View>
                          <Text style={[styles.sectionTitle, { color: colors.text }]}>More Results</Text>
                          {results.map((item) => (
                            <FoodRow key={item.id} item={item} onPress={handleFoodPress} colors={colors} />
                          ))}
                        </View>
                      )}
                      {!bestMatch && results.length === 0 && hasSearched && (
                        <View style={styles.loadingWrap}>
                          <Text style={[styles.loadingText, { color: colors.textMuted }]}>No results found</Text>
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
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading recipes...</Text>
            </View>
          ) : recipesError ? (
            <View style={styles.loadingWrap}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>{recipesError}</Text>
            </View>
          ) : filteredRecipes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {query.trim() ? 'No recipes match your search' : 'No saved recipes yet'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <FoodRow item={item} onPress={handleFoodPress} colors={colors} />
              )}
              contentContainerStyle={[styles.listContent, { paddingTop: 12 }]}
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
          <View style={[styles.mealPickerModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.mealPickerTitle, { color: colors.text }]}>Select a Meal</Text>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt}
                style={[
                  styles.mealPickerOption,
                  mt === mealType && { backgroundColor: colors.surfaceAlt },
                ]}
                onPress={() => {
                  setMealType(mt);
                  setShowMealPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.mealPickerOptionText,
                    { color: mt === mealType ? colors.text : colors.textSecondary },
                    mt === mealType && { fontWeight: FONTS.semibold },
                  ]}
                >
                  {MEAL_LABELS[mt]}
                </Text>
                {mt === mealType && (
                  <Ionicons name="checkmark" size={16} color={colors.text} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Premium paywall — shown when a non-subscriber tries to AI-search food */}
      <PaywallModal
        visible={paywallVisible}
        feature="search"
        onClose={() => setPaywallVisible(false)}
        onUpgrade={() => {
          setPaywallVisible(false);
          navigation.navigate('Subscription');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealPickerText: {
    fontSize: 16,
    fontWeight: FONTS.semibold,
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tab: {
    marginRight: 20,
    paddingBottom: 10,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: FONTS.medium,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: FONTS.bold,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  suggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggText: { fontSize: 15 },
  searchAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchAllIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAllText: {
    fontSize: 15,
    fontWeight: FONTS.medium,
  },
  listContent: { paddingBottom: 40 },
  resultsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  onlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  onlyBadgeText: {
    fontSize: 12,
    fontWeight: FONTS.medium,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  foodRowInfo: { flex: 1 },
  foodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodName: {
    fontSize: 15,
    fontWeight: FONTS.semibold,
  },
  foodMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 15 },
  manualLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  manualLogText: {
    fontSize: 13,
    fontWeight: FONTS.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealPickerModal: {
    width: 260,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  mealPickerTitle: {
    fontSize: 13,
    fontWeight: FONTS.semibold,
    textAlign: 'center',
    paddingVertical: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mealPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  mealPickerOptionText: { fontSize: 15 },
});
