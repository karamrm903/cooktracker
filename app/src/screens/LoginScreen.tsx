import React, { useState } from "react";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { setPersistedAccessToken, setOnboardingStatus, setAuthSession } from "../store/slices/authSlice";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { authService } from "../services/auth.service";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";
import type { Colors } from "../context/ThemeContext";
import CommonAlertModal, { CommonModalVariant } from "../components/CommonModal";

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; message: string; variant: CommonModalVariant; title?: string }>({
    visible: false,
    message: "",
    variant: 'error',
  });

  const [loading, setLoading] = useState(false);

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
            await authService.persistToken(data.session.access_token);
            dispatch(setPersistedAccessToken(data.session.access_token));
            dispatch(setAuthSession({ user: data.user, session: data.session }));

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
        setAlert({ visible: true, message: t('login.alerts.playServicesError'), variant: 'error', title: t('login.alerts.playServicesTitle') });
      } else if (error.code === statusCodes.SIGN_IN_CANCELLED || error.message?.includes('CANCELED')) {
        return; // User cancelled the login flow
      } else {
        console.error(error.message)
        setAlert({ visible: true, message: t('login.alerts.signInErrorMsg', { error: error.message }), variant: 'error', title: t('login.alerts.signInErrorTitle') });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    if (!email || !password) {
      setAlert((prev) => {
        return {
          ...prev,
          visible: true,
          title: t('login.alerts.missingFieldsTitle'),
          message: t('login.alerts.missingFieldsMsg'),
          variant: 'warning',
        };
      });
      return;
    }
    setLoading(true);
    try {
      const { user, session } = await authService.signIn({
        email: email.trim(),
        password,
      });

      if (session?.access_token) {
        await authService.persistToken(session.access_token);
        dispatch(setPersistedAccessToken(session.access_token));
        dispatch(setAuthSession({ user, session }));

        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        dispatch(setOnboardingStatus(true));
      }
    } catch (error: any) {
      setAlert({
        visible: true,
        title: t('login.alerts.signInFailedTitle'),
        message: error.message,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back arrow */}
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('login.title')}</Text>
            <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('login.emailLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('login.passwordLabel')}</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  activeOpacity={0.7}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeText}>
                    {passwordVisible ? t('common.hide') : t('common.show')}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.forgotWrapper}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.btnPrimaryText} />
              ) : (
                <Text style={styles.signInBtnText}>{t('login.signInBtn')}</Text>
              )}
            </TouchableOpacity>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.socialBtn, styles.googleBtn, loading && styles.signInBtnDisabled]}
              activeOpacity={0.85}
              onPress={onGoogleButtonPress}
              disabled={loading}
            >
              <Text style={styles.googleLogo}>G</Text>
              <Text style={styles.googleBtnText}>{t('login.continueWithGoogle')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t('login.noAccount')}{" "}
              <Text
                style={styles.footerLink}
                onPress={() => navigation.navigate("Onboarding")}
              >
                {t('login.signUp')}
              </Text>
            </Text>
          </View>
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
          title={alert.title || t('common.alert')}
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
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    backBtn: {
      marginTop: 8,
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: colors.backBtnBg,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    backArrow: {
      fontSize: 18,
      color: colors.text,
      lineHeight: 22,
    },
    header: {
      marginTop: 32,
      marginBottom: 36,
      gap: 8,
    },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: "400",
      lineHeight: 22,
    },
    form: {
      gap: 20,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
      fontSize: 15,
      color: colors.text,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    passwordWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      shadowColor: "#000",
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
    eyeBtn: {
      paddingLeft: 12,
    },
    eyeText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    forgotWrapper: {
      alignSelf: "flex-end",
    },
    forgotText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    signInBtn: {
      backgroundColor: colors.btnPrimary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    signInBtnDisabled: {
      backgroundColor: colors.btnDisabled,
      shadowOpacity: 0,
    },
    signInBtnText: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.btnPrimaryText,
      letterSpacing: 0.2,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginVertical: 4,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 13,
      color: colors.textDisabled,
      fontWeight: "500",
    },
    socialBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.appleBtn,
      paddingVertical: 15,
      borderRadius: 999,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    googleBtn: {
      backgroundColor: colors.googleBtn,
      shadowOpacity: 0.07,
    },
    googleLogo: {
      fontSize: 16,
      fontWeight: "700",
      color: "#4285F4",
    },
    googleBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.googleBtnText,
      letterSpacing: 0.1,
    },
    footer: {
      marginTop: "auto",
      paddingTop: 32,
      alignItems: "center",
    },
    footerText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "400",
    },
    footerLink: {
      color: colors.text,
      fontWeight: "700",
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    },
  });
}
