import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import {
  BRAND_COLOR,
  TEXT_DARK,
  TEXT_MUTED,
  FORGOT_GREEN,
} from "../../styles/colors";

interface Props {
  image: ImageSourcePropType;
  title: string;
  body?: string;
  bodySecondary?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  ctaLoading?: boolean;
  footerPrompt?: string;
  footerLink?: string;
  onFooterPress?: () => void;
}

export default function AuthStatusView({
  image,
  title,
  body,
  bodySecondary,
  ctaLabel,
  onCtaPress,
  ctaLoading,
  footerPrompt,
  footerLink,
  onFooterPress,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={image} style={styles.image} resizeMode="contain" />

        <Text style={styles.title}>{title}</Text>

        {body && <Text style={styles.body}>{body}</Text>}
        {bodySecondary && <Text style={styles.body}>{bodySecondary}</Text>}

        {ctaLabel && onCtaPress && (
          <TouchableOpacity
            style={[styles.cta, ctaLoading && { opacity: 0.6 }]}
            onPress={onCtaPress}
            disabled={ctaLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {footerPrompt && footerLink && onFooterPress && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {footerPrompt}{" "}
            <Text style={styles.footerLink} onPress={onFooterPress}>
              {footerLink}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  image: {
    width: 260,
    height: 200,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  body: {
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  cta: {
    width: "100%",
    backgroundColor: BRAND_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 16,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: FORGOT_GREEN,
  },
  footerLink: {
    color: BRAND_COLOR,
    fontWeight: "700",
  },
});
