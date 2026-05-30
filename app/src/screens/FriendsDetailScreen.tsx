import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function FriendDetailScreen({ route }) {
  const { colors } = useTheme();
  const { friend } = route.params;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {friend.name}
        </Text>

        <Text style={[styles.username, { color: colors.textMuted }]}>
          {friend.username}
        </Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Today&apos;s Totals
          </Text>

          <Text style={[styles.summaryText, { color: colors.text }]}>
            🔥 {friend.calories} kcal
          </Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            💪 {friend.protein}g protein
          </Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            🌾 {friend.carbs}g carbs
          </Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            🥑 {friend.fat}g fat
          </Text>
        </View>

        <View style={[styles.mealsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Meals Today
          </Text>

          {(friend.mealsToday ?? []).map((meal, index) => (
            <View key={index} style={styles.mealRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mealName, { color: colors.text }]}>
                  {meal.name}
                </Text>
                <Text style={[styles.mealMeta, { color: colors.textMuted }]}>
                  {meal.mealType}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.mealCals, { color: colors.text }]}>
                  {meal.calories} kcal
                </Text>
                <Text style={[styles.mealMacros, { color: colors.textMuted }]}>
                  P {meal.protein} • C {meal.carbs} • F {meal.fat}
                </Text>
              </View>
            </View>
          ))}
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
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  username: {
    fontSize: 14,
    marginTop: -6,
    marginBottom: 8,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  mealsCard: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '700',
  },
  mealMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  mealCals: {
    fontSize: 14,
    fontWeight: '700',
  },
  mealMacros: {
    fontSize: 12,
    marginTop: 2,
  },
});