import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";

import { moderateScale as ms } from "../utils/responsive";
import {
  FONTS,
  FONT_SIZES,
  RADIUS,
  SHADOWS,
  SPACING,
} from "../constants/theme";

const SCREEN_BG = "#FCF7F3";
const HEADING = "#493026";
const SUB_TEXT = "#8B7B70";
const CARD_BG = "#FFFFFF";
const CHECK_BG = "#7CB342";

// Canonical category ordering + display labels for the section headers.
const CATEGORY_ORDER = [
  "veggies",
  "meat & fish",
  "dairy & eggs",
  "bakery",
  "pasta, rice & noodles",
  "pantry",
  "other",
];
const CATEGORY_LABEL = {
  veggies: "VEGGIES",
  "meat & fish": "MEAT & FISH",
  "dairy & eggs": "DAIRY & EGGS",
  bakery: "BAKERY",
  "pasta, rice & noodles": "PASTA, RICE & NOODLES",
  pantry: "PANTRY",
  other: "OTHER",
};

export default function GroceryListScreen({ navigation }) {
  const shoppingList = useSelector((s) => s.aiRecipe.shoppingList) || [];
  const [checked, setChecked] = useState({});

  const grouped = useMemo(() => {
    const map = new Map();
    shoppingList.forEach((item) => {
      const key = (item.category || "other").toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    // Sort: canonical order first, then any unknown categories at the end.
    const known = CATEGORY_ORDER.filter((c) => map.has(c));
    const unknown = [...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c));
    return [...known, ...unknown].map((c) => ({
      category: c,
      items: map.get(c),
    }));
  }, [shoppingList]);

  const totalItems = shoppingList.length;
  const doneCount = Object.values(checked).filter(Boolean).length;

  const toggle = useCallback((key) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.iconBtn, SHADOWS.sm]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={ms(20)} color={HEADING} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping list</Text>
        <View style={styles.iconBtn} />
      </View>

      {totalItems === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={ms(48)} color={SUB_TEXT} />
          <Text style={styles.emptyText}>
            No shopping list yet. Generate a weekly plan first.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              {doneCount} / {totalItems} items
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {grouped.map(({ category, items }) => (
              <View key={category} style={styles.section}>
                <Text style={styles.sectionHeader}>
                  {CATEGORY_LABEL[category] ?? category.toUpperCase()}
                </Text>
                {items.map((item, i) => {
                  const key = `${category}:${item.name}:${i}`;
                  const isDone = !!checked[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.itemRow, SHADOWS.sm]}
                      activeOpacity={0.75}
                      onPress={() => toggle(key)}
                    >
                      <View style={styles.itemEmojiWrap}>
                        <Text style={styles.itemEmoji}>
                          {item.emoji || "🛒"}
                        </Text>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[
                            styles.itemName,
                            isDone && styles.itemNameDone,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {!!item.qty && (
                          <Text style={styles.itemQty}>{item.qty}</Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.check,
                          isDone && { backgroundColor: CHECK_BG, borderColor: CHECK_BG },
                        ]}
                      >
                        {isDone && (
                          <Ionicons
                            name="checkmark"
                            size={ms(14)}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(12),
  },
  iconBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: ms(16),
    fontWeight: FONTS.semibold,
    color: HEADING,
  },

  progressPill: {
    alignSelf: "center",
    paddingHorizontal: ms(14),
    paddingVertical: ms(6),
    borderRadius: RADIUS.full,
    backgroundColor: "#E1EADA",
    marginBottom: ms(10),
  },
  progressText: {
    fontSize: ms(12),
    fontWeight: FONTS.semibold,
    color: HEADING,
  },

  scroll: { flex: 1 },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: ms(40),
  },
  section: { marginBottom: ms(20) },
  sectionHeader: {
    fontSize: ms(11),
    fontWeight: FONTS.bold,
    color: SUB_TEXT,
    letterSpacing: 1.2,
    marginBottom: ms(10),
    marginLeft: ms(4),
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(12),
    padding: ms(12),
    borderRadius: RADIUS.lg,
    backgroundColor: CARD_BG,
    marginBottom: ms(8),
  },
  itemEmojiWrap: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.md,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  itemEmoji: { fontSize: ms(20) },
  itemInfo: { flex: 1, gap: ms(2) },
  itemName: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONTS.bold,
    color: HEADING,
  },
  itemNameDone: {
    textDecorationLine: "line-through",
    color: SUB_TEXT,
  },
  itemQty: {
    fontSize: ms(12),
    color: SUB_TEXT,
    fontWeight: FONTS.medium,
  },
  check: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    borderWidth: 1.5,
    borderColor: "#D8CBC0",
    alignItems: "center",
    justifyContent: "center",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: ms(10),
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.small,
    color: SUB_TEXT,
    textAlign: "center",
    lineHeight: ms(18),
  },
});
