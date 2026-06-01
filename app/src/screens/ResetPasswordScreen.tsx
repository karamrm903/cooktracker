import React, { useState } from "react";
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
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import SafeAreaViewCustom from "../components/atoms/SafeAreaViewCustom";
import AuthStatusView from "../components/atoms/AuthStatusView";
import { authService } from "../services/auth.service";
import { navigationRef } from "../lib/navigationRef";
import CommonAlertModal, {
  CommonModalVariant,
} from "../components/CommonModal";
import {
  BRAND_COLOR,
  DEFAULT_BG,
  TEXT_DARK,
  TEXT_MUTED,
  PLACEHOLDER,
  ICON_COLOR,
  INPUT_BORDER,
} from "../styles/colors";

type RootStackParamList = {
  Login: undefined;
  ResetPassword: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "ResetPassword">;
};

const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const bottomImg = require("../../assets/webp/UserInfoBottom.webp");
const successImg = require("../../assets/webp/ResetPasswordSuccess.webp");

type Phase = "form" | "success";

export default function ResetPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>("form");
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
  }>({ visible: false, message: "", variant: "error" });

  async function handleReset() {
    if (password.length < 6 || confirmPassword.length < 6) {
      setAlert({
        visible: true,
        title: t("resetPassword.alerts.missingTitle"),
        message: t("resetPassword.alerts.missingMsg"),
        variant: "warning",
      });
      return;
    }
    if (password !== confirmPassword) {
      setAlert({
        visible: true,
        title: t("resetPassword.alerts.mismatchTitle"),
        message: t("resetPassword.alerts.mismatchMsg"),
        variant: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await authService.getSession();
      if (!session?.access_token) {
        setAlert({
          visible: true,
          title: t("resetPassword.alerts.noSessionTitle"),
          message: t("resetPassword.alerts.noSessionMsg"),
          variant: "error",
        });
        return;
      }

      await authService.updatePassword(password);
      setPhase("success");
    } catch (err: any) {
      setAlert({
        visible: true,
        title: t("resetPassword.alerts.errorTitle"),
        message: err.message,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function goToLogin() {
    // Drop the recovery session so user must log in fresh with new password.
    // signOut triggers onAuthStateChange in App.js which clears redux and
    // flips the root navigator key back to the guest stack. After the flip,
    // use the root navigationRef to land on Login.
    try {
      await authService.signOut();
    } catch {
      // ignore
    }
    setTimeout(() => {
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }),
        );
      }
    }, 150);
  }

  return (
    <SafeAreaViewCustom backgroundColor={DEFAULT_BG} statusBarBg={DEFAULT_BG}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Decorative leaf */}
        {phase === "form" && (
          <View style={styles.leafDecor} pointerEvents="none">
            <Image
              source={leafImg}
              style={styles.fillImg}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Decorative bottom cloth */}
        <View style={styles.bottomDecor} pointerEvents="none">
          <Image
            source={bottomImg}
            style={styles.fillImg}
            resizeMode="contain"
          />
        </View>

        {phase === "form" && (
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>
        )}

        {phase === "form" ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{t("resetPassword.title")}</Text>
              <Text style={styles.subtitle}>{t("resetPassword.subtitle")}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t("resetPassword.createLabel")}
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
                    placeholder={t("resetPassword.passwordPlaceholder")}
                    placeholderTextColor={PLACEHOLDER}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setPasswordVisible(!passwordVisible)}
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t("resetPassword.confirmLabel")}
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
                    placeholder={t("resetPassword.passwordPlaceholder")}
                    placeholderTextColor={PLACEHOLDER}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!confirmVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setConfirmVisible(!confirmVisible)}
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
            </View>

            <View style={{ flex: 1, minHeight: 32 }} />

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {t("resetPassword.resetBtn")}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <AuthStatusView
            image={successImg}
            title={t("resetPassword.successTitle")}
            body={t("resetPassword.successBody")}
            ctaLabel={t("resetPassword.goToLogin")}
            onCtaPress={goToLogin}
          />
        )}
      </KeyboardAvoidingView>

      {alert.visible && (
        <CommonAlertModal
          visible={alert.visible}
          title={alert.title || ""}
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
    position: "absolute",
    top: 70,
    right: -10,
    width: 160,
    height: 150,
    zIndex: 2,
  },
  bottomDecor: {
    position: "absolute",
    bottom: -10,
    right: -20,
    width: 130,
    height: 130,
    zIndex: 0,
    opacity: 0.9,
  },
  fillImg: { width: "100%", height: "100%" },

  topBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backBtn: {
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

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
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
    lineHeight: 22,
  },

  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "700", color: TEXT_DARK },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: TEXT_DARK,
  },
  eyeBtn: { paddingLeft: 10 },

  primaryBtn: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    marginHorizontal: 0,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
