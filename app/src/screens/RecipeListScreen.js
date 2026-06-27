import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

const IMG_BLURHASH = "L6Pj0^jE.AyE_3t7t7R**0o#DgR4";
const IMG_CACHE_POLICY = "memory-disk";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { FONTS, FONT_SIZES, RADIUS, SHADOWS, SPACING } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import { useTheme } from "../context/ThemeContext";
import { useMealLogs } from "../context/MealLogsContext";
import { exploreService } from "../services/exploreService";
import CommonAlertModal from "../components/CommonModal";

const SCREEN_BG = "#FCF7F3";
const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const MACRO_COLORS = { protein: "#EF4444", carbs: "#22C55E", fat: "#EAB308" };

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getRating(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (4.5 + Math.abs(hash % 5) / 10).toFixed(1);
}

function ListRecipeCard({ item, session, colors, t, saved, onSave }) {
  const [img, setImg] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const rating = useMemo(() => getRating(item.name), [item.name]);

  useEffect(() => {
    let cancelled = false;
    exploreService
      .fetchRecipeImageCached(session, item.id, item.name)
      .then((url) => {
        if (cancelled || !url) return;
        ExpoImage.prefetch(url, { cachePolicy: IMG_CACHE_POLICY }).catch(() => {});
        setImg(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id, session]);

  const p = item.macros?.protein ?? 0;
  const cb = item.macros?.carbs ?? 0;
  const f = item.macros?.fat ?? 0;
  const macroTotal = p * 4 + cb * 4 + f * 9;

  const macros = [
    { l: "Protein", v: p, c: MACRO_COLORS.protein },
    { l: "Carbs", v: cb, c: MACRO_COLORS.carbs },
    { l: "Fat", v: f, c: MACRO_COLORS.fat },
  ];

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.cardRow} activeOpacity={0.7} onPress={toggle}>
        {img ? (
          <ExpoImage
            source={{ uri: img }}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy={IMG_CACHE_POLICY}
            placeholder={{ blurhash: IMG_BLURHASH }}
            transition={150}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={{ fontSize: ms(26) }}>{item.emoji ?? "🍽️"}</Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {item.calories} kcal · {item.time || "45 min"} · ★ {rating}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={ms(18)}
            color={colors.textMuted}
          />
          <TouchableOpacity
            onPress={() => onSave?.(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={ms(18)}
              color={saved ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.expandBox, { borderColor: colors.border }]}>
          <Text style={[styles.expandKcal, { color: colors.text }]}>{item.calories} kcal</Text>

          <View style={[styles.bar, { backgroundColor: colors.surfaceAlt }]}>
            {macroTotal > 0 && (
              <View style={styles.barFill}>
                <View style={{ flex: p * 4, backgroundColor: MACRO_COLORS.protein }} />
                <View style={{ flex: cb * 4, backgroundColor: MACRO_COLORS.carbs }} />
                <View style={{ flex: f * 9, backgroundColor: MACRO_COLORS.fat }} />
              </View>
            )}
          </View>

          {macros.map((m) => (
            <View key={m.l} style={styles.macroRow}>
              <View style={[styles.dot, { backgroundColor: m.c }]} />
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{m.l}</Text>
              <Text style={[styles.macroVal, { color: colors.text }]}>{m.v}g</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function RecipeListScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const session = useSelector((state) => state.auth.session);
  const { title = "", items = [] } = route.params ?? {};

  const { meals, addMeal } = useMealLogs() || {};
  // A recipe is "saved" once it's logged into today's dashboard meals.
  const savedNames = useMemo(
    () => new Set((meals ?? []).map((m) => m.name)),
    [meals],
  );

  const [savePickerRecipe, setSavePickerRecipe] = useState(null);
  const [savingMeal, setSavingMeal] = useState(false);
  const [savingType, setSavingType] = useState(null);
  const [resultModal, setResultModal] = useState({
    visible: false,
    variant: "success",
    message: "",
  });

  function handleSaveRequest(recipe) {
    setSavePickerRecipe(recipe);
  }

  async function logRecipeAsMeal(mealType) {
    const recipe = savePickerRecipe;
    if (!recipe || savingMeal || !addMeal) return;
    setSavingMeal(true);
    setSavingType(mealType);
    const now = new Date();
    const p = recipe.macros?.protein ?? 0;
    const c = recipe.macros?.carbs ?? 0;
    const f = recipe.macros?.fat ?? 0;
    const meal = {
      name: recipe.name,
      calories: recipe.calories ?? 0,
      protein: p,
      carbs: c,
      fat: f,
      macros: { protein: p, carbs: c, fat: f },
      mealType,
      meal: MEAL_LABELS[mealType],
      time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      loggedAt: now.toISOString(),
      dateKey: now.toISOString().slice(0, 10),
      source: "recipe",
      emoji: recipe.emoji ?? null,
      recipeId: recipe._dbId ?? recipe.id,
    };
    try {
      await addMeal(meal);
      setSavePickerRecipe(null);
      setResultModal({
        visible: true,
        variant: "success",
        message: `${recipe.name} added to ${MEAL_LABELS[mealType]}.`,
      });
    } catch (err) {
      setSavePickerRecipe(null);
      setResultModal({
        visible: true,
        variant: "error",
        message: err?.message || "Could not log this recipe. Try again.",
      });
    } finally {
      setSavingMeal(false);
      setSavingType(null);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: SCREEN_BG }]} edges={["top", "bottom"]}>
      <Image source={leafImg} style={styles.decorLeaf} resizeMode="contain" />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface }, SHADOWS.sm]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={ms(20)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <ListRecipeCard
            key={item.id}
            item={item}
            session={session}
            colors={colors}
            t={t}
            saved={savedNames.has(item.name)}
            onSave={handleSaveRequest}
          />
        ))}
      </ScrollView>

      {/* Save → choose meal slot (same picker as Explore / SearchFood) */}
      <Modal
        visible={!!savePickerRecipe}
        transparent
        animationType="fade"
        onRequestClose={() => !savingMeal && setSavePickerRecipe(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !savingMeal && setSavePickerRecipe(null)}
        >
          <View
            style={[
              styles.mealPickerModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.mealPickerTitle, { color: colors.text }]}>
              {t("explore.saveTo", { defaultValue: "Save to" })}
            </Text>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt}
                style={[
                  styles.mealPickerOption,
                  savingMeal && savingType !== mt && { opacity: 0.4 },
                ]}
                disabled={savingMeal}
                onPress={() => logRecipeAsMeal(mt)}
                activeOpacity={0.7}
              >
                <Text style={[styles.mealPickerOptionText, { color: colors.text }]}>
                  {t(`mealType.${mt}`, { defaultValue: MEAL_LABELS[mt] })}
                </Text>
                {savingType === mt ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="add" size={ms(18)} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success / error after logging */}
      <CommonAlertModal
        visible={resultModal.visible}
        variant={resultModal.variant}
        title={
          resultModal.variant === "success"
            ? t("common.success", { defaultValue: "Logged!" })
            : t("common.error", { defaultValue: "Error" })
        }
        message={resultModal.message}
        primaryText={t("common.ok", { defaultValue: "Done" })}
        onPrimary={() => setResultModal((m) => ({ ...m, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  decorLeaf: {
    position: "absolute",
    right: -ms(30),
    top: "32%",
    width: ms(130),
    height: ms(130),
    opacity: 0.5,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(12),
  },
  backBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: ms(16), fontWeight: FONTS.semibold },

  content: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: ms(40), gap: ms(14) },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: ms(12) },
  cardRow: { flexDirection: "row", alignItems: "center", gap: ms(12) },
  thumb: { width: ms(56), height: ms(56), borderRadius: RADIUS.md },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FONT_SIZES.body, fontWeight: FONTS.semibold, marginBottom: SPACING.xs },
  cardMeta: { fontSize: ms(12) },
  cardActions: { alignItems: "center", justifyContent: "space-between", height: ms(48), paddingVertical: ms(2) },

  expandBox: {
    marginTop: ms(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: ms(14),
  },
  expandKcal: { fontSize: ms(16), fontWeight: FONTS.bold, marginBottom: ms(10) },
  bar: { height: ms(6), borderRadius: ms(3), overflow: "hidden", marginBottom: ms(14) },
  barFill: { flex: 1, flexDirection: "row" },
  macroRow: { flexDirection: "row", alignItems: "center", paddingVertical: ms(5) },
  dot: { width: ms(9), height: ms(9), borderRadius: ms(4.5), marginRight: ms(10) },
  macroLabel: { flex: 1, fontSize: FONT_SIZES.label },
  macroVal: { fontSize: FONT_SIZES.label, fontWeight: FONTS.bold },

  // Save → meal-type picker modal (mirrors ExploreScreen / SearchFoodScreen)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mealPickerModal: {
    width: ms(260),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: SPACING.sm,
  },
  mealPickerTitle: {
    fontSize: FONT_SIZES.small,
    fontWeight: FONTS.semibold,
    textAlign: "center",
    paddingVertical: ms(10),
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mealPickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(18),
    paddingVertical: ms(13),
  },
  mealPickerOptionText: { fontSize: FONT_SIZES.body },
});
