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
              <Image source={src} style={styles.heroImage} resizeMode="cover" />
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
                  // paddingHorizontal: 36,
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
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  skipBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: SKIP_BG,
    borderRadius: 999,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: TITLE_COLOR,
  },

  slider: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 28,
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
    padding: 16,
    gap: 24,
  },
  stepBadge: {
    backgroundColor: STEP_BADGE_BG,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stepText: {
    fontSize: 12,
    fontWeight: "600",
    color: STEP_TEXT,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: TITLE_COLOR,
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 36,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: STEP_TEXT,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "400",
  },

  dots: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    justifyContent: "center",
    marginBottom: 100,
    marginTop: 8,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
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
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    alignSelf: "center",
    position: "absolute",
    bottom: 32,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
