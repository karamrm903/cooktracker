import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  UserSetup: undefined;
  Login: undefined;
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const { width } = Dimensions.get('window');

// Emoji backgrounds are intentional brand colors — kept the same in both modes
const SLIDE_EMOJIS = [
  { emoji: '🎬', emojiBg: '#FFF3E8' },
  { emoji: '🔗', emojiBg: '#EEF4FF' },
  { emoji: '👨‍🍳', emojiBg: '#EDFAF3' },
  { emoji: '📊', emojiBg: '#FFF8E0' },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === SLIDE_EMOJIS.length - 1;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  function handleContinue() {
    if (isLast) {
      navigation.navigate('UserSetup');
    } else {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
      setActiveIndex(activeIndex + 1);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('UserSetup')}
          activeOpacity={0.6}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
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
        {SLIDE_EMOJIS.map((slide, i) => (
          <View key={i} style={styles.slide}>
            {/* Illustration circle */}
            <View style={[styles.iconCircle, { backgroundColor: slide.emojiBg }]}>
              <Text style={styles.emoji}>{slide.emoji}</Text>
            </View>

            {/* Step badge */}
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>{t('onboarding.stepOf', { current: i + 1, total: SLIDE_EMOJIS.length })}</Text>
            </View>

            <Text style={styles.title}>{t(`onboarding.slides.${i}.title`)}</Text>
            <Text style={styles.description}>{t(`onboarding.slides.${i}.description`)}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom — dots + button */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDE_EMOJIS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Continue / Start Cooking */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {isLast ? t('onboarding.startCooking') : t('onboarding.continue')}
          </Text>
        </TouchableOpacity>

        {/* Back to Welcome */}
        {activeIndex === 0 && (
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backText}>{t('onboarding.back')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },

    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    skipBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    skipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },

    slider: {
      flex: 1,
    },
    slide: {
      width,
      flex: 1,
      paddingHorizontal: 32,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
    },

    iconCircle: {
      width: 160,
      height: 160,
      borderRadius: 80,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emoji: {
      fontSize: 72,
    },

    stepBadge: {
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    stepText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textDisabled,
      letterSpacing: 0.3,
    },

    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.4,
      lineHeight: 38,
    },
    description: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 26,
      fontWeight: '400',
    },

    bottom: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      gap: 16,
      alignItems: 'center',
    },

    dots: {
      flexDirection: 'row',
      gap: 8,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    dotActive: {
      width: 24,
      backgroundColor: colors.btnPrimary,
    },
    dotInactive: {
      width: 8,
      backgroundColor: colors.border,
    },

    btn: {
      width: '100%',
      backgroundColor: colors.btnPrimary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    btnText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.btnPrimaryText,
      letterSpacing: 0.2,
    },

    backText: {
      fontSize: 14,
      color: colors.textDisabled,
      fontWeight: '500',
    },
  });
}
