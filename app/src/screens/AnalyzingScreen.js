import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { fetchFramesFromServer } from "../services/frameServer";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FONTS, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { analyzeVideo, PIPELINE_STAGES } from '../services/videoAnalyzer';
import { saveRecipe } from '../services/recipeService';
import { useSelector } from 'react-redux';

// ── New UI assets ───────────────────────────────────────────────────────────
const analyseImg = require('../../assets/webp/Analyse.webp');
const leafImg = require('../../assets/webp/UserInfoLeaf.webp');
const bottomImg = require('../../assets/webp/UserInfoBottom.webp');

// Module-level counter — survives re-renders and component reuse.
// Each new submission bumps this; the closure captures its snapshot
// so any in-flight response from an older URL can detect it is stale.
let globalRequestId = 0;

export default function AnalyzingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { url } = route.params ?? {};
  const { colors } = useTheme();
  const session = useSelector(state => state.auth.session);
  const [phase,     setPhase]     = useState(-1); // index of currently processing step
  const [errorMsg,  setErrorMsg]  = useState(null);

  const pulseLoop  = useRef(null);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const spinAnim   = useRef(new Animated.Value(0)).current;
  const rowFades   = useRef(PIPELINE_STAGES.map(() => new Animated.Value(0))).current;
  const dotFlashes = useRef(PIPELINE_STAGES.map(() => new Animated.Value(0))).current;
  const checkFades = useRef(PIPELINE_STAGES.map(() => new Animated.Value(0))).current;
  const dotLoops   = useRef([]);

  // ── Pulse the hero image ──────────────────────────────────────────────────────
  useEffect(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
    return () => pulseLoop.current?.stop();
  }, []);

  // ── Continuous spinner for the in-progress row ────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ── Pipeline-driven animation ─────────────────────────────────────────────────
  useEffect(() => {
    // Claim this request slot. Any older in-flight response will see its
    // captured id no longer matches globalRequestId and will be ignored.
    const myRequestId = ++globalRequestId;
    let cancelled = false;

    console.log('[AnalyzingScreen] new analysis → url:', url, '| requestId:', myRequestId);

    // Reset all animation values so a reused component starts from scratch
    setPhase(-1);
    rowFades.forEach(a => a.setValue(0));
    dotFlashes.forEach(a => a.setValue(0));
    checkFades.forEach(a => a.setValue(0));

    const animate = (anim, toValue, duration) =>
      new Promise(r => Animated.timing(anim, { toValue, duration, useNativeDriver: true }).start(r));

    function startDotPulse(i) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(dotFlashes[i], { toValue: 1,   duration: 380, useNativeDriver: true }),
          Animated.timing(dotFlashes[i], { toValue: 0.2, duration: 380, useNativeDriver: true }),
        ])
      );
      dotLoops.current[i] = loop;
      loop.start();
    }

    async function stopDotPulse(i) {
      dotLoops.current[i]?.stop();
      await animate(dotFlashes[i], 0, 100);
    }

    async function onProgress({ stageIndex, status }) {
      if (cancelled) return;
      if (status === 'started') {
        setPhase(stageIndex);
        await animate(rowFades[stageIndex], 1, 280);
        startDotPulse(stageIndex);
      } else {
        await stopDotPulse(stageIndex);
        await animate(checkFades[stageIndex], 1, 220);
        setPhase(stageIndex + 1);
      }
    }

    analyzeVideo(url, onProgress, language)
      .then(async recipe => {
        if (cancelled) return;
        if (myRequestId !== globalRequestId) {
          console.log('[AnalyzingScreen] stale response ignored → requestId:', myRequestId, 'latest:', globalRequestId);
          return;
        }
        console.log('[AnalyzingScreen] navigating to RecipeSummary → recipe title:', recipe.title);
        let dbId = null;
        try {
          const saved = await saveRecipe(session, recipe, url);
          dbId = saved.id;
        } catch (err) {
          console.warn('[AnalyzingScreen] saveRecipe failed:', err?.message ?? err);
        }
        navigation.replace('RecipeSummary', { recipe, dbId });
      })
      .catch(err => {
        if (cancelled) return;
        console.log('[AnalyzingScreen] analysis failed:', err?.message ?? err);
        setErrorMsg(t('analyzing.errorMsg'));
      });

    return () => { cancelled = true; };
  }, [url]); // re-run whenever the submitted URL changes

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Bottom-right gingham corner */}
      <Image source={bottomImg} style={s.bottomCorner} resizeMode="cover" />
      {/* Bottom-left leaf branch */}
      <Image source={leafImg} style={s.bottomLeaf} resizeMode="contain" />

      <View style={s.center}>
        {/* Hero — pan image with leaf accent */}
        <View style={s.hero}>
          <Animated.Image
            source={analyseImg}
            style={[s.heroImg, { transform: [{ scale: pulseAnim }] }]}
            resizeMode="contain"
          />
          <Image source={leafImg} style={s.heroLeaf} resizeMode="contain" />
        </View>

        <Text style={[s.title, { color: colors.text }]}>
          {errorMsg ? t('analyzing.errorTitle') : t('analyzing.title')}
        </Text>
        <Text style={[s.sub, { color: errorMsg ? colors.error : colors.textMuted }]}>
          {errorMsg ?? t('analyzing.subtitle')}
        </Text>

        {/* Step rows card — hidden on error */}
        {!errorMsg && (
          <View style={[s.card, { backgroundColor: colors.surface }, SHADOWS.md]}>
            {PIPELINE_STAGES.map((step, i) => {
              const isDone    = i < phase;
              const isCurrent = i === phase && !isDone;
              const isPending = i > phase;

              return (
                <Animated.View
                  key={step.label}
                  style={[
                    s.row,
                    { opacity: isPending ? 0.4 : rowFades[i] },
                    i > 0 && s.rowGap,
                  ]}
                >
                  {/* Indicator */}
                  {isCurrent ? (
                    <Animated.View
                      style={[
                        s.circle,
                        { borderColor: colors.warning, transform: [{ rotate: spin }] },
                      ]}
                    >
                      <View style={[s.spinnerGap, { backgroundColor: colors.surface }]} />
                    </Animated.View>
                  ) : (
                    <View
                      style={[
                        s.circle,
                        { borderColor: isDone ? colors.success : colors.border },
                      ]}
                    >
                      {isDone && <Ionicons name="checkmark" size={13} color={colors.success} />}
                    </View>
                  )}

                  <Text
                    style={[
                      s.rowLabel,
                      { color: isDone || isCurrent ? colors.text : colors.textMuted },
                      isDone && { fontWeight: FONTS.semibold },
                    ]}
                  >
                    {step.label}
                  </Text>

                  {/* Status pill */}
                  {isDone && (
                    <View style={[s.pill, { backgroundColor: colors.tintGreen }]}>
                      <Text style={[s.pillText, { color: colors.success }]}>
                        {t('analyzing.done')}
                      </Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={[s.pill, { backgroundColor: colors.tintYellow }]}>
                      <Text style={[s.pillText, { color: colors.warning }]}>
                        {t('analyzing.inProgress')}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },

  hero:      { width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  heroImg:   { width: 150, height: 110 },
  heroLeaf:  { position: 'absolute', right: 36, top: -6, width: 90, height: 90 },

  title: { fontSize: 28, fontWeight: FONTS.bold, letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  sub:   { fontSize: 15, fontWeight: FONTS.regular, marginBottom: 36, textAlign: 'center' },

  card: {
    width: '100%',
    borderRadius: RADIUS.xl,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowGap:  { marginTop: 22 },
  circle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  spinnerGap: { position: 'absolute', top: -2, right: -2, width: 12, height: 12 },
  rowLabel: { fontSize: 15, fontWeight: FONTS.medium, flex: 1 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  pillText: { fontSize: 12, fontWeight: FONTS.semibold },

  bottomCorner: { position: 'absolute', right: 0, bottom: 0, width: 140, height: 140 },
  bottomLeaf:   { position: 'absolute', left: 8, bottom: 24, width: 110, height: 110 },
});
