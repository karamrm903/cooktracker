import React, { useState } from "react";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import SafeAreaViewCustom from "../components/atoms/SafeAreaViewCustom";
import {
  BRAND_COLOR,
  DEFAULT_BG,
  TEXT_DARK,
  TEXT_MUTED,
  PLACEHOLDER,
  ICON_COLOR,
  INPUT_BORDER,
  DIVIDER,
  FORGOT_GREEN,
} from "../styles/colors";
import CommonAlertModal, {
  CommonModalVariant,
} from "../components/CommonModal";

type RootStackParamList = {
  AccountCreation: undefined;
  UserSetup: undefined;
  OtpVerification: { email: string; type: "signup" | "recovery" };
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "AccountCreation">;
};

const leafImg = require("../../assets/webp/SignUpLeaf.webp");
const googleImg = require("../../assets/webp/Google.webp");

export default function AccountCreationScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    message: string;
    variant: CommonModalVariant;
    title?: string;
  }>({
    visible: false,
    message: "",
    variant: "error",
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
            navigation.navigate("UserSetup");
          }
        }
      }
    } catch (error: any) {
      if (error.code === statusCodes.IN_PROGRESS) {
        return;
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setAlert({
          visible: true,
          message: t("accountCreation.alerts.playServicesError"),
          variant: "error",
          title: t("accountCreation.alerts.playServicesTitle"),
        });
      } else if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.message?.includes("CANCELED")
      ) {
        return;
      } else {
        setAlert({
          visible: true,
          message: t("accountCreation.alerts.signInErrorMsg", {
            error: error.message,
          }),
          variant: "error",
          title: t("accountCreation.alerts.signInErrorTitle"),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const isReady =
    email.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword.length >= 6;

  async function handleSignUp() {
    if (!email.trim() || password.length < 6 || confirmPassword.length < 6) {
      setAlert({
        visible: true,
        message: t("accountCreation.alerts.missingDetailsMsg"),
        variant: "warning",
        title: t("accountCreation.alerts.missingDetailsTitle"),
      });
      return;
    }

    if (password !== confirmPassword) {
      setAlert({
        visible: true,
        message: t("accountCreation.alerts.passwordMismatchMsg"),
        variant: "warning",
        title: t("accountCreation.alerts.passwordMismatchTitle"),
      });
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      await authService.signUp({ email: trimmedEmail, password });
      navigation.navigate("OtpVerification", {
        email: trimmedEmail,
        type: "signup",
      });
    } catch (err: any) {
      console.error("Sign up error:", err);
      const alreadyRegistered =
        err.code === "EMAIL_ALREADY_REGISTERED" ||
        err.message?.toLowerCase().includes("already registered");
      setAlert({
        visible: true,
        message: alreadyRegistered
          ? t("accountCreation.alerts.emailAlreadyRegisteredMsg", {
              defaultValue: "This email is already registered. Try logging in.",
            })
          : err.message || t("accountCreation.alerts.genericError"),
        variant: "error",
        title: t("accountCreation.alerts.registrationErrorTitle"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaViewCustom backgroundColor={DEFAULT_BG} statusBarBg={DEFAULT_BG}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Decorative leaf top-right */}
        <View style={styles.leafDecor} pointerEvents="none">
          <Image source={leafImg} style={styles.leafImg} resizeMode="contain" />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t("accountCreation.title")}</Text>
            <Text style={styles.subtitle}>{t("accountCreation.subtitle")}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("accountCreation.emailLabel")}
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={ICON_COLOR}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("accountCreation.emailPlaceholder")}
                  placeholderTextColor={PLACEHOLDER}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("accountCreation.passwordLabel")}
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={ICON_COLOR}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("accountCreation.passwordPlaceholder")}
                  placeholderTextColor={PLACEHOLDER}
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
                  <Ionicons
                    name={passwordVisible ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={ICON_COLOR}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("accountCreation.confirmPasswordLabel")}
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={ICON_COLOR}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("accountCreation.confirmPasswordPlaceholder")}
                  placeholderTextColor={PLACEHOLDER}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!confirmVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setConfirmVisible(!confirmVisible)}
                  activeOpacity={0.7}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={confirmVisible ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={ICON_COLOR}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!isReady || loading) && styles.primaryBtnDisabled,
              ]}
              onPress={handleSignUp}
              disabled={!isReady || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {t("accountCreation.startCookingBtn")}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("common.or")}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.primaryBtnDisabled]}
              onPress={onGoogleButtonPress}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Image
                source={googleImg}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleBtnText}>
                {t("accountCreation.continueWithGoogle")}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>
            {t("accountCreation.termsPrefix")}{" "}
            <Text style={styles.termsLink}>
              {t("accountCreation.termsOfService")}
            </Text>{" "}
            {t("accountCreation.and")}{" "}
            <Text style={styles.termsLink}>
              {t("accountCreation.privacyPolicy")}
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
        </View>
      )}

      {alert.visible && (
        <CommonAlertModal
          visible={alert.visible}
          title={alert.title || t("common.alert")}
          message={alert.message}
          variant={alert.variant}
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      )}
    </SafeAreaViewCustom>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  leafDecor: {
    position: "absolute",
    top: 6,
    right: -20,
    width: 170,
    height: 180,
    zIndex: 0,
  },
  leafImg: {
    width: "100%",
    height: "100%",
  },
  backBtn: {
    marginTop: 8,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginTop: 24,
    marginBottom: 28,
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    fontWeight: "400",
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: TEXT_DARK,
  },
  eyeBtn: {
    paddingLeft: 10,
  },
  primaryBtn: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DIVIDER,
  },
  dividerText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    letterSpacing: 0.1,
  },
  termsText: {
    fontSize: 16,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 20,
  },
  termsLink: {
    color: FORGOT_GREEN,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});
