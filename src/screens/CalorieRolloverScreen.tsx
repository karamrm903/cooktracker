import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

type RootStackParamList = {
  CalorieRollover: undefined;
  Referral: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CalorieRollover'>;
};

export default function CalorieRolloverScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [selected, setSelected] = useState<'yes' | 'no'>('yes');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* Back */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Carry extra calories{'\n'}to tomorrow?</Text>
          <Text style={styles.subtitle}>
            If you eat fewer calories than your daily goal, unused calories can roll over to the next day.
          </Text>
        </View>

        {/* Visual example */}
        <View style={styles.exampleSection}>
          <View style={styles.exampleCard}>
            <View style={styles.exampleRow}>
              <View style={styles.dayBlock}>
                <Text style={styles.dayLabel}>Yesterday</Text>
                <View style={styles.calBar}>
                  <View style={[styles.calFill, { width: '70%' }]} />
                </View>
                <Text style={styles.calText}>350 / 500 kcal</Text>
                <View style={styles.leftoverBadge}>
                  <Text style={styles.leftoverText}>150 left</Text>
                </View>
              </View>

              <Text style={styles.arrow}>→</Text>

              <View style={styles.dayBlock}>
                <Text style={styles.dayLabel}>Today</Text>
                <View style={[styles.calBar, { backgroundColor: colors.rolloverGreenBg }]}>
                  <View style={[styles.calFill, { width: '100%', backgroundColor: colors.secondary }]} />
                </View>
                <Text style={styles.calText}>650 kcal goal</Text>
                <View style={[styles.leftoverBadge, styles.rolloverBadge]}>
                  <Text style={[styles.leftoverText, styles.rolloverText]}>+150 rollover</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Selection */}
        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.optionBtn, selected === 'no' && styles.optionBtnActive]}
            onPress={() => setSelected('no')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionEmoji}>🚫</Text>
            <View style={styles.optionTextBlock}>
              <Text style={[styles.optionLabel, selected === 'no' && styles.optionLabelActive]}>No</Text>
              <Text style={[styles.optionSub, selected === 'no' && styles.optionSubActive]}>
                Start fresh every day
              </Text>
            </View>
            {selected === 'no' && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionBtn, selected === 'yes' && styles.optionBtnActive]}
            onPress={() => setSelected('yes')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionEmoji}>✅</Text>
            <View style={styles.optionTextBlock}>
              <Text style={[styles.optionLabel, selected === 'yes' && styles.optionLabelActive]}>Yes</Text>
              <Text style={[styles.optionSub, selected === 'yes' && styles.optionSubActive]}>
                Carry unused calories forward
              </Text>
            </View>
            {selected === 'yes' && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        </View>

      </View>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('Referral')}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    topBar: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 4,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 999,
      backgroundColor: colors.backBtnBg,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    backArrow: { fontSize: 17, color: colors.text, lineHeight: 21 },

    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
    },

    header: { gap: 8, marginBottom: 28 },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 38,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 24,
      fontWeight: '400',
    },

    exampleSection: { marginBottom: 28 },
    exampleCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    exampleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    dayBlock: { flex: 1, gap: 8 },
    dayLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textDisabled,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    calBar: {
      height: 6,
      backgroundColor: colors.borderLight,
      borderRadius: 3,
      overflow: 'hidden',
    },
    calFill: {
      height: '100%',
      backgroundColor: colors.text,
      borderRadius: 3,
    },
    calText: { fontSize: 13, fontWeight: '600', color: colors.text },
    leftoverBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    leftoverText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    rolloverBadge: { backgroundColor: colors.rolloverGreenBg },
    rolloverText: { color: colors.rolloverGreenText },
    arrow: { fontSize: 20, color: colors.border, fontWeight: '300' },

    options: { gap: 12 },
    optionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    optionBtnActive: { backgroundColor: colors.cardActive, borderColor: colors.cardActive },
    optionEmoji: { fontSize: 22 },
    optionTextBlock: { flex: 1, gap: 2 },
    optionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    optionLabelActive: { color: colors.cardActiveText },
    optionSub: { fontSize: 13, color: colors.textMuted },
    optionSubActive: { color: colors.cardActiveSub },
    check: { fontSize: 16, color: colors.cardActiveText, fontWeight: '700' },

    bottomBar: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
    continueBtn: {
      backgroundColor: colors.btnPrimary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    continueBtnText: { fontSize: 17, fontWeight: '700', color: colors.btnPrimaryText, letterSpacing: 0.2 },
  });
}
