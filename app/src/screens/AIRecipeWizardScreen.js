import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import { moderateScale as ms } from "../utils/responsive";
import {
  FONTS,
  FONT_SIZES,
  RADIUS,
  SPACING,
} from "../constants/theme";
import OptionTile from "../components/ai-recipe/OptionTile";
import BudgetSlider from "../components/ai-recipe/BudgetSlider";
import WizardProgressBar from "../components/ai-recipe/WizardProgressBar";
import {
  resetWizard,
  setStep,
  setBudget,
  toggleVibe,
  toggleDietary,
  toggleEquipment,
} from "../store/slices/aiRecipeSlice";

const SCREEN_BG = "#FCF9F3";
const CTA_BG = "#7CB342";
const CTA_DISABLED = "#CFE1B4";
const HEADING = "#1F2A20";
const SUB_TEXT = "#8B8B8B";

const { width: WIDTH } = Dimensions.get("window");

// Vibes: pastel palette (top-left icon layout).
const VIBES = [
  { id: "quick_easy", label: "Quick & Easy", icon: "⚡️", color: "#E6F1D3" },
  { id: "high_protein", label: "High Protein", icon: "💪", color: "#FFE0B2" },
  { id: "healthy_comfort", label: "Healthy Comfort", icon: "🥗", color: "#FFF3C4" },
  { id: "family_favourites", label: "Family Favourites", icon: "👨‍👩‍👧", color: "#FFD5DA" },
  { id: "british_classics", label: "British Classics", icon: "🇬🇧", color: "#DEEBF9" },
  { id: "low_calorie", label: "Low Calorie", icon: "🍃", color: "#E1F5D6" },
  { id: "gut_friendly", label: "Gut Friendly", icon: "🌿", color: "#E1EADA" },
  { id: "fakeaway", label: "Fakeaway", icon: "🥡", color: "#FFF3C4" },
];

// Dietary: neutral tiles (centered layout).
const DIETARY = [
  { id: "none", label: "None", icon: "🍽️" },
  { id: "veggie", label: "Veggie", icon: "🥕" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "pescatarian", label: "Pescatarian", icon: "🐟" },
  { id: "gluten_free", label: "Gluten free", icon: "🌾" },
  { id: "dairy_free", label: "Dairy free", icon: "🥛" },
  { id: "keto", label: "Keto", icon: "🥑" },
  { id: "nut_free", label: "Nut free", icon: "🥜" },
];

// Equipment: neutral tiles (centered layout).
const EQUIPMENT = [
  { id: "oven", label: "Oven", icon: "🔥" },
  { id: "stovetop", label: "Stovetop", icon: "🍳" },
  { id: "microwave", label: "Microwave", icon: "📡" },
  { id: "air_fryer", label: "Air Fryer", icon: "🌀" },
  { id: "mixer", label: "Mixer", icon: "🥣" },
  { id: "blender", label: "Blender", icon: "🍹" },
  { id: "otg", label: "OTG", icon: "🔲" },
  { id: "pressure_cooker", label: "Pressure Cooker", icon: "♨️" },
  { id: "slow_cooker", label: "Slow Cooker", icon: "🕰️" },
  { id: "grill", label: "Grill", icon: "🥩" },
];

const MAX_VIBES = 3;
const TOTAL_STEPS = 4;

export default function AIRecipeWizardScreen({ navigation }) {
  const dispatch = useDispatch();
  const { step, budget, vibes, dietary, equipment } = useSelector(
    (s) => s.aiRecipe,
  );

  const slide = useRef(new Animated.Value(step * -WIDTH)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: step * -WIDTH,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
      mass: 0.7,
    }).start();
  }, [step, slide]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", () => {
      dispatch(resetWizard());
    });
    return unsub;
  }, [navigation, dispatch]);

  const canContinue = () => {
    switch (step) {
      case 0:
        return budget > 0;
      case 1:
        return vibes.length > 0;
      case 2:
        return dietary.length > 0;
      case 3:
        return equipment.length > 0;
      default:
        return false;
    }
  };

  function onBack() {
    if (step === 0) {
      navigation.goBack();
    } else {
      dispatch(setStep(step - 1));
    }
  }

  function onContinue() {
    if (!canContinue()) return;
    if (step < TOTAL_STEPS - 1) {
      dispatch(setStep(step + 1));
    } else {
      navigation.replace("AIRecipeResults", {
        budget,
        vibes,
        dietary,
        equipment,
      });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={ms(22)} color={HEADING} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <WizardProgressBar step={step} total={TOTAL_STEPS} />
        </View>
      </View>

      {/* Slides */}
      <View style={styles.slidesWindow}>
        <Animated.View
          style={[
            styles.slidesRow,
            {
              width: WIDTH * TOTAL_STEPS,
              transform: [{ translateX: slide }],
            },
          ]}
        >
          <Slide width={WIDTH}>
            <StepBudget budget={budget} onChange={(v) => dispatch(setBudget(v))} />
          </Slide>
          <Slide width={WIDTH}>
            <StepVibes vibes={vibes} onToggle={(id) => dispatch(toggleVibe(id))} />
          </Slide>
          <Slide width={WIDTH}>
            <StepDietary
              dietary={dietary}
              onToggle={(id) => dispatch(toggleDietary(id))}
            />
          </Slide>
          <Slide width={WIDTH}>
            <StepEquipment
              equipment={equipment}
              onToggle={(id) => dispatch(toggleEquipment(id))}
            />
          </Slide>
        </Animated.View>
      </View>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.cta,
            { backgroundColor: canContinue() ? CTA_BG : CTA_DISABLED },
          ]}
          activeOpacity={0.85}
          onPress={onContinue}
          disabled={!canContinue()}
        >
          <Text style={styles.ctaText}>continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Slide wrapper ────────────────────────────────────────────────────────────
function Slide({ children, width }) {
  return <View style={{ width }}>{children}</View>;
}

// ── Steps ────────────────────────────────────────────────────────────────────
function StepBudget({ budget, onChange }) {
  return (
    <ScrollView
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <StepHeader
        title="give us your budget"
        subtitle="we'll keep your dinners under it"
      />
      <BudgetSlider value={budget} onChange={onChange} min={20} max={200} />
    </ScrollView>
  );
}

function StepVibes({ vibes, onToggle }) {
  const limitReached = vibes.length >= MAX_VIBES;
  return (
    <ScrollView
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <StepHeader
        title="what kind of vibe?"
        subtitle={`choose up to ${MAX_VIBES} options for this week's meals`}
      />
      <TileGrid>
        {VIBES.map((v) => {
          const active = vibes.includes(v.id);
          return (
            <OptionTile
              key={v.id}
              label={v.label}
              icon={v.icon}
              color={v.color}
              variant="pastel"
              align="topLeft"
              active={active}
              disabled={limitReached && !active}
              onPress={() => onToggle(v.id)}
            />
          );
        })}
      </TileGrid>
    </ScrollView>
  );
}

function StepDietary({ dietary, onToggle }) {
  return (
    <ScrollView
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <StepHeader
        title="any dietary needs?"
        subtitle="pick all that apply"
      />
      <TileGrid>
        {DIETARY.map((d) => (
          <OptionTile
            key={d.id}
            label={d.label}
            icon={d.icon}
            variant="neutral"
            align="center"
            active={dietary.includes(d.id)}
            onPress={() => onToggle(d.id)}
          />
        ))}
      </TileGrid>
    </ScrollView>
  );
}

function StepEquipment({ equipment, onToggle }) {
  return (
    <ScrollView
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <StepHeader
        title="what's in your kitchen?"
        subtitle="select every tool you have"
      />
      <TileGrid>
        {EQUIPMENT.map((eq) => (
          <OptionTile
            key={eq.id}
            label={eq.label}
            icon={eq.icon}
            variant="neutral"
            align="center"
            active={equipment.includes(eq.id)}
            onPress={() => onToggle(eq.id)}
          />
        ))}
      </TileGrid>
    </ScrollView>
  );
}

function StepHeader({ title, subtitle }) {
  return (
    <View style={styles.stepHeader}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

// Two-column tile grid.
function TileGrid({ children }) {
  const items = React.Children.toArray(children);
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return (
    <View style={styles.grid}>
      {rows.map((row, idx) => (
        <View key={idx} style={styles.gridRow}>
          {row[0]}
          {row[1] ?? <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(12),
    gap: ms(14),
  },
  backBtn: {
    width: ms(36),
    height: ms(36),
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { flex: 1, paddingRight: ms(8) },

  slidesWindow: { flex: 1, overflow: "hidden" },
  slidesRow: { flexDirection: "row", flex: 1 },
  slideContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: ms(16),
    paddingBottom: ms(24),
  },

  stepHeader: { marginBottom: ms(24) },
  title: {
    fontSize: ms(28),
    fontWeight: FONTS.bold,
    color: HEADING,
    letterSpacing: -0.6,
    lineHeight: ms(34),
    marginBottom: ms(6),
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: SUB_TEXT,
    lineHeight: ms(20),
  },

  grid: { gap: ms(12) },
  gridRow: { flexDirection: "row", gap: ms(12) },

  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: ms(10),
    paddingBottom: ms(12),
  },
  cta: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(18),
    borderRadius: RADIUS.full,
    shadowColor: CTA_BG,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaText: {
    fontSize: ms(16),
    fontWeight: FONTS.bold,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
