import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setOnboardingPayload } from '../store/slices/authSlice';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  UserSetup: undefined;
  AppleHealth: undefined;
  Login: undefined;
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UserSetup'>;
};

// ── Nutrition calculation (Mifflin-St Jeor) ──────────────────────────────────
function calculateTargets(
  gender: string,
  age: string,
  heightCm: string,
  weightKg: string,
  goal: string,
  activity: string,
) {
  const w = parseFloat(weightKg) || 70;
  const h = parseFloat(heightCm) || 170;
  const a = parseInt(age) || 25;
  const bmr =
    gender === 'female'
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5;
  const activityMap: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
  };
  const goalMap: Record<string, number> = {
    lose: -500,
    maintain: 0,
    muscle: 300,
    healthy: 0,
  };
  const calories = Math.round(bmr * (activityMap[activity] ?? 1.375) + (goalMap[goal] ?? 0));
  let protein = Math.round(w * 1.8);
  let fat = Math.round(w * 0.8);

  protein = Math.min(protein, 220);
  fat = Math.max(fat, 40);

  const carbCalories = calories - protein * 4 - fat * 9;
  const carbs = Math.max(0, Math.round(carbCalories / 4));
  return { calories, protein, carbs, fat };
}

function lbsToKg(lbs: string) {
  return (parseFloat(lbs) || 0) * 0.453592;
}

function feetInchesToCm(ft: string, inches: string) {
  const totalInches = (parseFloat(ft) || 0) * 12 + (parseFloat(inches) || 0);
  return totalInches * 2.54;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const GOALS = [
  { key: 'lose', emoji: '📉', label: 'Lose weight', sub: 'Burn fat and feel lighter' },
  { key: 'maintain', emoji: '⚖️', label: 'Maintain weight', sub: 'Stay at your current weight' },
  { key: 'muscle', emoji: '💪', label: 'Gain muscle', sub: 'Build strength and size' },
  { key: 'healthy', emoji: '🥗', label: 'Eat healthier', sub: 'Better habits, better nutrition' },
];

const ACTIVITIES = [
  { key: 'sedentary', emoji: '🛋️', label: 'Sedentary', sub: 'Mostly sitting, little exercise' },
  { key: 'light', emoji: '🚶', label: 'Lightly active', sub: 'Light exercise 1–3 days/week' },
  { key: 'moderate', emoji: '🏃', label: 'Moderately active', sub: 'Exercise 3–5 days/week' },
  { key: 'very', emoji: '🏋️', label: 'Very active', sub: 'Hard exercise 6–7 days/week' },
];

const TOTAL_STEPS = 4;

export default function UserSetupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();

  const [step, setStep] = useState(1);

  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [goal, setGoal] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);

  const normalizedHeightCm =
    unitSystem === 'metric'
      ? heightCm
      : String(feetInchesToCm(heightFt, heightIn));

  const normalizedWeightKg =
    unitSystem === 'metric'
      ? weightKg
      : String(lbsToKg(weightLbs));

  const nutrition = calculateTargets(
    gender ?? 'male',
    age,
    normalizedHeightCm,
    normalizedWeightKg,
    goal ?? 'maintain',
    activity ?? 'moderate',
  );

  function isComplete() {
    switch (step) {
      case 1:
        return gender !== null &&
          age !== '' &&
          (
            unitSystem === 'metric'
              ? heightCm !== '' && weightKg !== ''
              : heightFt !== '' && heightIn !== '' && weightLbs !== ''
          );
      case 2: return goal !== null;
      case 3: return activity !== null;
      case 4: return true;
      default: return false;
    }
  }

  function handleContinue() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      const payload = {
        gender: gender ?? '',
        age: parseInt(age) || null,
        height_cm: Math.round(parseFloat(normalizedHeightCm)) || null,
        weight_kg: Math.round(parseFloat(normalizedWeightKg)) || null,
        goal: goal ?? '',
        activity: activity ?? '',
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      };

      dispatch(setOnboardingPayload(payload));
      navigation.navigate('AppleHealth');
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  }

  const stepMeta: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Basic info', subtitle: 'Help us personalize your experience' },
    2: { title: "What's your goal?", subtitle: 'Choose what you want to achieve' },
    3: { title: 'Activity level', subtitle: 'How active are you in a typical week?' },
    4: { title: 'Your daily targets', subtitle: 'Calculated based on your profile' },
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.stepCounter}>{step} of {TOTAL_STEPS}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{stepMeta[step].title}</Text>
            <Text style={styles.subtitle}>{stepMeta[step].subtitle}</Text>
          </View>

          {/* ── Step 1: Basic info ── */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.chipRow}>
                  {(['Male', 'Female', 'Other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, gender === g.toLowerCase() && styles.chipActive]}
                      onPress={() => setGender(g.toLowerCase())}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, gender === g.toLowerCase() && styles.chipTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 25"
                  placeholderTextColor={colors.placeholder}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Units</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, unitSystem === 'metric' && styles.chipActive]}
                    onPress={() => setUnitSystem('metric')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, unitSystem === 'metric' && styles.chipTextActive]}>
                      Metric
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chip, unitSystem === 'imperial' && styles.chipActive]}
                    onPress={() => setUnitSystem('imperial')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, unitSystem === 'imperial' && styles.chipTextActive]}>
                      Imperial
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {unitSystem === 'metric' && (
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Height</Text>
                    <View style={styles.unitInput}>
                      <TextInput
                        style={styles.unitInputField}
                        placeholder="170"
                        placeholderTextColor={colors.placeholder}
                        value={heightCm}
                        onChangeText={setHeightCm}
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                      <Text style={styles.unit}>cm</Text>
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Weight</Text>
                    <View style={styles.unitInput}>
                      <TextInput
                        style={styles.unitInputField}
                        placeholder="70"
                        placeholderTextColor={colors.placeholder}
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                      <Text style={styles.unit}>kg</Text>
                    </View>
                  </View>
                </View>
              )}

              {unitSystem === 'imperial' && (
                <>
                  <View style={styles.row}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Height</Text>
                      <View style={styles.row}>
                        <View style={[styles.unitInput, { flex: 1 }]}>
                          <TextInput
                            style={styles.unitInputField}
                            placeholder="5"
                            placeholderTextColor={colors.placeholder}
                            value={heightFt}
                            onChangeText={setHeightFt}
                            keyboardType="number-pad"
                            maxLength={1}
                          />
                          <Text style={styles.unit}>ft</Text>
                        </View>

                        <View style={[styles.unitInput, { flex: 1 }]}>
                          <TextInput
                            style={styles.unitInputField}
                            placeholder="11"
                            placeholderTextColor={colors.placeholder}
                            value={heightIn}
                            onChangeText={setHeightIn}
                            keyboardType="number-pad"
                            maxLength={2}
                          />
                          <Text style={styles.unit}>in</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Weight</Text>
                    <View style={styles.unitInput}>
                      <TextInput
                        style={styles.unitInputField}
                        placeholder="176"
                        placeholderTextColor={colors.placeholder}
                        value={weightLbs}
                        onChangeText={setWeightLbs}
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                      <Text style={styles.unit}>lbs</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Step 2: Goal ── */}
          {step === 2 && (
            <View style={styles.stepContent}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.optionCard, goal === g.key && styles.optionCardActive]}
                  onPress={() => setGoal(g.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconWrap, goal === g.key && styles.optionIconWrapActive]}>
                    <Text style={styles.optionEmoji}>{g.emoji}</Text>
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, goal === g.key && styles.optionLabelActive]}>{g.label}</Text>
                    <Text style={[styles.optionSub, goal === g.key && styles.optionSubActive]}>{g.sub}</Text>
                  </View>
                  {goal === g.key && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Step 3: Activity ── */}
          {step === 3 && (
            <View style={styles.stepContent}>
              {ACTIVITIES.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.optionCard, activity === a.key && styles.optionCardActive]}
                  onPress={() => setActivity(a.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconWrap, activity === a.key && styles.optionIconWrapActive]}>
                    <Text style={styles.optionEmoji}>{a.emoji}</Text>
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, activity === a.key && styles.optionLabelActive]}>{a.label}</Text>
                    <Text style={[styles.optionSub, activity === a.key && styles.optionSubActive]}>{a.sub}</Text>
                  </View>
                  {activity === a.key && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Step 4: Nutrition targets ── */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.macroGrid}>
                <View style={[styles.macroCard, styles.macroCardCalories]}>
                  <Text style={styles.macroEmoji}>🔥</Text>
                  <Text style={styles.macroValueLight}>{nutrition.calories}</Text>
                  <Text style={styles.macroLabelLight}>Calories</Text>
                  <Text style={styles.macroUnitLight}>kcal / day</Text>
                </View>
                <View style={styles.macroRow}>
                  <View style={[styles.macroCard, styles.macroCardProtein]}>
                    <Text style={styles.macroEmoji}>🥩</Text>
                    <Text style={styles.macroValue}>{nutrition.protein}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={[styles.macroCard, styles.macroCardCarbs]}>
                    <Text style={styles.macroEmoji}>🌾</Text>
                    <Text style={styles.macroValue}>{nutrition.carbs}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={[styles.macroCard, styles.macroCardFat]}>
                    <Text style={styles.macroEmoji}>🥑</Text>
                    <Text style={styles.macroValue}>{nutrition.fat}g</Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.macroNote}>
                These are estimates based on your profile. You can adjust them later in settings.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.continueBtn, !isComplete() && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!isComplete()}
            activeOpacity={0.85}
          >
            <Text style={[styles.continueBtnText, !isComplete() && styles.continueBtnTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 12,
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
    stepCounter: { fontSize: 13, fontWeight: '600', color: colors.textDisabled, letterSpacing: 0.3 },

    progressTrack: {
      height: 3,
      backgroundColor: colors.progressTrack,
      marginHorizontal: 24,
      borderRadius: 2,
      marginBottom: 8,
    },
    progressFill: { height: '100%', backgroundColor: colors.progressFill, borderRadius: 2 },

    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 16 },

    header: { paddingTop: 24, paddingBottom: 28, gap: 6 },
    title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    subtitle: { fontSize: 15, color: colors.textMuted, fontWeight: '400' },

    stepContent: { gap: 14 },

    fieldGroup: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.2 },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
      fontSize: 15,
      color: colors.text,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    row: { flexDirection: 'row', gap: 12 },
    unitInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    unitInputField: { flex: 1, paddingVertical: 15, fontSize: 15, color: colors.text },
    unit: { fontSize: 14, fontWeight: '600', color: colors.textDisabled },

    chipRow: { flexDirection: 'row', gap: 10 },
    chip: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    chipActive: { backgroundColor: colors.cardActive },
    chipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    chipTextActive: { color: colors.cardActiveText },

    optionCard: {
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
    optionCardActive: { backgroundColor: colors.cardActive, borderColor: colors.cardActive },
    optionIconWrap: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    },
    optionIconWrapActive: { backgroundColor: 'rgba(128,128,128,0.15)' },
    optionEmoji: { fontSize: 22 },
    optionText: { flex: 1, gap: 2 },
    optionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    optionLabelActive: { color: colors.cardActiveText },
    optionSub: { fontSize: 13, color: colors.textMuted, fontWeight: '400' },
    optionSubActive: { color: colors.cardActiveSub },
    checkmark: { fontSize: 16, color: colors.cardActiveText, fontWeight: '700' },

    macroGrid: { gap: 12 },
    macroRow: { flexDirection: 'row', gap: 12 },
    macroCard: { flex: 1, borderRadius: 18, padding: 18, alignItems: 'center', gap: 4 },
    macroCardCalories: { backgroundColor: colors.cardInverted, paddingVertical: 24 },
    macroCardProtein: { backgroundColor: colors.tintBlue },
    macroCardCarbs: { backgroundColor: colors.tintYellow },
    macroCardFat: { backgroundColor: colors.tintPink },
    macroEmoji: { fontSize: 28, marginBottom: 4 },
    macroValue: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    macroValueLight: { fontSize: 26, fontWeight: '800', color: colors.cardInvertedText, letterSpacing: -0.5 },
    macroLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    macroLabelLight: { fontSize: 13, fontWeight: '600', color: colors.cardInvertedSub },
    macroUnit: { fontSize: 11, color: colors.textDisabled, fontWeight: '500' },
    macroUnitLight: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.45)' },
    macroNote: { fontSize: 13, color: colors.textDisabled, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },

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
    continueBtnDisabled: { backgroundColor: colors.btnDisabled, shadowOpacity: 0 },
    continueBtnText: { fontSize: 17, fontWeight: '700', color: colors.btnPrimaryText, letterSpacing: 0.2 },
    continueBtnTextDisabled: { color: colors.btnDisabledText },
  });
}
