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
import { FONTS, RADIUS } from '../constants/theme';
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: FONTS.bold as any,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: FONTS.regular as any,
    marginBottom: 20,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: RADIUS.lg,
  },
  langCode: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langCodeText: {
    fontSize: 11,
    fontWeight: '700' as any,
    letterSpacing: 0.5,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  nativeLabel: {
    fontSize: 16,
    fontWeight: FONTS.semibold as any,
  },
  englishLabel: {
    fontSize: 12,
    fontWeight: FONTS.regular as any,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: FONTS.bold as any,
  },
});
