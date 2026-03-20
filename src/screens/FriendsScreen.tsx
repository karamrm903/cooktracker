import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const FRIENDS = [
  {
    id: '1',
    name: 'Sara Ahmed',
    username: '@sarafit',
    calories: 1680,
    protein: 124,
    carbs: 182,
    fat: 58,
    mealsToday: [
      {
        name: 'Greek Yogurt Bowl',
        mealType: 'Breakfast',
        calories: 380,
        protein: 24,
        carbs: 52,
        fat: 8,
      },
      {
        name: 'Chicken Salad',
        mealType: 'Lunch',
        calories: 520,
        protein: 48,
        carbs: 28,
        fat: 22,
      },
      {
        name: 'Apple & Peanut Butter',
        mealType: 'Snack',
        calories: 220,
        protein: 10,
        carbs: 18,
        fat: 12,
      },
    ],
  },
  {
    id: '2',
    name: 'Omar Khaled',
    username: '@omark',
    calories: 2100,
    protein: 156,
    carbs: 220,
    fat: 70,
    mealsToday: [
      {
        name: 'Egg Wrap',
        mealType: 'Breakfast',
        calories: 420,
        protein: 28,
        carbs: 30,
        fat: 18,
      },
      {
        name: 'Chicken Rice Bowl',
        mealType: 'Lunch',
        calories: 760,
        protein: 55,
        carbs: 80,
        fat: 20,
      },
      {
        name: 'Protein Shake',
        mealType: 'Snack',
        calories: 260,
        protein: 30,
        carbs: 14,
        fat: 8,
      },
    ],
  },
  {
    id: '3',
    name: 'Lina Noor',
    username: '@linaeats',
    calories: 1420,
    protein: 98,
    carbs: 140,
    fat: 49,
    mealsToday: [
      {
        name: 'Oat Bowl',
        mealType: 'Breakfast',
        calories: 350,
        protein: 15,
        carbs: 48,
        fat: 10,
      },
      {
        name: 'Salmon Salad',
        mealType: 'Lunch',
        calories: 540,
        protein: 42,
        carbs: 22,
        fat: 24,
      },
      {
        name: 'Fruit Yogurt',
        mealType: 'Snack',
        calories: 180,
        protein: 12,
        carbs: 24,
        fat: 5,
      },
    ],
  },
  {
    id: '4',
    name: 'Adam Samer',
    username: '@adamlifts',
    calories: 2350,
    protein: 180,
    carbs: 245,
    fat: 74,
    mealsToday: [
      {
        name: 'Toast & Eggs',
        mealType: 'Breakfast',
        calories: 500,
        protein: 32,
        carbs: 42,
        fat: 20,
      },
      {
        name: 'Beef Pasta',
        mealType: 'Lunch',
        calories: 920,
        protein: 68,
        carbs: 105,
        fat: 24,
      },
      {
        name: 'Greek Yogurt',
        mealType: 'Snack',
        calories: 210,
        protein: 20,
        carbs: 12,
        fat: 6,
      },
    ],
  },
];

export default function FriendsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return FRIENDS;

    return FRIENDS.filter(
      (friend) =>
        friend.name.toLowerCase().includes(q) ||
        friend.username.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          See your friends&apos; progress for today
        </Text>

        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search username to add friend"
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.text }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.addBtnText, { color: colors.background }]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardsWrap}>
          {filteredFriends.map((friend) => (
            <TouchableOpacity
              key={friend.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('FriendDetail', { friend })}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={[styles.friendName, { color: colors.text }]}>
                    {friend.name}
                  </Text>
                  <Text
                    style={[styles.friendUsername, { color: colors.textMuted }]}
                  >
                    {friend.username}
                  </Text>
                </View>

                <TouchableOpacity activeOpacity={0.7}>
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.progressLabel, { color: colors.textSecondary }]}
              >
                Today so far
              </Text>

              <View style={styles.macroGrid}>
                <View
                  style={[
                    styles.macroBox,
                    {
                      backgroundColor:
                        colors.surfaceAlt || 'rgba(255,255,255,0.04)',
                    },
                  ]}
                >
                  <Text style={[styles.macroValue, { color: colors.text }]}>
                    {friend.calories}
                  </Text>
                  <Text style={[styles.macroName, { color: colors.textMuted }]}>
                    kcal
                  </Text>
                </View>

                <View
                  style={[
                    styles.macroBox,
                    {
                      backgroundColor:
                        colors.surfaceAlt || 'rgba(255,255,255,0.04)',
                    },
                  ]}
                >
                  <Text style={[styles.macroValue, { color: colors.text }]}>
                    {friend.protein}g
                  </Text>
                  <Text style={[styles.macroName, { color: colors.textMuted }]}>
                    Protein
                  </Text>
                </View>

                <View
                  style={[
                    styles.macroBox,
                    {
                      backgroundColor:
                        colors.surfaceAlt || 'rgba(255,255,255,0.04)',
                    },
                  ]}
                >
                  <Text style={[styles.macroValue, { color: colors.text }]}>
                    {friend.carbs}g
                  </Text>
                  <Text style={[styles.macroName, { color: colors.textMuted }]}>
                    Carbs
                  </Text>
                </View>

                <View
                  style={[
                    styles.macroBox,
                    {
                      backgroundColor:
                        colors.surfaceAlt || 'rgba(255,255,255,0.04)',
                    },
                  ]}
                >
                  <Text style={[styles.macroValue, { color: colors.text }]}>
                    {friend.fat}g
                  </Text>
                  <Text style={[styles.macroName, { color: colors.textMuted }]}>
                    Fat
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredFriends.length === 0 && (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No users found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Try another name or username
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 18,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  cardsWrap: {
    gap: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 17,
    fontWeight: '700',
  },
  friendUsername: {
    fontSize: 13,
    marginTop: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 10,
  },

  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  macroBox: {
    width: '47%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  macroName: {
    fontSize: 12,
    fontWeight: '600',
  },

  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
  },
});