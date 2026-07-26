import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import {
  LEGAL_CONTENT,
  LegalType,
  LegalBlock,
} from "../constants/legalContent";

const SCREEN_BG = "#FCF7F3";
const TEXT_DARK = "#493026";
const TEXT_BODY = "#5C4740";
const TEXT_MUTED = "#7F6C64";

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "heading":
      return <Text style={styles.heading}>{block.text}</Text>;
    case "paragraph":
      return <Text style={styles.paragraph}>{block.text}</Text>;
    case "bullets":
      return (
        <View style={styles.bulletList}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      );
  }
}

export default function LegalScreen({ navigation, route }: any) {
  const type: LegalType = route?.params?.type === "terms" ? "terms" : "privacy";
  const doc = LEGAL_CONTENT[type];

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: SCREEN_BG }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={ms(20)} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{doc.headerTitle}</Text>
        <View style={{ width: ms(36) }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.lastUpdated}>Last updated: {doc.lastUpdated}</Text>

        {doc.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
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
  headerTitle: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },

  content: {
    paddingHorizontal: ms(20),
    paddingTop: ms(12),
    paddingBottom: ms(48),
  },

  title: {
    fontSize: ms(18),
    lineHeight: ms(26),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },
  lastUpdated: {
    fontSize: ms(14),
    lineHeight: ms(22),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
    marginTop: ms(10),
    marginBottom: ms(8),
  },

  heading: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
    marginTop: ms(24),
  },
  paragraph: {
    fontSize: ms(14),
    lineHeight: ms(22),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
    marginTop: ms(12),
  },

  bulletList: { marginTop: ms(12), gap: ms(8) },
  bulletRow: { flexDirection: "row", paddingRight: ms(4) },
  bulletDot: {
    fontSize: ms(14),
    lineHeight: ms(22),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
    width: ms(16),
    textAlign: "center",
  },
  bulletText: {
    flex: 1,
    fontSize: ms(14),
    lineHeight: ms(22),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
  },
});
