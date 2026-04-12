import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setOnboardingStatus, setPersistedAccessToken } from '../store/slices/authSlice';
import { GoogleSignin, statusCodes, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { authService } from '../services/auth.service';
import { profileService } from '../services/profile.service';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';
import CommonAlertModal, { CommonModalVariant } from "../components/CommonModal";

type RootStackParamList = {
  AccountCreation: undefined;
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountCreation'>;
};

// Configure Google Sign-In outside the component
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export default function AccountCreationScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { onboardingPayload } = useSelector((state: any) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; message: string; variant: CommonModalVariant; title?: string }>({
    visible: false,
    message: "",
    variant: 'error',
  });

  async function onGoogleButtonPress() {
    try {
      setLoading(true);

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (idToken) {
          const data = await authService.signInWithGoogleIdToken(idToken);

          if (data.session?.access_token) {
            const sessionData = data;

            // Now save profile to backend if onboarding payload exists
            if (onboardingPayload && sessionData.session) {
              try {
                await profileService.updateProfile(sessionData.session, onboardingPayload);
              } catch (apiErr) {
                console.error("Failed to sync profile after Google Login:", apiErr);
              }
            }

            await authService.persistToken(sessionData.session.access_token);
            dispatch(setPersistedAccessToken(sessionData.session.access_token));

            await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
            dispatch(setOnboardingStatus(true));
          }
        }
      }
    } catch (error: any) {
      if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
        return;
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setAlert({ visible: true, message: 'Google Play Services not available or outdated.', variant: 'error', title: 'Play Services Error' });
      } else if (error.code === statusCodes.SIGN_IN_CANCELLED || error.message?.includes('CANCELED')) {
        return; // User cancelled the login flow
      } else {
        setAlert({ visible: true, message: `Google Sign In Failed: ${error.message}`, variant: 'error', title: 'Sign In Error' });
      }
    } finally {
      setLoading(false);
    }
  }

  const isReady = email.trim().length > 0 && password.length >= 6;

  async function handleSignUp() {
    if (!email.trim() || password.length < 6) {
      setAlert({
        visible: true,
        message: 'Please enter a valid email and a password of at least 6 characters.',
        variant: 'warning',
        title: 'Missing Details'
      });
      return;
    }

    setLoading(true);
    try {
      await authService.signUp({
        email: email.trim(),
        password,
      });

      const { data: { session } } = await authService.getSession();

      if (!session?.access_token) {
        setLoading(false);
        setAlert({
          visible: true,
          message: 'Confirm your email to finish signing up, then sign in.',
          variant: 'info',
          title: 'Check your email'
        });
        return;
      }

      if (onboardingPayload) {
        await profileService.updateProfile(session, onboardingPayload);
      }

      await authService.persistToken(session.access_token);
      dispatch(setPersistedAccessToken(session.access_token));

      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      dispatch(setOnboardingStatus(true));
    } catch (err: any) {
      console.error("Sign up/Sync error:", err);
      setAlert({
        visible: true,
        message: err.message || 'Something went wrong saving your profile.',
        variant: 'error',
        title: 'Registration Error'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Back */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create your{'\n'}account</Text>
            <Text style={styles.subtitle}>Save your progress and start cooking smarter.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} activeOpacity={0.7}>
                  <Text style={styles.eyeText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, (!isReady || loading) && styles.primaryBtnDisabled]}
              onPress={handleSignUp}
              disabled={!isReady || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.btnPrimaryText} />
              ) : (
                <Text style={[styles.primaryBtnText, !isReady && styles.primaryBtnTextDisabled]}>
                  Start Cooking 🍳
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={[styles.socialBtn, styles.googleBtn, loading && styles.primaryBtnDisabled]}
              onPress={onGoogleButtonPress}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleLogo}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.btnPrimaryText} />
        </View>
      )}

      {alert.visible && (
        <CommonAlertModal
          visible={alert.visible}
          title={alert.title || "Alert"}
          message={alert.message}
          variant={alert.variant}
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    topBar: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 999,
      backgroundColor: colors.backBtnBg,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    backArrow: { fontSize: 17, color: colors.text, lineHeight: 21 },

    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

    header: { paddingTop: 20, paddingBottom: 32, gap: 8 },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      lineHeight: 40,
    },
    subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 24 },

    form: { gap: 16 },

    fieldGroup: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.2 },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
      fontSize: 15,
      color: colors.text,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    passwordWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 15,
      fontSize: 15,
      color: colors.text,
    },
    eyeText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

    primaryBtn: {
      backgroundColor: colors.btnPrimary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: 'center',
      marginTop: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    primaryBtnDisabled: { backgroundColor: colors.btnDisabled, shadowOpacity: 0 },
    primaryBtnText: { fontSize: 17, fontWeight: '700', color: colors.btnPrimaryText, letterSpacing: 0.2 },
    primaryBtnTextDisabled: { color: colors.btnDisabledText },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 4,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 13, color: colors.textDisabled, fontWeight: '500' },

    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.appleBtn,
      paddingVertical: 15,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    appleLogo: { fontSize: 18, color: colors.appleBtnText, lineHeight: 22 },
    socialBtnText: { fontSize: 15, fontWeight: '600', color: colors.appleBtnText },
    googleBtn: { backgroundColor: colors.googleBtn, shadowOpacity: 0.07 },
    googleLogo: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
    googleBtnText: { fontSize: 15, fontWeight: '600', color: colors.googleBtnText },

    termsText: {
      fontSize: 12,
      color: colors.textDisabled,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 20,
    },
    termsLink: { color: colors.text, fontWeight: '600' },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    },
  });
}
