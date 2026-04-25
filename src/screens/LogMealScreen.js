import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMealLogs } from '../context/MealLogsContext';
import CommonAlertModal from '../components/CommonModal';
import { FONTS, RADIUS, SPACING } from '../constants/theme';

export default function LogMealScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mealLogsContext = useMealLogs() || {};
const addMealLog =
  mealLogsContext.addMealLog ||
  mealLogsContext.addMeal ||
  (() => {});

  const defaultMealType = route.params?.defaultMealType ?? 'dinner';

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState(defaultMealType);
  const [isSaving, setIsSaving] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, message: '' });

  const mealTypes = [
    { key: 'breakfast', emoji: '🍳' },
    { key: 'lunch', emoji: '🥗' },
    { key: 'dinner', emoji: '🍽️' },
    { key: 'snack', emoji: '🍪' },
  ];

  const proteinNum = Number(protein) || 0;
  const carbsNum = Number(carbs) || 0;
  const fatNum = Number(fat) || 0;

  const calculatedCalories = useMemo(() => {
    return proteinNum * 4 + carbsNum * 4 + fatNum * 9;
  }, [proteinNum, carbsNum, fatNum]);

  const finalCaloriesPreview = calories ? Number(calories) || 0 : calculatedCalories;

  function formatMealLabel(type) {
    if (type === 'snack') return 'Snack';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function getMealEmoji(type) {
    return mealTypes.find(m => m.key === type)?.emoji ?? '🍽️';
  }

  async function handleSave() {
    if (!name.trim() || isSaving) return;

    const now = new Date();
    const meal = {
      name: name.trim(),
      calories: calories ? Number(calories) || 0 : calculatedCalories,
      protein: proteinNum,
      carbs: carbsNum,
      fat: fatNum,
      macros: { protein: proteinNum, carbs: carbsNum, fat: fatNum },
      mealType,
      meal: formatMealLabel(mealType),
      time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      loggedAt: now.toISOString(),
      dateKey: now.toISOString().slice(0, 10),
      source: 'manual',
      emoji: getMealEmoji(mealType),
    };

    setIsSaving(true);
    try {
      await addMealLog(meal);
      navigation.goBack();
    } catch (err) {
      setErrorModal({ visible: true, message: err?.message || t('logMeal.saveFailedMsg') });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('logMeal.headerTitle')}</Text>

        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{getMealEmoji(mealType)}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{t('logMeal.heroTitle')}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>{t('logMeal.heroSubtitle')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('logMeal.mealNameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('logMeal.mealNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('logMeal.mealTypeLabel')}</Text>
          <View style={styles.typeRow}>
            {mealTypes.map(type => {
              const active = mealType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setMealType(type.key)}
                  activeOpacity={0.75}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? colors.text : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={styles.typeEmoji}>{type.emoji}</Text>
                  <Text style={{ color: active ? colors.background : colors.text }}>
                    {t(`mealType.${type.key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('logMeal.caloriesLabel')}</Text>
          <TextInput
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            placeholder={t('logMeal.caloriesPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            {calories
              ? t('logMeal.manualCalories')
              : t('logMeal.autoCalculated', { amount: finalCaloriesPreview })}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('logMeal.proteinLabel')}</Text>
            <TextInput
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />
          </View>

          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('logMeal.carbsLabel')}</Text>
            <TextInput
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('logMeal.fatLabel')}</Text>
          <TextInput
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />
        </View>

        <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.previewTitle, { color: colors.text }]}>{t('logMeal.preview')}</Text>

          <View style={styles.previewRow}>
            <Text style={[styles.previewMain, { color: colors.text }]}>
              {finalCaloriesPreview} kcal
            </Text>
            <Text style={[styles.previewSub, { color: colors.textMuted }]}>
              {formatMealLabel(mealType)}
            </Text>
          </View>

          <View style={styles.previewMacros}>
            <View style={styles.previewMacroItem}>
              <View style={[styles.previewDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.previewMacroText, { color: colors.textMuted }]}>
                {proteinNum}g Protein
              </Text>
            </View>

            <View style={styles.previewMacroItem}>
              <View style={[styles.previewDot, { backgroundColor: '#EAB308' }]} />
              <Text style={[styles.previewMacroText, { color: colors.textMuted }]}>
                {carbsNum}g Carbs
              </Text>
            </View>

            <View style={styles.previewMacroItem}>
              <View style={[styles.previewDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.previewMacroText, { color: colors.textMuted }]}>
                {fatNum}g Fat
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.text, opacity: name.trim() && !isSaving ? 1 : 0.5 }]}
          activeOpacity={0.8}
          disabled={!name.trim() || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.background }]}>{t('logMeal.saveMeal')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <CommonAlertModal
        visible={errorModal.visible}
        title={t('logMeal.saveFailedTitle')}
        message={errorModal.message}
        variant="error"
        primaryText={t('logMeal.tryAgain')}
        onPrimary={() => setErrorModal({ visible: false, message: '' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: FONTS.semibold,
  },

  content: {
    padding: 24,
    paddingBottom: 140,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },

  heroEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: FONTS.bold,
    marginBottom: 6,
  },

  heroSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  section: {
    marginBottom: 20,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  half: {
    flex: 1,
  },

  label: {
    fontSize: 12,
    fontWeight: FONTS.medium,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  helperText: {
    marginTop: 8,
    fontSize: 12,
  },

  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },

  typeEmoji: {
    fontSize: 14,
  },

  previewCard: {
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: 8,
  },

  previewTitle: {
    fontSize: 12,
    fontWeight: FONTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  previewMain: {
    fontSize: 22,
    fontWeight: FONTS.bold,
  },

  previewSub: {
    fontSize: 13,
  },

  previewMacros: {
    gap: 10,
  },

  previewMacroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  previewMacroText: {
    fontSize: 13,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  saveBtn: {
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBtnText: {
    fontSize: 15,
    fontWeight: FONTS.semibold,
  },
});