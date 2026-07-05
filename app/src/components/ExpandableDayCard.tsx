import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONTS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import { moderateScale as ms } from '../utils/responsive';
import MacroProgressBar from './MacroProgressBar';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MACRO_COLORS = { protein: '#E45255', carbs: '#94AE7F', fat: '#DEA226' };
const MACRO_LABEL_BROWN = '#7F6C64';
const TEXT_BROWN = '#493026';       // day name + meal name
const MEAL_KCAL_BROWN = '#7F6C64';  // meal kcal value
const ORANGE_CAL = '#F97316';

export default function ExpandableDayCard({ dayData, goalCals }: { dayData: any, goalCals: number }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const dateObj = new Date(dayData.dateKey);
  const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
  const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  
  const todayKey = new Date().toISOString().slice(0, 10);
  const isToday = dayData.dateKey === todayKey;

  const calDiff = Math.round(dayData.totalCalories) - goalCals;
  const calDiffText = calDiff > 0 ? `+${calDiff} kcal` : `${calDiff} kcal`;
  const calDiffColor = calDiff > 0 ? ORANGE_CAL : '#16A34A'; 

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.header} onPress={toggleExpand} activeOpacity={0.7}>
        <View style={styles.headerRow}>
          <View style={styles.dayNameRow}>
            <Text style={[styles.dayName, { color: TEXT_BROWN }]}>{dayName}</Text>
            {isToday && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Today</Text>
              </View>
            )}
          </View>
          <View style={styles.calRow}>
            <Text style={[styles.totalCalories, { color: colors.text }]}>{Math.round(dayData.totalCalories)} kcal</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={ms(18)} color={colors.textMuted} style={{ marginLeft: ms(6) }} />
          </View>
        </View>

        <View style={styles.headerRow}>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateStr}</Text>
          <Text style={[styles.calDiffText, { color: calDiffColor }]}>{calDiffText}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.macroSummary}>
        <MacroProgressBar 
          protein={dayData.totalProtein} 
          carbs={dayData.totalCarbs} 
          fat={dayData.totalFat} 
        />
        <View style={styles.macroLabelsRow}>
          <View style={styles.macroLabelItem}>
            <View style={[styles.dot, { backgroundColor: MACRO_COLORS.protein }]} />
            <Text style={[styles.macroLabelName, { color: colors.textMuted }]}>Protein <Text style={[styles.macroLabelVal, { color: colors.text }]}>{Math.round(dayData.totalProtein)}g</Text></Text>
          </View>
          <View style={styles.macroLabelItem}>
            <View style={[styles.dot, { backgroundColor: MACRO_COLORS.carbs }]} />
            <Text style={[styles.macroLabelName, { color: colors.textMuted }]}>Carbs <Text style={[styles.macroLabelVal, { color: colors.text }]}>{Math.round(dayData.totalCarbs)}g</Text></Text>
          </View>
          <View style={styles.macroLabelItem}>
            <View style={[styles.dot, { backgroundColor: MACRO_COLORS.fat }]} />
            <Text style={[styles.macroLabelName, { color: colors.textMuted }]}>Fat <Text style={[styles.macroLabelVal, { color: colors.text }]}>{Math.round(dayData.totalFat)}g</Text></Text>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={[styles.expandedContent, { borderColor: colors.border }]}>
          {dayData.meals.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No meals logged</Text>
          ) : (
            dayData.meals.map((meal: any, index: number) => (
              <View key={meal.id || index}>
                {index > 0 && <View style={styles.mealDivider} />}
                <View style={styles.mealRow}>
                <View style={styles.mealHeader}>
                  <Text style={[styles.mealName, { color: TEXT_BROWN }]} numberOfLines={1}>
                    {meal.emoji ? `${meal.emoji} ` : ''}{meal.name}
                  </Text>
                  <View style={styles.mealCalContainer}>
                    <Text style={[styles.mealCals, { color: MEAL_KCAL_BROWN }]}>{Math.round(meal.calories || 0)}</Text>
                    <Text style={[styles.mealCalsLabel, { color: colors.textMuted }]}>kcal</Text>
                  </View>
                </View>
                <View style={styles.mealMacros}>
                  <Text style={[styles.macroText, { color: MACRO_LABEL_BROWN }]}>
                    <Text style={{ color: MACRO_COLORS.protein }}>{Math.round(meal.protein || 0)}g</Text> pro
                  </Text>
                  <Text style={[styles.macroTextDot, { color: colors.textMuted }]}> · </Text>
                  <Text style={[styles.macroText, { color: MACRO_LABEL_BROWN }]}>
                    <Text style={{ color: MACRO_COLORS.carbs }}>{Math.round(meal.carbs || 0)}g</Text> carb
                  </Text>
                  <Text style={[styles.macroTextDot, { color: colors.textMuted }]}> · </Text>
                  <Text style={[styles.macroText, { color: MACRO_LABEL_BROWN }]}>
                    <Text style={{ color: MACRO_COLORS.fat }}>{Math.round(meal.fat || 0)}g</Text> fat
                  </Text>
                </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  header: {
    marginBottom: ms(12),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(4),
  },
  dayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayName: {
    fontSize: ms(16),
    fontWeight: '700',
    marginRight: ms(8),
  },
  todayBadge: {
    backgroundColor: '#FCF7F3',
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderRadius: ms(10),
  },
  todayBadgeText: {
    fontSize: ms(11),
    color: '#FF8A45',
    fontWeight: FONTS.semibold,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalCalories: {
    fontSize: ms(16),
    fontWeight: '700',
  },
  dateText: {
    fontSize: ms(13),
  },
  calDiffText: {
    fontSize: ms(13),
    fontWeight: FONTS.semibold,
    marginRight: ms(24), 
  },
  macroSummary: {
    marginTop: ms(4),
  },
  macroLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: ms(10),
    gap: ms(16),
  },
  macroLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    marginRight: ms(6),
  },
  macroLabelName: {
    fontSize: ms(12),
  },
  macroLabelVal: {
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: ms(16),
    paddingTop: ms(16),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: ms(8),
  },
  mealRow: {
    marginBottom: ms(16),
  },
  mealDivider: {
    height: 1,
    backgroundColor: '#EFE9E4',
    marginBottom: ms(16),
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ms(2),
  },
  mealName: {
    fontSize: ms(15),
    fontWeight: '700',
    flex: 1,
    marginRight: ms(8),
  },
  mealCalContainer: {
    alignItems: 'flex-end',
  },
  mealCals: {
    fontSize: ms(15),
    fontWeight: '700',
    marginBottom: -ms(2),
  },
  mealCalsLabel: {
    fontSize: ms(11),
  },
  mealMacros: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroText: {
    fontSize: ms(12),
    fontWeight: FONTS.semibold,
  },
  macroTextDot: {
    fontSize: ms(12),
  },
});

