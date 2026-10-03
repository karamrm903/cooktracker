import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../context/ThemeContext";
import { FONTS, FONT_SIZES, RADIUS, SHADOWS, SPACING } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";

interface PasteLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export default function PasteLinkModal({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
}: PasteLinkModalProps) {
  const { colors, isDark } = useTheme();
  const [url, setUrl] = useState("");

  const handlePasteClipboard = async () => {
    try {
      // In Expo, Clipboard may be available from expo-clipboard or fallback
      let text = "";
      if (Clipboard && typeof Clipboard.getStringAsync === "function") {
        text = await Clipboard.getStringAsync();
      }
      if (text) {
        setUrl(text.trim());
      }
    } catch (e) {
      console.warn("Could not read clipboard:", e);
    }
  };

  const handleGo = () => {
    const trimmed = url.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardWrap}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? colors.border : "#FEEBDD",
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: isDark ? "#2A2421" : "#FCF7F3" },
                      ]}
                    >
                      <Ionicons
                        name="link-outline"
                        size={ms(20)}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>
                      Paste Recipe Link
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="close"
                      size={ms(20)}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Import recipe videos or articles from Instagram Reels, TikTok,
                  YouTube, or any food blog.
                </Text>

                {/* Input with paste button */}
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? "#1E2024" : "#F7F8FA",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="https://www.instagram.com/reel/..."
                    placeholderTextColor={colors.textMuted}
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={handleGo}
                    autoFocus
                  />
                  {url.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => setUrl("")}
                      style={{ paddingHorizontal: 6 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={ms(18)}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handlePasteClipboard}
                      style={[
                        styles.pasteChip,
                        { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      <Ionicons
                        name="clipboard-outline"
                        size={ms(13)}
                        color={colors.text}
                      />
                      <Text
                        style={[styles.pasteChipText, { color: colors.text }]}
                      >
                        Paste
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: !url.trim() || isLoading ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleGo}
                  disabled={!url.trim() || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Analyze Recipe</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={ms(18)}
                        color="#fff"
                        style={{ marginLeft: 6 }}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ms(20),
  },
  keyboardWrap: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    width: "100%",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: ms(20),
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(8),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
  },
  iconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FONT_SIZES.button,
    fontWeight: "700",
  },
  closeBtn: {
    padding: ms(4),
  },
  subtitle: {
    fontSize: FONT_SIZES.small,
    lineHeight: ms(18),
    marginBottom: ms(16),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: ms(12),
    height: ms(48),
    marginBottom: ms(16),
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    paddingVertical: 0,
  },
  pasteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: RADIUS.sm,
  },
  pasteChipText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  submitBtn: {
    height: ms(48),
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
  },
});
