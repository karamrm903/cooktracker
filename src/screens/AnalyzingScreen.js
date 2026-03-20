import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { fetchFramesFromServer } from "../services/frameServer";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { analyzeVideo, PIPELINE_STAGES } from '../services/videoAnalyzer';
import { saveRecipe } from '../services/recipeService';
const FOOD_EMOJIS = ['🍳', '🍰', '🥩', '🍗', '🍣', '🍔', '🍕', '🍜', '🥗', '🍪'];

// Module-level counter — survives re-renders and component reuse.
// Each new submission bumps this; the closure captures its snapshot
// so any in-flight response from an older URL can detect it is stale.
let globalRequestId = 0;

export default function AnalyzingScreen({ navigation, route }) {
  const { url } = route.params ?? {};
  const { colors } = useTheme();
  const [phase,     setPhase]     = useState(-1); // index of currently processing step
  const [errorMsg,  setErrorMsg]  = useState(null);
  const [emojiIndex, setEmojiIndex] = useState(0);

  const pulseLoop  = useRef(null);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const rowFades   = useRef(PIPELINE_STAGES.map(() => new Animated.Value(0))).current;
  const dotFlashes = useRef(PIPELINE_STAGES.map(() => new Animated.Value(0))).current;
  const checkFades = useRef(PIPELINE_STAGES.map(() => new Animated.Value(0))).current;
  const dotLoops   = useRef([]);

  // ── Pulse the emoji ──────────────────────────────────────────────────────────
  useEffect(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
    return () => pulseLoop.current?.stop();
  }, []);
useEffect(() => {
  const interval = setInterval(() => {
    setEmojiIndex(prev => (prev + 1) % FOOD_EMOJIS.length);
  }, 900);

  return () => clearInterval(interval);
}, []);
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

    analyzeVideo(url, onProgress)
      .then(async recipe => {
        if (cancelled) return;
        if (myRequestId !== globalRequestId) {
          console.log('[AnalyzingScreen] stale response ignored → requestId:', myRequestId, 'latest:', globalRequestId);
          return;
        }
        console.log('[AnalyzingScreen] navigating to RecipeSummary → recipe title:', recipe.title);
        let dbId = null;
        try {
          const saved = await saveRecipe(recipe, url);
          dbId = saved.id;
        } catch (err) {
          console.warn('[AnalyzingScreen] saveRecipe failed:', err?.message ?? err);
        }
        navigation.replace('RecipeSummary', { recipe, dbId });
      })
      .catch(err => {
        if (cancelled) return;
        console.log('[AnalyzingScreen] analysis failed:', err?.message ?? err);
        setErrorMsg("Couldn't analyze this video. Please try another one.");
      });

    return () => { cancelled = true; };
  }, [url]); // re-run whenever the submitted URL changes

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={s.center}>

        {/* Pulsing emoji */}
        <Animated.Text style={[s.emoji, { transform: [{ scale: pulseAnim }] }]}>
          {FOOD_EMOJIS[emojiIndex]}
        </Animated.Text>

        <Text style={[s.title, { color: colors.text }]}>
          {errorMsg ? 'Analysis failed' : 'Analyzing your video'}
        </Text>
        <Text style={[s.sub, { color: errorMsg ? colors.error : colors.textMuted }]}>
          {errorMsg ?? 'This takes just a moment…'}
        </Text>

        {/* Step rows — hidden on error */}
        {!errorMsg && <View style={s.rows}>
          {PIPELINE_STAGES.map((step, i) => {
            const isDone    = i < phase;
            const isCurrent = i === phase && !isDone;
            return (
              <Animated.View key={step.label} style={[s.row, { opacity: rowFades[i] }]}>
                {/* Indicator circle */}
                <View style={[
                  s.circle,
                  {
                    borderColor: isDone
                      ? colors.success
                      : isCurrent ? colors.text : colors.border,
                  },
                ]}>
                  {/* Pulsing fill dot (current) */}
                  <Animated.View
                    style={[s.fillDot, { backgroundColor: colors.text, opacity: dotFlashes[i] }]}
                  />
                  {/* Checkmark (done) */}
                  <Animated.View
                    style={[StyleSheet.absoluteFill, s.checkLayer, { opacity: checkFades[i] }]}
                  >
                    <Ionicons name="checkmark" size={12} color={colors.success} />
                  </Animated.View>
                </View>

                <Text style={[
                  s.rowLabel,
                  { color: isDone || isCurrent ? colors.text : colors.textMuted },
                  isDone && { fontWeight: FONTS.semibold },
                ]}>
                  {step.label}
                </Text>
              </Animated.View>
            );
          })}
        </View>}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji:      { fontSize: 60, marginBottom: 28 },
  title:      { fontSize: 22, fontWeight: FONTS.bold, letterSpacing: -0.4, marginBottom: 6, textAlign: 'center' },
  sub:        { fontSize: 14, fontWeight: FONTS.regular, marginBottom: 52, textAlign: 'center' },
  rows:       { width: '100%', gap: 22 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 16 },
  circle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  fillDot:    { width: 9, height: 9, borderRadius: 4.5 },
  checkLayer: { alignItems: 'center', justifyContent: 'center' },
  rowLabel:   { fontSize: 15, fontWeight: FONTS.medium, flex: 1 },
});
