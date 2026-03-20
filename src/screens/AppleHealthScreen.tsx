import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

type RootStackParamList = {
  AppleHealth: undefined;
  CalorieRollover: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AppleHealth'>;
};

export default function AppleHealthScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  function proceed() {
    navigation.navigate('CalorieRollover');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>

        {/* Illustration */}
        <View style={styles.illustration}>
          <View style={styles.illustrationBg}>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: colors.tintRed }]}>
                <Text style={styles.metricEmoji}>❤️</Text>
                <Text style={styles.metricValue}>72</Text>
                <Text style={styles.metricLabel}>bpm</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: colors.tintGreen }]}>
                <Text style={styles.metricEmoji}>👟</Text>
                <Text style={styles.metricValue}>8,432</Text>
                <Text style={styles.metricLabel}>steps</Text>
              </View>
              <View style={[styles.metricCard, styles.metricCardWide, { backgroundColor: colors.tintBlue }]}>
                <Text style={styles.metricEmoji}>😴</Text>
                <Text style={styles.metricValue}>7h 23m</Text>
                <Text style={styles.metricLabel}>sleep</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Text */}
        <View style={styles.textSection}>
          <Text style={styles.title}>Connect to{'\n'}Apple Health</Text>
          <Text style={styles.subtitle}>
            Sync your activity and health data to improve calorie and nutrition calculations.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={proceed} activeOpacity={0.85}>
            <Text style={styles.appleIcon}></Text>
            <Text style={styles.primaryBtnText}>Connect Apple Health</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={proceed} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'space-between',
      paddingTop: 24,
      paddingBottom: 24,
    },

    illustration: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    illustrationBg: {
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      width: 180,
      justifyContent: 'center',
    },
    metricCard: {
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      width: 82,
    },
    metricCardWide: {
      width: '100%',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
    },
    metricEmoji: { fontSize: 20 },
    metricValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 4 },
    metricLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 1 },

    textSection: {
      gap: 10,
      paddingBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      lineHeight: 40,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 24,
      fontWeight: '400',
    },

    actions: {
      gap: 16,
      alignItems: 'center',
    },
    primaryBtn: {
      width: '100%',
      backgroundColor: colors.btnPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 17,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    appleIcon: { fontSize: 18, color: colors.btnPrimaryText, lineHeight: 22 },
    primaryBtnText: { fontSize: 17, fontWeight: '700', color: colors.btnPrimaryText, letterSpacing: 0.2 },
    skipText: { fontSize: 14, color: colors.textDisabled, fontWeight: '500' },
  });
}
