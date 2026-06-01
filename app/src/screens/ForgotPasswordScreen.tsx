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
import SafeAreaViewCustom from "../components/atoms/SafeAreaViewCustom";
import { authService } from "../services/auth.service";
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
  ForgotPassword: undefined;
  OtpVerification: { email: string; type: 'signup' | 'recovery' };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "ForgotPassword">;
};

const leafImg = require("../../assets/webp/UserInfoLeaf.webp");
const bottomImg = require("../../assets/webp/UserInfoBottom.webp");

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    message: string;
    variant: CommonModalVariant;
    title?: string;
  }>({ visible: false, message: "", variant: "error" });

  async function sendResetEmail() {
    if (!email.trim()) {
      setAlert({
        visible: true,
        title: t("forgotPassword.alerts.missingEmailTitle"),
        message: t("forgotPassword.alerts.missingEmailMsg"),
        variant: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      await authService.resetPasswordForEmail(trimmedEmail);
      navigation.navigate("OtpVerification", { email: trimmedEmail, type: "recovery" });
    } catch (err: any) {
      setAlert({
        visible: true,
        title: t("forgotPassword.alerts.errorTitle"),
        message: err.message,
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
        {/* Decorative leaf */}
        <View style={styles.leafDecor} pointerEvents="none">
          <Image source={leafImg} style={styles.fillImg} resizeMode="contain" />
        </View>

        {/* Decorative bottom cloth */}
        <View style={styles.bottomDecor} pointerEvents="none">
          <Image
            source={bottomImg}
            style={styles.fillImg}
            resizeMode="contain"
          />
        </View>

        {/* Back button */}
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
              <Text style={styles.title}>{t("forgotPassword.title")}</Text>
              <Text style={styles.subtitle}>
                {t("forgotPassword.subtitle")}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t("forgotPassword.emailLabel")}
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
                    placeholder={t("forgotPassword.emailPlaceholder")}
                    placeholderTextColor={PLACEHOLDER}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                onPress={sendResetEmail}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t("forgotPassword.sendBtn")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    top: 40,
    right: -10,
    width: 160,
    height: 150,
    zIndex: 0,
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
    paddingRight: "40%",
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

  primaryBtn: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
