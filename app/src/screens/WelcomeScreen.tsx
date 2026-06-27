import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SafeAreaViewCustom from "../components/atoms/SafeAreaViewCustom";
import LanguagePickerModal from "../components/LanguagePickerModal";
import { useLanguage } from "../context/LanguageContext";
import { LANGUAGE_META } from "../i18n";
import { BRAND_COLOR, DEFAULT_BG } from "../styles/colors";
import { FONT_SIZES, RADIUS, SPACING } from "../constants/theme";
import { moderateScale as ms, verticalScale as vs } from "../utils/responsive";

const heroImage = require("../../assets/webp/WelcomeScreen.webp");
const underlineImage = require("../../assets/webp/WelcomeScreenBottom.webp");

const { width } = Dimensions.get("window");

const COLORS = {
  bg: DEFAULT_BG,
  brand: BRAND_COLOR,
  titleBrown: "#3D2817",
  green: "#A8B894",
  subText: "#8B8680",
  pillBg: "#FFFFFF",
  pillText: "#2C2C2C",
  btnText: "#FFFFFF",
};

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
};

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, "Welcome">;
}

export default function WelcomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [langPickerVisible, setLangPickerVisible] = useState(false);

  return (
    <SafeAreaViewCustom
      backgroundColor={COLORS.bg}
      statusBarBg={COLORS.bg}
      edges={["top", "bottom"]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.languagePill}
          onPress={() => setLangPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.flagEmoji}>{LANGUAGE_META[language].flag}</Text>
          <Text style={styles.languageLabel}>{language.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Image
          source={heroImage}
          style={styles.heroImage}
          resizeMode="contain"
        />

        <View style={styles.headlineWrap}>
          <Text style={styles.headlineBrown}>{t("welcome.headlineLine1")}</Text>
          <Text style={styles.headlineGreen}>{t("welcome.headlineLine2")}</Text>
          <Image
            source={underlineImage}
            style={styles.underline}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("Onboarding")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{t("welcome.getStarted")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.7}
        >
          <Text style={styles.signInRow}>
            {t("welcome.signInRow")}{" "}
            <Text style={styles.signInLink}>{t("welcome.signInLink")}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <LanguagePickerModal
        visible={langPickerVisible}
        onClose={() => setLangPickerVisible(false)}
      />
    </SafeAreaViewCustom>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: ms(20),
    paddingTop: SPACING.sm,
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    backgroundColor: COLORS.pillBg,
    paddingHorizontal: ms(14),
    paddingVertical: ms(7),
    borderRadius: RADIUS.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  flagEmoji: { fontSize: FONT_SIZES.body },
  languageLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: COLORS.pillText,
    letterSpacing: 0.3,
  },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  heroImage: {
    width: width * 0.95,
    height: width * 1.05,
  },

  headlineWrap: {
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  headlineBrown: {
    fontSize: ms(36),
    fontWeight: "800",
    color: COLORS.titleBrown,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  headlineGreen: {
    fontSize: ms(36),
    fontWeight: "800",
    color: COLORS.green,
    textAlign: "center",
    letterSpacing: -0.5,
    marginTop: ms(2),
  },
  underline: {
    width: ms(140),
    height: ms(12),
    marginTop: ms(2),
  },

  actions: {
    paddingHorizontal: SPACING.lg,
    marginBottom: vs(50),
    gap: SPACING.md,
    alignItems: "center",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: COLORS.brand,
    paddingVertical: ms(18),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: FONT_SIZES.button,
    fontWeight: "700",
    color: COLORS.btnText,
    letterSpacing: 0.2,
  },
  signInRow: {
    fontSize: FONT_SIZES.label,
    color: COLORS.subText,
    fontWeight: "400",
  },
  signInLink: {
    color: COLORS.brand,
    fontWeight: "700",
  },
});
