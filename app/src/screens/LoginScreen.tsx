import React, { useState } from "react";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import {
  setPersistedAccessToken,
  setOnboardingStatus,
  setAuthSession,
} from "../store/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

const leafImg = require("../../assets/webp/SignInLeaf.webp");
const starImg = require("../../assets/webp/Star.webp");
const googleImage = require("../../assets/webp/Google.webp");

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
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
            dispatch(
              setAuthSession({ user: data.user, session: data.session }),
            );

            await AsyncStorage.setItem("hasCompletedOnboarding", "true");
            dispatch(setOnboardingStatus(true));
          }
        }
      }
    } catch (error: any) {
      if (error.code === statusCodes.IN_PROGRESS) {
        return;
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setAlert({
          visible: true,
          message: t("login.alerts.playServicesError"),
          variant: "error",
          title: t("login.alerts.playServicesTitle"),
        });
      } else if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.message?.includes("CANCELED")
      ) {
        return;
      } else {
        console.error(error.message);
        setAlert({
          visible: true,
          message: t("login.alerts.signInErrorMsg", { error: error.message }),
          variant: "error",
          title: t("login.alerts.signInErrorTitle"),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    if (!email || !password) {
      setAlert((prev) => ({
        ...prev,
        visible: true,
        title: t("login.alerts.missingFieldsTitle"),
        message: t("login.alerts.missingFieldsMsg"),
        variant: "warning",
      }));
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

        await AsyncStorage.setItem("hasCompletedOnboarding", "true");
        dispatch(setOnboardingStatus(true));
      }
    } catch (error: any) {
      setAlert({
        visible: true,
        title: t("login.alerts.signInFailedTitle"),
        message: error.message,
        variant: "error",
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
        <View style={styles.leafDecor} pointerEvents="none">
          <Image source={leafImg} style={styles.leafImg} resizeMode="cover" />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t("login.title")}</Text>
              <Image
                source={starImg}
                style={styles.titleStar}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("login.emailLabel")}</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={ICON_COLOR}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("login.emailPlaceholder")}
                  placeholderTextColor={PLACEHOLDER}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("login.passwordLabel")}</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={ICON_COLOR}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("login.passwordPlaceholder")}
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
              <TouchableOpacity
                style={styles.forgotWrapper}
                onPress={() => navigation.navigate("ForgotPassword" as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>
                  {t("login.forgotPassword")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flex: 1, minHeight: 40 }} />

          <View style={styles.bottomBlock}>
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signInBtnText}>{t("login.signInBtn")}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("common.or")}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.signInBtnDisabled]}
              activeOpacity={0.85}
              onPress={onGoogleButtonPress}
              disabled={loading}
            >
              <Image
                source={googleImage}
                style={styles.googleImage}
                resizeMode="contain"
              />
              <Text style={styles.googleBtnText}>
                {t("login.continueWithGoogle")}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {t("login.noAccount")}{" "}
                <Text
                  style={styles.footerLink}
                  onPress={() => navigation.navigate("Onboarding")}
                >
                  {t("login.signUp")}
                </Text>
              </Text>
            </View>
          </View>
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
    right: 0,
    width: 94,
    height: 190,
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
    marginTop: 60,
    marginBottom: 28,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.5,
  },
  titleStar: {
    width: 22,
    height: 22,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    fontWeight: "400",
    lineHeight: 22,
  },
  form: {
    gap: 18,
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
  forgotWrapper: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "700",
    color: FORGOT_GREEN,
  },
  bottomBlock: {
    gap: 14,
  },
  signInBtn: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInBtnText: {
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
  googleBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    letterSpacing: 0.1,
  },
  footer: {
    marginTop: 8,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "400",
  },
  footerLink: {
    color: BRAND_COLOR,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  googleImage: {
    width: 20,
    height: 20,
  },
});
