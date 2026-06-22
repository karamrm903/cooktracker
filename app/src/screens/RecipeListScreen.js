import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { FONTS, RADIUS, SHADOWS } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { exploreService } from "../services/exploreService";

const SCREEN_BG = "#FCF7F3";
const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const MACRO_COLORS = { protein: "#EF4444", carbs: "#22C55E", fat: "#EAB308" };

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

function ListRecipeCard({ item, session, colors, t }) {
  const [img, setImg] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const rating = useMemo(() => getRating(item.name), [item.name]);

  useEffect(() => {
    let cancelled = false;
    exploreService
      .fetchRecipeImage(session, item.id, item.name)
      .then((url) => {
        if (cancelled || !url) return;
        Image.prefetch(url).catch(() => {});
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
          <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={{ fontSize: 26 }}>{item.emoji ?? "🍽️"}</Text>
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
            size={18}
            color={colors.textMuted}
          />
          <TouchableOpacity
            onPress={() => setSaved((s) => !s)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={18}
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: SCREEN_BG }]} edges={["top", "bottom"]}>
      <Image source={leafImg} style={styles.decorLeaf} resizeMode="contain" />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface }, SHADOWS.sm]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
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
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  decorLeaf: {
    position: "absolute",
    right: -30,
    top: "32%",
    width: 130,
    height: 130,
    opacity: 0.5,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: FONTS.semibold },

  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 14 },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 12 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: RADIUS.md },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: FONTS.semibold, marginBottom: 4 },
  cardMeta: { fontSize: 12 },
  cardActions: { alignItems: "center", justifyContent: "space-between", height: 48, paddingVertical: 2 },

  expandBox: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  expandKcal: { fontSize: 16, fontWeight: FONTS.bold, marginBottom: 10 },
  bar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 14 },
  barFill: { flex: 1, flexDirection: "row" },
  macroRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  dot: { width: 9, height: 9, borderRadius: 4.5, marginRight: 10 },
  macroLabel: { flex: 1, fontSize: 14 },
  macroVal: { fontSize: 14, fontWeight: FONTS.bold },
});
