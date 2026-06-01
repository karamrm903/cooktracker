import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeAreaViewCustom from '../components/atoms/SafeAreaViewCustom';
import { authService } from '../services/auth.service';
import { navigationRef } from '../lib/navigationRef';
import CommonAlertModal, { CommonModalVariant } from '../components/CommonModal';
import {
  BRAND_COLOR,
  DEFAULT_BG,
  TEXT_DARK,
  TEXT_MUTED,
  PLACEHOLDER,
  ICON_COLOR,
  INPUT_BORDER,
  FORGOT_GREEN,
} from '../styles/colors';

type RootStackParamList = {
  Login: undefined;
  AccountCreation: undefined;
  UserSetup: undefined;
  ResetPassword: undefined;
  OtpVerification: { email: string; type: 'signup' | 'recovery' };
};

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerification'>;

const leafImg = require('../../assets/webp/UserInfoLeaf.webp');
const bottomImg = require('../../assets/webp/UserInfoBottom.webp');

export default function OtpVerificationScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { email, type } = route.params;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    message: string;
    variant: CommonModalVariant;
    title?: string;
  }>({ visible: false, message: '', variant: 'error' });

  async function handleVerify() {
    if (code.trim().length !== 6) {
      setAlert({
        visible: true,
        title: t('otp.alerts.invalidCodeTitle'),
        message: t('otp.alerts.invalidCodeMsg'),
        variant: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.verifyOtp(email, code.trim(), type);
      // For recovery: App.js auth handler catches PASSWORD_RECOVERY event and routes.
      // For signup: route to UserSetup. The auth navigator unmounts when the
      // session lands, so wait a tick and use the root navigationRef to route
      // inside the freshly-mounted main stack.
      if (type === 'signup') {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            navigationRef.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'UserSetup' }] }),
            );
          }
        }, 150);
      }
    } catch (err: any) {
      setAlert({
        visible: true,
        title: t('otp.alerts.errorTitle'),
        message: err.message,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      if (type === 'signup') {
        await authService.resendSignupOtp(email);
      } else {
        await authService.resetPasswordForEmail(email);
      }
      setAlert({
        visible: true,
        title: t('otp.alerts.resentTitle'),
        message: t('otp.alerts.resentMsg'),
        variant: 'info',
      });
    } catch (err: any) {
      setAlert({
        visible: true,
        title: t('otp.alerts.errorTitle'),
        message: err.message,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaViewCustom backgroundColor={DEFAULT_BG} statusBarBg={DEFAULT_BG}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.leafDecor} pointerEvents="none">
          <Image source={leafImg} style={styles.fillImg} resizeMode="contain" />
        </View>

        <View style={styles.bottomDecor} pointerEvents="none">
          <Image source={bottomImg} style={styles.fillImg} resizeMode="contain" />
        </View>

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('otp.title')}</Text>
            <Text style={styles.subtitle}>{t('otp.subtitle', { email })}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('otp.codeLabel')}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={20} color={ICON_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('otp.codePlaceholder')}
                  placeholderTextColor={PLACEHOLDER}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>{t('otp.verifyBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>
              {t('otp.resendPrompt')}{' '}
              <Text style={styles.resendLink} onPress={handleResend}>
                {t('otp.resendLink')}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {alert.visible && (
        <CommonAlertModal
          visible={alert.visible}
          title={alert.title || ''}
          message={alert.message}
          variant={alert.variant}
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      )}
    </SafeAreaViewCustom>
  );
}

const styles = StyleSheet.create({
  leafDecor: {
    position: 'absolute',
    top: 40,
    right: -10,
    width: 160,
    height: 150,
    zIndex: 0,
  },
  bottomDecor: {
    position: 'absolute',
    bottom: -10,
    right: -20,
    width: 130,
    height: 130,
    zIndex: 0,
    opacity: 0.9,
  },
  fillImg: { width: '100%', height: '100%' },

  topBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  header: {
    marginTop: 24,
    marginBottom: 28,
    gap: 8,
    paddingRight: '30%',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: TEXT_DARK,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
  },

  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_DARK,
    letterSpacing: 6,
  },

  primaryBtn: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  resendRow: {
    alignItems: 'center',
    marginTop: 32,
  },
  resendPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: FORGOT_GREEN,
  },
  resendLink: {
    color: BRAND_COLOR,
    fontWeight: '700',
  },
});
