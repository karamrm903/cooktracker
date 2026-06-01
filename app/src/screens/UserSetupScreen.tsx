import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setOnboardingStatus,
  setPersistedAccessToken,
  setAuthSession,
} from "../store/slices/authSlice";
import { authService } from "../services/auth.service";
import { profileService } from "../services/profile.service";
import { useLanguage } from "../context/LanguageContext";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import SafeAreaViewCustom from "../components/atoms/SafeAreaViewCustom";
import {
  BRAND_COLOR,
  DEFAULT_BG,
  TEXT_DARK,
  TEXT_MUTED,
  PLACEHOLDER,
  ICON_COLOR,
  INPUT_BORDER,
} from "../styles/colors";

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  UserSetup: undefined;
  AppleHealth: undefined;
  Subscription: undefined;
  Login: undefined;
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "UserSetup">;
};

const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const bottomImg = require("../../assets/webp/UserInfoBottom.webp");
const fireImg = require("../../assets/webp/Fire.webp");
const proteinImg = require("../../assets/webp/Protein.webp");
const carbsImg = require("../../assets/webp/Carbs.webp");
const fatImg = require("../../assets/webp/Fat.webp");

const GOALS = [
  { key: "lose", img: require("../../assets/webp/LooseWeight.webp") },
  { key: "maintain", img: require("../../assets/webp/MaintainWeight.webp") },
  { key: "muscle", img: require("../../assets/webp/GainMuscle.webp") },
  { key: "healthy", img: require("../../assets/webp/EatHealthier.webp") },
] as const;

const ACTIVITIES = [
  { key: "sedentary", img: require("../../assets/webp/Sedantary.webp") },
  { key: "light", img: require("../../assets/webp/LightlyActive.webp") },
  { key: "moderate", img: require("../../assets/webp/ModeratelyActive.webp") },
  { key: "very", img: require("../../assets/webp/VeryActive.webp") },
] as const;

const TOTAL_STEPS = 4;

// Mifflin-St Jeor
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
  return ((parseFloat(ft) || 0) * 12 + (parseFloat(inches) || 0)) * 2.54;
}

export default function UserSetupScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { language } = useLanguage();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [gender, setGender] = useState<"male" | "female" | "other" | null>(
    null,
  );
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [goal, setGoal] = useState<
    "lose" | "maintain" | "muscle" | "healthy" | null
  >(null);
  const [activity, setActivity] = useState<
    "sedentary" | "light" | "moderate" | "very" | null
  >(null);

  const normalizedHeightCm =
    unitSystem === "metric"
      ? heightCm
      : String(feetInchesToCm(heightFt, heightIn));
  const normalizedWeightKg =
    unitSystem === "metric" ? weightKg : String(lbsToKg(weightLbs));

  const nutrition = calculateTargets(
    gender ?? "male",
    age,
    normalizedHeightCm,
    normalizedWeightKg,
    goal ?? "maintain",
    activity ?? "moderate",
  );

  function isComplete() {
    switch (step) {
      case 1:
        return (
          gender !== null &&
          age !== "" &&
          (unitSystem === "metric"
            ? heightCm !== "" && weightKg !== ""
            : heightFt !== "" && heightIn !== "" && weightLbs !== "")
        );
      case 2:
        return goal !== null;
      case 3:
        return activity !== null;
      case 4:
        return true;
      default:
        return false;
    }
  }

  async function handleContinue() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }

    const payload = {
      gender: gender ?? undefined,
      age: parseInt(age) || undefined,
      height_cm: Math.round(parseFloat(normalizedHeightCm)) || undefined,
      weight_kg: Math.round(parseFloat(normalizedWeightKg)) || undefined,
      goal: goal ?? undefined,
      activity: activity ?? undefined,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    };

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await authService.getSession();
      if (session?.access_token) {
        try {
          await profileService.updateProfile(session, {
            ...payload,
            locale: language,
          });
        } catch (apiErr) {
          console.error("Failed to sync profile:", apiErr);
        }
        await authService.persistToken(session.access_token);
        dispatch(setPersistedAccessToken(session.access_token));
        dispatch(setAuthSession({ user: session.user, session }));
        await AsyncStorage.setItem("hasCompletedOnboarding", "true");
        dispatch(setOnboardingStatus(true));
      } else {
        navigation.navigate("Login");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  }

  return (
    <SafeAreaViewCustom backgroundColor={DEFAULT_BG} statusBarBg={DEFAULT_BG}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Decorative top-right leaf */}
        <View style={styles.leafDecor} pointerEvents="none">
          <Image source={leafImg} style={styles.fillImg} resizeMode="contain" />
        </View>

        {/* Decorative bottom-right cloth */}
        <View style={styles.bottomDecor} pointerEvents="none">
          <Image
            source={bottomImg}
            style={styles.fillImg}
            resizeMode="contain"
          />
        </View>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.stepCounter}>
            {t("userSetup.stepOf", { step, total: TOTAL_STEPS })}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(step / TOTAL_STEPS) * 100}%` },
            ]}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {t(`userSetup.steps.${step}.title`)}
            </Text>
            <Text style={styles.subtitle}>
              {t(`userSetup.steps.${step}.subtitle`)}
            </Text>
          </View>

          {step === 1 && (
            <View style={styles.stepContent}>
              {/* Gender */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t("userSetup.genderLabel")}</Text>
                <View style={styles.chipRow}>
                  <GenderChip
                    label={t("userSetup.male")}
                    icon="male"
                    iconColor="#E07A3C"
                    active={gender === "male"}
                    onPress={() => setGender("male")}
                  />
                  <GenderChip
                    label={t("userSetup.female")}
                    icon="female"
                    iconColor="#D85F8A"
                    active={gender === "female"}
                    onPress={() => setGender("female")}
                  />
                  <GenderChip
                    label={t("userSetup.other")}
                    active={gender === "other"}
                    onPress={() => setGender("other")}
                  />
                </View>
              </View>

              {/* Age */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t("userSetup.ageLabel")}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={ICON_COLOR}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("userSetup.agePlaceholder")}
                    placeholderTextColor={PLACEHOLDER}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Units */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t("userSetup.unitsLabel")}</Text>
                <View style={styles.unitsRow}>
                  <UnitChip
                    label={t("userSetup.metric")}
                    active={unitSystem === "metric"}
                    onPress={() => setUnitSystem("metric")}
                  />
                  <UnitChip
                    label={t("userSetup.imperial")}
                    active={unitSystem === "imperial"}
                    onPress={() => setUnitSystem("imperial")}
                  />
                </View>
              </View>

              {/* Height + Weight */}
              {unitSystem === "metric" ? (
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>
                      {t("userSetup.heightLabel")}
                    </Text>
                    <View style={styles.inputWrap}>
                      <Ionicons
                        name="swap-vertical-outline"
                        size={20}
                        color={ICON_COLOR}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="cm"
                        placeholderTextColor={PLACEHOLDER}
                        value={heightCm}
                        onChangeText={setHeightCm}
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                    </View>
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>
                      {t("userSetup.weightLabel")}
                    </Text>
                    <View style={styles.inputWrap}>
                      <Ionicons
                        name="barbell-outline"
                        size={20}
                        color={ICON_COLOR}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="kg"
                        placeholderTextColor={PLACEHOLDER}
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      {t("userSetup.heightLabel")}
                    </Text>
                    <View style={styles.row}>
                      <View style={[styles.inputWrap, { flex: 1 }]}>
                        <TextInput
                          style={styles.input}
                          placeholder="ft"
                          placeholderTextColor={PLACEHOLDER}
                          value={heightFt}
                          onChangeText={setHeightFt}
                          keyboardType="number-pad"
                          maxLength={1}
                        />
                      </View>
                      <View style={[styles.inputWrap, { flex: 1 }]}>
                        <TextInput
                          style={styles.input}
                          placeholder="in"
                          placeholderTextColor={PLACEHOLDER}
                          value={heightIn}
                          onChangeText={setHeightIn}
                          keyboardType="number-pad"
                          maxLength={2}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      {t("userSetup.weightLabel")}
                    </Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.input}
                        placeholder="lbs"
                        placeholderTextColor={PLACEHOLDER}
                        value={weightLbs}
                        onChangeText={setWeightLbs}
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              {GOALS.map((g) => (
                <OptionCard
                  key={g.key}
                  img={g.img}
                  label={t(`userSetup.goals.${g.key}.label`)}
                  sub={t(`userSetup.goals.${g.key}.sub`)}
                  active={goal === g.key}
                  onPress={() => setGoal(g.key)}
                />
              ))}
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              {ACTIVITIES.map((a) => (
                <OptionCard
                  key={a.key}
                  img={a.img}
                  label={t(`userSetup.activities.${a.key}.label`)}
                  sub={t(`userSetup.activities.${a.key}.sub`)}
                  active={activity === a.key}
                  onPress={() => setActivity(a.key)}
                />
              ))}
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              {/* Calories card */}
              <View style={styles.caloriesCard}>
                <Image
                  source={fireImg}
                  style={styles.fireImg}
                  resizeMode="contain"
                />
                <Text style={styles.caloriesValue}>{nutrition.calories}</Text>
                <Text style={styles.caloriesLabel}>{t("macros.calories")}</Text>
                <Text style={styles.caloriesUnit}>
                  {t("macros.kcalPerDay")}
                </Text>
              </View>

              {/* Macros row */}
              <View style={styles.macroRow}>
                <MacroCard
                  img={proteinImg}
                  value={`${nutrition.protein}g`}
                  label={t("macros.protein")}
                />
                <MacroCard
                  img={carbsImg}
                  value={`${nutrition.carbs}g`}
                  label={t("macros.carbs")}
                />
                <MacroCard
                  img={fatImg}
                  value={`${nutrition.fat}g`}
                  label={t("macros.fat")}
                />
              </View>

              <Text style={styles.macroNote}>{t("userSetup.macroNote")}</Text>
            </View>
          )}
        </ScrollView>

        {/* Continue button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!isComplete() || submitting) && styles.continueBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isComplete() || submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {submitting ? t("common.loading") : t("userSetup.continue")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaViewCustom>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function GenderChip({
  label,
  icon,
  iconColor,
  active,
  onPress,
}: {
  label: string;
  icon?: "male" | "female";
  iconColor?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.genderChip, active && styles.genderChipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={iconColor || TEXT_DARK}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={styles.genderChipText}>{label}</Text>
    </TouchableOpacity>
  );
}

function UnitChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.unitChip, active && styles.unitChipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={active ? "radio-button-on" : "radio-button-off"}
        size={16}
        color={active ? BRAND_COLOR : ICON_COLOR}
        style={{ marginRight: 6 }}
      />
      <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function OptionCard({
  img,
  label,
  sub,
  active,
  onPress,
}: {
  img: any;
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, active && styles.optionCardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.optionIconWrap}>
        <Image source={img} style={styles.optionImg} resizeMode="contain" />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionSub}>{sub}</Text>
      </View>
      {active && (
        <View style={styles.checkDot}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function MacroCard({
  img,
  value,
  label,
}: {
  img: any;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.macroCard}>
      <Image source={img} style={styles.macroImg} resizeMode="contain" />
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = "#FFFFFF";
const CHECK_DOT = "#3D2618";

const styles = StyleSheet.create({
  leafDecor: {
    position: "absolute",
    top: 60,
    right: -10,
    width: 150,
    height: 140,
    zIndex: 0,
  },
  bottomDecor: {
    position: "absolute",
    bottom: -10,
    right: -20,
    width: 130,
    height: 130,
    zIndex: 0,
    opacity: 0.9,
  },
  fillImg: { width: "100%", height: "100%" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: "700",
    color: BRAND_COLOR,
  },

  progressTrack: {
    height: 6,
    backgroundColor: "#F7D9C0",
    marginHorizontal: 20,
    borderRadius: 3,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: BRAND_COLOR,
    borderRadius: 3,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  header: {
    paddingTop: 18,
    paddingBottom: 24,
    gap: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    fontWeight: "400",
  },

  stepContent: { gap: 18, marginTop: 16 },

  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "700", color: TEXT_DARK },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: TEXT_DARK,
  },
  row: { flexDirection: "row", gap: 12 },

  // Gender
  chipRow: { flexDirection: "row", gap: 10 },
  genderChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  genderChipActive: {
    borderColor: TEXT_DARK,
  },
  genderChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
  },

  // Units
  unitsRow: {
    flexDirection: "row",
    gap: 10,
  },
  unitChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  unitChipActive: {
    backgroundColor: "#FFE5D1",
    borderColor: "#FFE5D1",
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  unitChipTextActive: {
    color: TEXT_DARK,
    fontWeight: "700",
  },

  // Option cards (goals / activities)
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionCardActive: {
    borderColor: TEXT_DARK,
  },
  optionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FBE9D8",
    alignItems: "center",
    justifyContent: "center",
  },
  optionImg: { width: 32, height: 32 },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 16, fontWeight: "700", color: TEXT_DARK },
  optionSub: { fontSize: 13, color: TEXT_MUTED, fontWeight: "400" },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: CHECK_DOT,
    alignItems: "center",
    justifyContent: "center",
  },

  // Step 4: Calories + macros
  caloriesCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 4,
  },
  fireImg: {
    width: 56,
    height: 56,
    marginBottom: 4,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -1,
    lineHeight: 56,
  },
  caloriesLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 2,
  },
  caloriesUnit: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_MUTED,
  },

  macroRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    alignItems: "center",
  },
  macroImg: {
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.5,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_MUTED,
  },
  macroNote: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: 4,
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  continueBtn: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
