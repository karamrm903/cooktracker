import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS, FONTS } from '../constants/theme';

export default function FriendDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { friend } = route.params;

  const mealsToday = friend?.mealsToday ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {friend.name}
          </Text>
          <Text style={[styles.username, { color: colors.textMuted }]}>
            {friend.username}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Today&apos;s Totals
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calories</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {friend.calories} kcal
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Protein</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {friend.protein}g
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Carbs</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {friend.carbs}g
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Fat</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {friend.fat}g
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Meals Today
          </Text>

          <View style={[styles.mealsCard, { backgroundColor: colors.surface }]}>
            {mealsToday.map((meal, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <View
                    style={[styles.hairline, { backgroundColor: colors.border }]}
                  />
                )}

                <View style={styles.mealRow}>
                  <View style={styles.mealLeft}>
                    <Text style={[styles.mealName, { color: colors.text }]}>
                      {meal.name}
                    </Text>
                    <Text style={[styles.mealMeta, { color: colors.textMuted }]}>
                      {meal.mealType}
                    </Text>
                  </View>

                  <View style={styles.mealRight}>
                    <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>
                      {meal.calories} kcal
                    </Text>
                    <Text style={[styles.mealMacros, { color: colors.textMuted }]}>
                      P {meal.protein} · C {meal.carbs} · F {meal.fat}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: FONTS.regular,
  },

  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: FONTS.bold,
    marginBottom: 14,
    letterSpacing: -0.3,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: FONTS.medium,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: FONTS.bold,
    letterSpacing: -0.3,
  },

  mealsCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    gap: 12,
  },
  mealLeft: {
    flex: 1,
  },
  mealRight: {
    alignItems: 'flex-end',
  },
  mealName: {
    fontSize: 16,
    fontWeight: FONTS.semibold,
    marginBottom: 3,
  },
  mealMeta: {
    fontSize: 13,
    fontWeight: FONTS.regular,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: FONTS.semibold,
    marginBottom: 4,
  },
  mealMacros: {
    fontSize: 12,
    fontWeight: FONTS.regular,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: SPACING.md,
  },
});