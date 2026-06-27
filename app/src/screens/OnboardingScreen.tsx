import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import SafeAreaViewCustom from "../components/atoms/SafeAreaViewCustom";
import { BRAND_COLOR, DEFAULT_BG } from "../styles/colors";
import { FONT_SIZES, RADIUS, SPACING } from "../constants/theme";
import { moderateScale as ms, verticalScale as vs } from "../utils/responsive";

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  AccountCreation: undefined;
  Login: undefined;
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Onboarding">;
};

const { width } = Dimensions.get("window");

const SLIDE_IMAGES = [
  require("../../assets/webp/Onboarding1.webp"),
  require("../../assets/webp/Onboarding2.webp"),
  require("../../assets/webp/Onboarding3.webp"),
  require("../../assets/webp/Onboarding4.webp"),
];

export default function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === SLIDE_IMAGES.length - 1;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  function handleContinue() {
    if (isLast) {
      navigation.navigate("AccountCreation");
    } else {
      scrollRef.current?.scrollTo({
        x: (activeIndex + 1) * width,
        animated: true,
      });
      setActiveIndex(activeIndex + 1);
    }
  }

  return (
    <SafeAreaViewCustom backgroundColor={DEFAULT_BG} statusBarBg={DEFAULT_BG}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate("AccountCreation")}
          activeOpacity={0.7}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slider}
      >
        {SLIDE_IMAGES.map((src, i) => (
          <View key={i} style={styles.slide}>
            <View style={styles.heroWrap}>
              <Image
                source={src}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepText}>
                  {t("onboarding.stepOf", {
                    current: i + 1,
                    total: SLIDE_IMAGES.length,
                  })}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: ms(28),
                  width: "100%",
                }}
              >
                <Text style={styles.title}>
                  {t(`onboarding.slides.${i}.title`)}
                </Text>
                <Text style={styles.description}>
                  {t(`onboarding.slides.${i}.description`)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDE_IMAGES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.btn}
        onPress={handleContinue}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>
          {isLast ? t("onboarding.startCooking") : t("onboarding.continue")}
        </Text>
      </TouchableOpacity>
    </SafeAreaViewCustom>
  );
}

const SKIP_BG = "#FFE0CC";
const DOT_INACTIVE = "#F5C8A8";
const STEP_BADGE_BG = "#FEEBDD";
const STEP_TEXT = "#493026";
const TITLE_COLOR = "#493026";

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: ms(20),
    paddingTop: SPACING.xs,
  },
  skipBtn: {
    paddingHorizontal: ms(22),
    paddingVertical: ms(10),
    backgroundColor: SKIP_BG,
    borderRadius: RADIUS.full,
  },
  skipText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: TITLE_COLOR,
  },

  slider: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
  },

  heroWrap: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },

  infoContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  stepBadge: {
    backgroundColor: STEP_BADGE_BG,
    paddingHorizontal: SPACING.md,
    paddingVertical: ms(6),
    borderRadius: RADIUS.full,
  },
  stepText: {
    fontSize: ms(12),
    fontWeight: "600",
    color: STEP_TEXT,
  },

  title: {
    fontSize: ms(24),
    fontWeight: "800",
    color: TITLE_COLOR,
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: ms(36),
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.label,
    color: STEP_TEXT,
    textAlign: "center",
    lineHeight: ms(24),
    fontWeight: "400",
  },

  dots: {
    flexDirection: "row",
    gap: SPACING.sm,
    width: "100%",
    justifyContent: "center",
    marginBottom: vs(100),
    marginTop: SPACING.sm,
  },
  dot: {
    height: ms(8),
    width: ms(8),
    borderRadius: ms(4),
  },
  dotActive: {
    backgroundColor: BRAND_COLOR,
  },
  dotInactive: {
    backgroundColor: DOT_INACTIVE,
  },

  btn: {
    width: "90%",
    backgroundColor: BRAND_COLOR,
    paddingVertical: ms(18),
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
    alignSelf: "center",
    position: "absolute",
    bottom: vs(32),
  },
  btnText: {
    fontSize: ms(16),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
