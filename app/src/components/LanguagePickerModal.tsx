import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../context/LanguageContext';
import { LANGUAGE_META } from '../i18n';
import { FONTS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import { moderateScale as ms } from '../utils/responsive';
import { profileService } from '../services/profile.service';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LanguagePickerModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { language, setLanguage } = useLanguage();
  const session = useSelector((state: any) => state.auth.session);

  async function handleSelect(lang: SupportedLanguage) {
    await setLanguage(lang);
    onClose();
    // Fire-and-forget — sync to DB only when logged in
    if (session) {
      profileService.updateLocale(session, lang).catch((err) =>
        console.warn('[LanguagePickerModal] locale sync failed:', err.message)
      );
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <SafeAreaView style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.text }]}>
          {t('language.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('language.subtitle')}
        </Text>

        <View style={styles.options}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const meta = LANGUAGE_META[lang];
            const isActive = language === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.option,
                  { backgroundColor: colors.surface },
                  isActive && { backgroundColor: colors.cardActive },
                ]}
                onPress={() => handleSelect(lang)}
                activeOpacity={0.75}
              >
                <View style={[styles.langCode, { backgroundColor: isActive ? colors.primary : colors.surfaceAlt }]}>
                  <Text style={[styles.langCodeText, { color: isActive ? '#fff' : colors.text }]}>
                    {lang.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.nativeLabel, { color: isActive ? colors.cardActiveText : colors.text }]}>
                    {meta.nativeLabel}
                  </Text>
                  {meta.nativeLabel !== meta.label && (
                    <Text style={[styles.englishLabel, { color: isActive ? colors.cardActiveSub : colors.textMuted }]}>
                      {meta.label}
                    </Text>
                  )}
                </View>
                {isActive && (
                  <Text style={[styles.checkmark, { color: colors.cardActiveText }]}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    alignSelf: 'center',
    marginTop: ms(12),
    marginBottom: ms(20),
  },
  title: {
    fontSize: ms(22),
    fontWeight: FONTS.bold as any,
    letterSpacing: -0.4,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.regular as any,
    marginBottom: ms(20),
  },
  options: {
    gap: ms(10),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(14),
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  langCode: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langCodeText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700' as any,
    letterSpacing: 0.5,
  },
  optionText: {
    flex: 1,
    gap: ms(2),
  },
  nativeLabel: {
    fontSize: ms(16),
    fontWeight: FONTS.semibold as any,
  },
  englishLabel: {
    fontSize: ms(12),
    fontWeight: FONTS.regular as any,
  },
  checkmark: {
    fontSize: ms(18),
    fontWeight: FONTS.bold as any,
  },
});
