import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import { profileService } from '../services/profile.service';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { RootState } from '../store';

// ── Same formula as UserSetupScreen ──────────────────────────────────────────
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
  const bmr = gender === 'female'
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5;
  const activityMap: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725,
  };
  const goalMap: Record<string, number> = {
    lose: -500, maintain: 0, muscle: 300, healthy: 0,
  };
  const calories = Math.round(bmr * (activityMap[activity] ?? 1.375) + (goalMap[goal] ?? 0));
  let protein = Math.min(Math.round(w * 1.8), 220);
  let fat = Math.max(Math.round(w * 0.8), 40);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

const GOALS = [
  { key: 'lose',     label: 'Lose Weight',      icon: 'trending-down' },
  { key: 'maintain', label: 'Maintain Weight',   icon: 'scale'         },
  { key: 'muscle',   label: 'Build Muscle',      icon: 'barbell'       },
  { key: 'healthy',  label: 'Eat Healthy',       icon: 'leaf'          },
];

const ACTIVITIES = [
  { key: 'sedentary', label: 'Sedentary',         icon: 'bed'     },
  { key: 'light',     label: 'Lightly Active',    icon: 'walk'    },
  { key: 'moderate',  label: 'Moderately Active', icon: 'bicycle' },
  { key: 'very',      label: 'Very Active',       icon: 'flame'   },
];

const GENDERS = [
  { key: 'male',   label: 'Male'   },
  { key: 'female', label: 'Female' },
  { key: 'other',  label: 'Other'  },
];

export default function EditProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { session } = useSelector((state: RootState) => state.auth);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const [name,     setName]     = useState('');
  const [gender,   setGender]   = useState('male');
  const [age,      setAge]      = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goal,     setGoal]     = useState('maintain');
  const [activity, setActivity] = useState('moderate');

  useEffect(() => {
    if (!session?.access_token) { setLoading(false); return; }
    profileService.getProfile(session)
      .then(p => {
        if (!p) return;
        if (p.name)         setName(p.name);
        if (p.gender)       setGender(p.gender);
        if (p.age)          setAge(String(p.age));
        if (p.height_cm)    setHeightCm(String(p.height_cm));
        if (p.weight_kg)    setWeightKg(String(p.weight_kg));
        if (p.goal)         setGoal(p.goal);
        if (p.activity_level) setActivity(p.activity_level);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const nutrition = calculateTargets(gender, age, heightCm, weightKg, goal, activity);
      await profileService.updateProfile(session, {
        name: name.trim() || null,
        gender,
        age: parseInt(age) || null,
        height_cm: parseFloat(heightCm) || null,
        weight_kg: parseFloat(weightKg) || null,
        goal,
        activity: activity,
        ...nutrition,
      } as any);
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  const nutrition = calculateTargets(gender, age, heightCm, weightKg, goal, activity);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: colors.text }]}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { opacity: saving ? 0.5 : 1 }]}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={[styles.saveBtnText, { color: colors.primary }]}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '20' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Name */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Display Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.chip, { backgroundColor: colors.surfaceAlt }, gender === g.key && { backgroundColor: colors.text }]}
                  onPress={() => setGender(g.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, gender === g.key && { color: colors.background }]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Age / Height / Weight */}
          <View style={styles.row3}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Age</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="25"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Height (cm)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="170"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Weight (kg)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="70"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Goal */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Goal</Text>
            <View style={styles.gridRow}>
              {GOALS.map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.gridChip, { backgroundColor: colors.surfaceAlt }, goal === g.key && { backgroundColor: colors.text }]}
                  onPress={() => setGoal(g.key)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={g.icon as any} size={18} color={goal === g.key ? colors.background : colors.textSecondary} />
                  <Text style={[styles.gridChipText, { color: colors.textSecondary }, goal === g.key && { color: colors.background }]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Activity Level</Text>
            <View style={styles.gridRow}>
              {ACTIVITIES.map(a => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.gridChip, { backgroundColor: colors.surfaceAlt }, activity === a.key && { backgroundColor: colors.text }]}
                  onPress={() => setActivity(a.key)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={a.icon as any} size={18} color={activity === a.key ? colors.background : colors.textSecondary} />
                  <Text style={[styles.gridChipText, { color: colors.textSecondary }, activity === a.key && { color: colors.background }]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recalculated targets preview */}
          <View style={[styles.targetsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.targetsTitle, { color: colors.textMuted }]}>DAILY TARGETS</Text>
            <View style={styles.targetsRow}>
              <TargetCell label="Calories" value={String(nutrition.calories)} color={colors.primary} textColor={colors.text} mutedColor={colors.textMuted} />
              <TargetCell label="Protein"  value={`${nutrition.protein}g`}  color="#EF4444" textColor={colors.text} mutedColor={colors.textMuted} />
              <TargetCell label="Carbs"    value={`${nutrition.carbs}g`}    color="#22C55E" textColor={colors.text} mutedColor={colors.textMuted} />
              <TargetCell label="Fat"      value={`${nutrition.fat}g`}      color="#F59E0B" textColor={colors.text} mutedColor={colors.textMuted} />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TargetCell({ label, value, color, textColor, mutedColor }: any) {
  return (
    <View style={styles.targetCell}>
      <Text style={[styles.targetValue, { color }]}>{value}</Text>
      <Text style={[styles.targetLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { width: 36, alignItems: 'flex-start' },
  topTitle:    { fontSize: 17, fontWeight: FONTS.bold, letterSpacing: -0.3 },
  saveBtn:     { width: 48, alignItems: 'flex-end' },
  saveBtnText: { fontSize: 15, fontWeight: FONTS.semibold },

  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60 },

  errorBanner: { borderRadius: RADIUS.md, padding: 12, marginBottom: 20 },
  errorText:   { fontSize: 14, fontWeight: FONTS.medium },

  section: { marginBottom: 24 },
  label:   { fontSize: 12, fontWeight: FONTS.semibold, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  chipText: { fontSize: 14, fontWeight: FONTS.medium },

  row3:  { flexDirection: 'row', gap: 10, marginBottom: 24 },
  field: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },

  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  gridChipText:  { flex: 1, fontSize: 13, fontWeight: FONTS.medium },

  targetsCard: {
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
  },
  targetsTitle: { fontSize: 11, fontWeight: FONTS.semibold, letterSpacing: 0.8 },
  targetsRow:   { flexDirection: 'row' },
  targetCell:   { flex: 1, alignItems: 'center' },
  targetValue:  { fontSize: 17, fontWeight: FONTS.bold },
  targetLabel:  { fontSize: 11, fontWeight: FONTS.regular, marginTop: 2 },
});
