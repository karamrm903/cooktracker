import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { profileService } from "../services/profile.service";
import { RADIUS, FONTS } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import { SVG_ICONS, SVG_ICON_COMPONENT_MAP } from "../constants/svgIcons";
import { RootState } from "../store";

const SCREEN_BG = "#FCF7F3";
const TEXT_DARK = "#493026";
const TEXT_MUTED = "#7F6C64";
const BRAND_PURPLE = "#502F4C";
const BORDER = "#4930261A";
const ORANGE = "#F97316";

const fireImg = require("../../assets/webp/StreakFire.webp");
const muscleImg = require("../../assets/pngs/muscleVector.png");
const leafImg = require("../../assets/pngs/leafVector.png");
const dropImg = require("../../assets/pngs/dropVector.png");

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
  const bmr =
    gender === "female"
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
  const calories = Math.round(
    bmr * (activityMap[activity] ?? 1.375) + (goalMap[goal] ?? 0),
  );
  let protein = Math.min(Math.round(w * 1.8), 220);
  let fat = Math.max(Math.round(w * 0.8), 40);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

const GOALS = [
  { key: "lose", label: "Lose weight", icon: SVG_ICONS.LOOS_WEIGHT_ICON },
  {
    key: "maintain",
    label: "Maintain weight",
    icon: SVG_ICONS.MAINTAIN_WEIGHT_ICON,
  },
  { key: "muscle", label: "Build muscle", icon: SVG_ICONS.BUILD_MUSCLE_ICON },
  { key: "healthy", label: "Eat healthy", icon: SVG_ICONS.EAT_HEALTHY_ICON },
];

const ACTIVITIES = [
  { key: "sedentary", label: "Sedentary", icon: SVG_ICONS.SEDENTARY_ICON },
  {
    key: "light",
    label: "Lightly active",
    icon: SVG_ICONS.LIGHTLY_ACTIVE_ICON,
  },
  {
    key: "moderate",
    label: "Moderately active",
    icon: SVG_ICONS.BUILD_MUSCLE_ACTIVITY_ICON,
  },
  { key: "very", label: "Very active", icon: SVG_ICONS.VERY_ACTIVE_ICON },
];

const GENDERS = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
];

/** Renders an icon from the shared SVG registry by its SVG_ICONS key. */
function SvgIcon({ name, ...props }: { name: string; [k: string]: any }) {
  const Icon = SVG_ICON_COMPONENT_MAP[name];
  return Icon ? <Icon {...props} /> : null;
}

export default function EditProfileScreen({ navigation }: any) {
  const { session } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [goal, setGoal] = useState("maintain");
  const [activity, setActivity] = useState("moderate");

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    profileService
      .getProfile(session)
      .then((p) => {
        if (!p) return;
        if (p.name) setName(p.name);
        if (p.gender) setGender(p.gender);
        if (p.age) setAge(String(p.age));
        if (p.height_cm) setHeightCm(String(p.height_cm));
        if (p.weight_kg) setWeightKg(String(p.weight_kg));
        if (p.goal) setGoal(p.goal);
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
      const nutrition = calculateTargets(
        gender,
        age,
        heightCm,
        weightKg,
        goal,
        activity,
      );
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
      setError(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: SCREEN_BG }]}
        edges={["top"]}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={TEXT_DARK} />
        </View>
      </SafeAreaView>
    );
  }

  const nutrition = calculateTargets(
    gender,
    age,
    heightCm,
    weightKg,
    goal,
    activity,
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: SCREEN_BG }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={ms(20)} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { opacity: saving ? 0.5 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={ORANGE} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={TEXT_MUTED}
              autoCapitalize="words"
            />
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => {
                const selected = gender === g.key;
                return (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setGender(g.key)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Age / Height / Weight */}
          <View style={styles.row3}>
            <View style={styles.field}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="25"
                placeholderTextColor={TEXT_MUTED}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="170"
                placeholderTextColor={TEXT_MUTED}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="70"
                placeholderTextColor={TEXT_MUTED}
              />
            </View>
          </View>

          {/* Goal */}
          <View style={styles.section}>
            <Text style={styles.label}>Goal</Text>
            <View style={styles.gridRow}>
              {GOALS.map((g) => {
                const selected = goal === g.key;
                return (
                  <TouchableOpacity
                    key={g.key}
                    style={[
                      styles.gridChip,
                      selected && styles.gridChipSelected,
                    ]}
                    onPress={() => setGoal(g.key)}
                    activeOpacity={0.75}
                  >
                    <SvgIcon
                      name={g.icon}
                      color={selected ? TEXT_DARK : TEXT_MUTED}
                    />
                    <Text
                      style={[
                        styles.gridChipText,
                        selected && styles.gridChipTextSelected,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={styles.label}>Activity</Text>
            <View style={styles.gridRow}>
              {ACTIVITIES.map((a) => {
                const selected = activity === a.key;
                return (
                  <TouchableOpacity
                    key={a.key}
                    style={[
                      styles.gridChip,
                      selected && styles.gridChipSelected,
                    ]}
                    onPress={() => setActivity(a.key)}
                    activeOpacity={0.75}
                  >
                    <SvgIcon
                      name={a.icon}
                      color={selected ? TEXT_DARK : TEXT_MUTED}
                    />
                    <Text
                      style={[
                        styles.gridChipText,
                        selected && styles.gridChipTextSelected,
                      ]}
                    >
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Recalculated targets preview */}
          <View style={styles.section}>
            <Text style={styles.label}>Daily targets</Text>
            <View style={styles.targetsCard}>
              <TargetCell
                icon={fireImg}
                bg="#FCEBDD"
                value={nutrition.calories}
                unit="kcal"
                label="Calories"
              />
              <TargetCell
                icon={muscleImg}
                bg="#F8E3E3"
                value={nutrition.protein}
                unit="g"
                label="Protein"
              />
              <TargetCell
                icon={leafImg}
                bg="#E8EDE3"
                value={nutrition.carbs}
                unit="g"
                label="Carbs"
              />
              <TargetCell
                icon={dropImg}
                bg="#FBEFD8"
                value={nutrition.fat}
                unit="g"
                label="Fat"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TargetCell({ icon, bg, value, unit, label }: any) {
  return (
    <View style={styles.targetCell}>
      <View style={[styles.targetIconBg, { backgroundColor: bg }]}>
        <Image source={icon} style={styles.targetIcon} resizeMode="contain" />
      </View>
      <Text style={styles.targetValue}>
        {value}
        <Text style={styles.targetUnit}> {unit}</Text>
      </Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(20),
    paddingVertical: ms(12),
  },
  backBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(100),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },
  saveBtn: { width: ms(36), alignItems: "flex-end" },
  saveBtnText: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: ORANGE,
  },

  content: {
    paddingHorizontal: ms(20),
    paddingTop: ms(12),
    paddingBottom: ms(60),
  },

  errorBanner: {
    borderRadius: RADIUS.md,
    padding: ms(12),
    marginBottom: ms(20),
    backgroundColor: "#FBE3E3",
  },
  errorText: { fontSize: ms(14), fontWeight: FONTS.medium, color: "#E04D4D" },

  section: { marginBottom: ms(20) },
  label: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: BRAND_PURPLE,
    marginBottom: ms(8),
  },

  input: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    borderRadius: ms(12),
    paddingHorizontal: ms(14),
    paddingVertical: ms(14),
    fontSize: ms(15),
    color: BRAND_PURPLE,
  },

  chipRow: { flexDirection: "row", gap: ms(8) },
  chip: {
    flex: 1,
    paddingVertical: ms(14),
    borderRadius: ms(16),
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipSelected: { borderColor: "#7F6C64" },
  chipText: { fontSize: ms(14), fontWeight: FONTS.medium, color: TEXT_DARK },
  chipTextSelected: { color: TEXT_DARK, fontWeight: FONTS.bold },

  row3: { flexDirection: "row", gap: ms(10), marginBottom: ms(20) },
  field: { flex: 1 },

  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: ms(8) },
  gridChip: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    paddingHorizontal: ms(14),
    paddingVertical: ms(16),
    borderRadius: ms(16),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#4930261A",
  },
  gridChipSelected: { borderColor: "#7F6C64" },
  gridChipText: {
    flex: 1,
    fontSize: ms(14),
    fontWeight: FONTS.medium,
    lineHeight: ms(22),
    color: "#7F6C64",
  },
  gridChipTextSelected: { color: TEXT_DARK, fontWeight: FONTS.bold },

  targetsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: ms(20),
    paddingVertical: ms(18),
    paddingHorizontal: ms(8),
  },
  targetCell: { flex: 1, alignItems: "center" },
  targetIconBg: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ms(10),
  },
  targetIcon: { width: ms(20), height: ms(20) },
  targetValue: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },
  targetUnit: {
    fontSize: ms(14),
    fontWeight: FONTS.medium,
    lineHeight: ms(22),
    color: TEXT_DARK,
  },
  targetLabel: {
    fontSize: ms(10),
    lineHeight: ms(12),
    fontWeight: FONTS.medium,
    color: "#7F6C64",
    marginTop: ms(3),
  },
});
