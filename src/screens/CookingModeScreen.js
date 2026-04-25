import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useMealLogs } from '../context/MealLogsContext';

// ── Helpers ─────────────────────────────────────────────

function inferMealType(recipe, now = new Date()) {
  const hour = now.getHours();

  const snackKeywords = [
    'cake',
    'brownie',
    'cookie',
    'cookies',
    'chocolate',
    'dessert',
    'muffin',
    'donut',
    'doughnut',
    'croissant',
    'sweet',
    'candy',
    'ice cream',
    'nutella',
    'frosting',
    'cupcake',
    'oreo',
  ];

  const title = (recipe.title ?? '').toLowerCase();

  const ingredientText = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
        .map(ing => typeof ing === 'string' ? ing : ing.name ?? '')
        .join(' ')
        .toLowerCase()
    : '';

  const combined = `${title} ${ingredientText}`;

  const looksLikeSnack = snackKeywords.some(word => combined.includes(word));

  if (looksLikeSnack) return 'snack';

  if (hour >= 5 && hour < 12) return 'breakfast';
  if (hour >= 12 && hour < 17) return 'lunch';

  return 'dinner';
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TimerBar({ timer, colors, bottomOffset }) {
  const barAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!timer) return;
    const pct = timer.remainingSeconds / timer.totalSeconds;
    if (timer.remainingSeconds === timer.totalSeconds) {
      barAnim.setValue(1);
    } else {
      Animated.timing(barAnim, {
        toValue: pct,
        duration: 950,
        useNativeDriver: false,
      }).start();
    }
  }, [timer?.remainingSeconds]);

  if (!timer) return null;

  const isWarning = timer.remainingSeconds <= 60 && timer.remainingSeconds > 0;

  return (
    <View style={[tb.wrap, { backgroundColor: colors.surface, bottom: bottomOffset }]}>
      <View style={tb.row}>
        <View style={[tb.icon, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons
            name="timer-outline"
            size={16}
            color={isWarning ? colors.error : colors.textSecondary}
          />
        </View>

        <View style={tb.info}>
          <Text style={[tb.label, { color: colors.text }]} numberOfLines={1}>
            {timer.label}
          </Text>
          <View style={[tb.track, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                tb.fill,
                {
                  backgroundColor: isWarning ? colors.error : colors.text,
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        <Text style={[tb.time, { color: isWarning ? colors.error : colors.text }]}>
          {fmt(timer.remainingSeconds)}
        </Text>
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: RADIUS.lg,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 7 },
  label: { fontSize: 13, fontWeight: FONTS.semibold },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  time: {
    fontSize: 19,
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
    minWidth: 52,
    textAlign: 'right',
  },
});

export default function CookingModeScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { recipe } = route.params;
  const { colors } = useTheme();
  const { addMealLog } = useMealLogs();
  const insets = useSafeAreaInsets();

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [timer, setTimer] = useState(null);

  const intervalRef = useRef(null);
  const warnedRef = useRef(false);
  const startedSteps = useRef(new Set());

  const totalSteps = recipe.steps.length;
  const currentStep = recipe.steps[stepIndex];
  const progress = done ? 1 : stepIndex / Math.max(totalSteps - 1, 1);

  const navBarH = done ? 126 + insets.bottom : 72 + insets.bottom;
  const timerBottom = navBarH + 12;

  const startTimer = useCallback((step) => {
    if (!step.timerMinutes) return;
    clearInterval(intervalRef.current);
    warnedRef.current = false;
    const total = step.timerMinutes * 60;
    setTimer({
      label: step.timerLabel ?? 'Timer',
      totalSeconds: total,
      remainingSeconds: total,
    });
  }, []);

  useEffect(() => {
    if (done || !currentStep?.timerMinutes) return;
    const key = `step_${stepIndex}`;
    if (startedSteps.current.has(key)) return;
    startedSteps.current.add(key);
    const t = setTimeout(() => startTimer(currentStep), 500);
    return () => clearTimeout(t);
  }, [stepIndex, done, currentStep, startTimer]);

  useEffect(() => {
    if (!timer || timer.remainingSeconds <= 0) return;

    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (!prev) return null;
        const next = prev.remainingSeconds - 1;

        if (next === 60 && !warnedRef.current) {
          warnedRef.current = true;
          Alert.alert(
            t('cookingMode.timerAlert.oneMinTitle'),
            t('cookingMode.timerAlert.oneMinMsg', { label: prev.label.toLowerCase() }),
            [{ text: t('cookingMode.timerAlert.ok') }]
          );
        }

        if (next <= 0) {
          clearInterval(intervalRef.current);
          Alert.alert(
            t('cookingMode.timerAlert.doneTitle'),
            t('cookingMode.timerAlert.doneMsg', { label: prev.label }),
            [{ text: t('cookingMode.timerAlert.gotIt') }]
          );
          return null;
        }

        return { ...prev, remainingSeconds: next };
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timer?.label, timer?.totalSeconds]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  function goNext() {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(i => i + 1);
    } else {
      setDone(true);
    }
  }

  function goBack() {
    if (done) {
      navigation.navigate('MainTabs');
      return;
    }

    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
    }
  }

  function handleLogWhatIAte() {
  Alert.alert(
    t('cookingMode.howManyGrams'),
    '',
    [
      { text: '50 g', onPress: () => saveConsumedMeal(50) },
      { text: '100 g', onPress: () => saveConsumedMeal(100) },
      { text: '150 g', onPress: () => saveConsumedMeal(150) },
      { text: '200 g', onPress: () => saveConsumedMeal(200) },
      { text: t('cookingMode.customGrams'), onPress: openCustomGramsPrompt },
      { text: t('common.cancel'), style: 'cancel' },
    ]
  );
}

function openCustomGramsPrompt() {
  Alert.prompt(
    t('cookingMode.customGrams'),
    t('cookingMode.customGramsMsg'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.save'),
        onPress: (value) => {
          const grams = Number(value);
          if (!grams || grams <= 0) return;
          saveConsumedMeal(grams);
        },
      },
    ],
    'plain-text',
    ''
  );
}

function saveConsumedMeal(gramsEaten) {
  const now = new Date();
  const mealType = inferMealType(recipe, now);

  const total = recipe.nutrition?.total ?? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const estimatedRecipeGrams = recipe.estimatedGrams ?? 600;

  const ratio = gramsEaten / estimatedRecipeGrams;

  const calories = Math.round((total.calories ?? 0) * ratio);
  const protein = Math.round((total.protein ?? 0) * ratio);
  const carbs = Math.round((total.carbs ?? 0) * ratio);
  const fat = Math.round((total.fat ?? 0) * ratio);

  const mealLabel =
    mealType === 'snack'
      ? 'Snack'
      : mealType.charAt(0).toUpperCase() + mealType.slice(1);

  const mealEmoji =
    mealType === 'breakfast' ? '🍳' :
    mealType === 'lunch' ? '🥗' :
    mealType === 'dinner' ? '🍽️' :
    '🍪';

  addMealLog({
    id: `meal_${Date.now()}`,
    name: recipe.title,
    calories,
    protein,
    carbs,
    fat,
    macros: { protein, carbs, fat },
    mealType,
    meal: mealLabel,
    time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    loggedAt: now.toISOString(),
    dateKey: now.toISOString().slice(0, 10),
    source: 'recipe',
    emoji: recipe.emoji ?? mealEmoji,
    recipeId: recipe.id,
    gramsEaten,
    estimatedRecipeGrams,
  });

  navigation.navigate('MainTabs');
}

  return (
    <SafeAreaView style={[cm.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={cm.topBar}>
        <TouchableOpacity
          style={[cm.closeBtn, { backgroundColor: colors.surfaceAlt }]}
          onPress={() => navigation.navigate('MainTabs')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>

        {!done && (
          <Text style={[cm.counter, { color: colors.textMuted }]}>
            {t('cookingMode.stepOf', { current: stepIndex + 1, total: totalSteps })}
          </Text>
        )}

        <View style={[cm.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              cm.progressFill,
              { width: `${progress * 100}%`, backgroundColor: colors.text },
            ]}
          />
        </View>
      </View>

      <View style={cm.content}>
        {done ? (
          <View style={cm.doneWrap}>
            <Text style={cm.doneEmoji}>{timer ? '⏳' : '✅'}</Text>

            <Text style={[cm.doneTitle, { color: colors.text }]}>
              {timer ? t('cookingMode.almostDone') : t('cookingMode.cookingFinished')}
            </Text>

            <Text style={[cm.doneSub, { color: colors.textMuted }]}>
              {timer
                ? t('cookingMode.almostDoneSub', { label: timer.label.toLowerCase() })
                : t('cookingMode.finishedSub', { title: recipe.title })}
            </Text>
          </View>
        ) : (
          <View style={cm.stepWrap}>
            <Text style={[cm.stepNum, { color: colors.textMuted }]}>
              {t('cookingMode.stepLabel', { number: stepIndex + 1 })}
            </Text>

            <Text style={[cm.stepText, { color: colors.text }]}>
              {currentStep.text}
            </Text>

            {currentStep.timerMinutes && (
              <View style={[cm.timerHint, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="timer-outline" size={14} color={colors.textSecondary} />
                <Text style={[cm.timerHintText, { color: colors.textSecondary }]}>
                  {t('cookingMode.timerHint', { minutes: currentStep.timerMinutes })}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TimerBar timer={timer} colors={colors} bottomOffset={timerBottom} />

      <View style={[cm.navBar, { paddingBottom: insets.bottom + 8 }]}>
        {done ? (
          <>
            <TouchableOpacity
              style={[cm.btn, cm.btnBack, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => navigation.navigate('MainTabs')}
              activeOpacity={0.7}
            >
              <Ionicons name="home-outline" size={18} color={colors.text} />
              <Text style={[cm.btnText, { color: colors.text }]}>{t('cookingMode.dashboard')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[cm.btn, cm.btnNext, { backgroundColor: colors.btnPrimary }]}
              onPress={handleLogWhatIAte}
              activeOpacity={0.85}
            >
              <Text style={[cm.btnText, { color: colors.btnPrimaryText }]}>{t('cookingMode.logWhatIAte')}</Text>
              <Ionicons name="restaurant-outline" size={18} color={colors.btnPrimaryText} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[
                cm.btn,
                cm.btnBack,
                { backgroundColor: colors.surfaceAlt },
                stepIndex === 0 && { opacity: 0.35 },
              ]}
              onPress={goBack}
              disabled={stepIndex === 0}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={[cm.btnText, { color: colors.text }]}>{t('common.back')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[cm.btn, cm.btnNext, { backgroundColor: colors.btnPrimary }]}
              onPress={goNext}
              activeOpacity={0.85}
            >
              <Text style={[cm.btnText, { color: colors.btnPrimaryText }]}>
                {stepIndex === totalSteps - 1 ? t('common.finish') : t('common.next')}
              </Text>
              <Ionicons
                name={stepIndex === totalSteps - 1 ? 'checkmark' : 'arrow-forward'}
                size={18}
                color={colors.btnPrimaryText}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const cm = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },

  closeBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  counter: {
    fontSize: 13,
    fontWeight: FONTS.medium,
    alignSelf: 'center',
  },

  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  stepWrap: {
    gap: 20,
  },

  stepNum: {
    fontSize: 13,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  stepText: {
    fontSize: 22,
    fontWeight: FONTS.medium,
    lineHeight: 32,
    letterSpacing: -0.3,
  },

  timerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },

  timerHintText: {
    fontSize: 13,
    fontWeight: FONTS.medium,
  },

  doneWrap: {
    alignItems: 'center',
    gap: 16,
  },

  doneEmoji: {
    fontSize: 64,
  },

  doneTitle: {
    fontSize: 28,
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
  },

  doneSub: {
    fontSize: 16,
    fontWeight: FONTS.regular,
    textAlign: 'center',
    lineHeight: 24,
  },

  navBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
  },

  btnBack: {},
  btnNext: {},

  btnText: {
    fontSize: 16,
    fontWeight: FONTS.semibold,
  },
});