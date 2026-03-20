import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

// ─── Assets ─────────────────────────────────────────────────────────────────
const wowImage = require('../../assets/wow.png');
const previewVideo = require('../../assets/preview.mov');

const { width, height } = Dimensions.get('window');

// ─── Mockup container dimensions ────────────────────────────────────────────
const MOCKUP_WIDTH  = width * 0.90;
const MOCKUP_HEIGHT = MOCKUP_WIDTH * (1350 / 1080);

// ─────────────────────────────────────────────────────────────────────────────
//  LEFT PHONE VIDEO — tweak these to align with the left phone in wow.png
// ─────────────────────────────────────────────────────────────────────────────
const LEFT_VIDEO_TOP           = '30%';
const LEFT_VIDEO_LEFT          = '8.32%';
const LEFT_VIDEO_WIDTH         = '26%';
const LEFT_VIDEO_HEIGHT        = '49%';
const LEFT_VIDEO_ROTATION      = '-15.3deg';
const LEFT_VIDEO_BORDER_RADIUS = 19;
// ─────────────────────────────────────────────────────────────────────────────

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
};

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
  onPressLanguage?: () => void;
}

export default function WelcomeScreen({ navigation, onPressLanguage }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const player = useVideoPlayer(previewVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top-right pills — leave right margin for global theme toggle */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.languagePill}
          onPress={onPressLanguage}
          activeOpacity={0.7}
        >
          <Text style={styles.flagEmoji}>🇺🇸</Text>
          <Text style={styles.languageLabel}>EN</Text>
        </TouchableOpacity>
      </View>

      {/* Center content */}
      <View style={styles.body}>
        {/* ── Phone mockup ── */}
        <View style={styles.mockupWrapper}>

          {/* Video clipped to left phone screen — sits BEHIND the frame image */}
          <View style={styles.leftVideoClip}>
            <VideoView
              player={player}
              style={styles.leftVideo}
              contentFit="contain"
              nativeControls={false}
            />
          </View>

          {/* wow.png frame sits on top so the video appears "inside" the phone */}
          <View style={styles.mockupImageWrapper} pointerEvents="none">
            <Image
              source={wowImage}
              style={styles.mockupImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          {'Calorie tracking\nmade easy'}
        </Text>
      </View>

      {/* Bottom actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={() => navigation.navigate('Onboarding')}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
          <Text style={styles.signInRow}>
            Already have an account?{' '}
            <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
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
      alignItems: 'center',
      gap: 8,
      paddingLeft: 20,
      paddingRight: 64, // leave room for global floating theme toggle (36px btn + 20px margin + 8px gap)
      paddingTop: 8,
    },
    languagePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    flagEmoji: { fontSize: 15 },
    languageLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: 0.3,
    },

    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    mockupWrapper: {
      width: MOCKUP_WIDTH,
      height: Math.min(MOCKUP_HEIGHT, height * 0.54),
      marginBottom: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.10,
      shadowRadius: 20,
    },

    mockupImageWrapper: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    mockupImage: {
      width: '100%',
      height: '100%',
    },

    leftVideoClip: {
      position: 'absolute',
      top:    LEFT_VIDEO_TOP,
      left:   LEFT_VIDEO_LEFT,
      width:  LEFT_VIDEO_WIDTH,
      height: LEFT_VIDEO_HEIGHT,
      borderRadius: LEFT_VIDEO_BORDER_RADIUS,
      transform: [{ rotate: LEFT_VIDEO_ROTATION }],
      overflow: 'hidden',
    },

    leftVideo: {
      width: '100%',
      height: '100%',
    },

    headline: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      lineHeight: 42,
      letterSpacing: -0.5,
    },

    actions: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      gap: 18,
      alignItems: 'center',
    },
    getStartedBtn: {
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
    getStartedText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.btnPrimaryText,
      letterSpacing: 0.2,
    },
    signInRow: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '400',
    },
    signInLink: {
      color: colors.text,
      fontWeight: '700',
    },
  });
}
