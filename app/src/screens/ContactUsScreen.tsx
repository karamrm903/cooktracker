import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { FONTS, RADIUS } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import { RootState } from "../store";

const SCREEN_BG = "#FCF7F3";
const TEXT_DARK = "#493026";
const TEXT_BODY = "#5C4740";
const TEXT_MUTED = "#7F6C64";
const PLACEHOLDER_COLOR = "#A4A8B7";
const BORDER = "#E2E4E9";
const ORANGE = "#E89457";
const BRAND_PURPLE = "#502F4C";

const sentImg = require("../../assets/webp/messageSent.webp");
const leafImg = require("../../assets/webp/SignUpLeaf.webp");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactUsScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim() && EMAIL_RE.test(email.trim()) && message.trim();

  async function handleSend() {
    if (sending) return;
    if (!canSubmit) {
      setError(
        "Please fill in your name, a valid email address, and a message.",
      );
      return;
    }
    setError(null);
    setSending(true);
    try {
      // No support endpoint exists yet — this stands in for the real submit so
      // the success state is reachable. Swap for the API call when it lands.
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSent(true);
    } catch (err: any) {
      setError(
        err?.message ?? "Could not send your message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: SCREEN_BG }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={ms(20)} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={{ width: ms(36) }} />
        </View>

        {sent ? (
          /* ── Success state ──────────────────────────────────────────── */
          <View style={styles.successWrap}>
            <Image
              source={sentImg}
              style={styles.successImg}
              resizeMode="contain"
            />
            <Text style={styles.successTitle}>Message sent!</Text>
            <Text style={styles.successBody}>
              Thank you for contacting us. Our support team has received your
              message and will respond to your email as soon as possible.
            </Text>
          </View>
        ) : (
          /* ── Form state ─────────────────────────────────────────────── */
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>How can we help?</Text>
            <Text style={styles.subtitle}>
              Send us a message and our support team will get back to you as
              soon as possible.
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={PLACEHOLDER_COLOR}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor={PLACEHOLDER_COLOR}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us more about your question or issue..."
              placeholderTextColor={PLACEHOLDER_COLOR}
              multiline
              textAlignVertical="top"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Text style={styles.disclaimer}>
              By submitting this form, you agree that we may use your
              information to respond to your request.
            </Text>
          </ScrollView>
        )}

        {/* Decorative leaf sits behind the bottom button, mirrored per the design */}
        <View style={styles.footer} pointerEvents="box-none">
          <View style={styles.decorLeaf} pointerEvents="none">
            <Image
              source={leafImg}
              style={styles.decorLeafImg}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={[styles.cta, !sent && !canSubmit && styles.ctaDisabled]}
            onPress={sent ? () => navigation.goBack() : handleSend}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>
                {sent ? "Back To Settings" : "Send Message"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(20),
    paddingVertical: ms(12),
  },
  backBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(100),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },

  content: {
    paddingHorizontal: ms(20),
    paddingTop: ms(8),
    paddingBottom: ms(24),
  },

  title: {
    fontSize: ms(20),
    lineHeight: ms(22),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },
  subtitle: {
    fontSize: ms(14),
    lineHeight: ms(22),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
    marginTop: ms(6),
    marginBottom: ms(22),
  },

  label: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: BRAND_PURPLE,
    marginBottom: ms(8),
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    borderRadius: ms(12),
    paddingHorizontal: ms(14),
    paddingVertical: ms(14),
    fontSize: ms(15),
    color: TEXT_DARK,
    marginBottom: ms(18),
  },
  textArea: { height: ms(140), paddingTop: ms(14) },

  errorText: {
    fontSize: ms(13),
    lineHeight: ms(18),
    fontWeight: FONTS.medium,
    color: "#E04D4D",
    marginBottom: ms(10),
  },
  disclaimer: {
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
  },

  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ms(28),
    paddingBottom: ms(40),
  },
  successImg: { width: "100%", height: ms(160), marginBottom: ms(8) },
  successTitle: {
    fontSize: ms(28),
    lineHeight: ms(34),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
    marginBottom: ms(12),
  },
  successBody: {
    fontSize: ms(14),
    lineHeight: ms(22),
    fontWeight: FONTS.medium,
    color: "#493026B2",
    textAlign: "center",
    paddingHorizontal: ms(12),
  },

  footer: {
    paddingHorizontal: ms(20),
    paddingTop: ms(8),
    paddingBottom: ms(80),
  },
  decorLeaf: {
    position: "absolute",
    right: ms(16),
    bottom: ms(90),
    width: ms(148),
    height: ms(152),
    transform: [{ scaleX: -1 }],
  },
  decorLeafImg: { width: "100%", height: "100%" },
  cta: {
    paddingVertical: ms(16),
    borderRadius: RADIUS.full,
    alignItems: "center",
    backgroundColor: ORANGE,
    zIndex: 1,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: {
    fontSize: ms(16),
    lineHeight: ms(22),
    fontWeight: FONTS.bold,
    color: "#FFFFFF",
  },
});
