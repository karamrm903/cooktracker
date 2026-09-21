import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { moderateScale as ms } from "../../utils/responsive";
import { FONTS, RADIUS } from "../../constants/theme";

const HEADING = "#1F2A20";
const ACTIVE_BORDER = "#7CB342";
const NEUTRAL_BG = "#F2EFE8";
const NEUTRAL_ACTIVE_BG = "#EEF7E4";

export interface OptionTileProps {
  label: string;
  icon?: string; // emoji
  color?: string; // pastel bg (vibes)
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "pastel" | "neutral";
  align?: "topLeft" | "center";
}

export default function OptionTile({
  label,
  icon,
  color,
  active,
  onPress,
  disabled,
  variant = "neutral",
  align = "center",
}: OptionTileProps) {
  const bg =
    variant === "pastel"
      ? color ?? "#EEF7E4"
      : active
        ? NEUTRAL_ACTIVE_BG
        : NEUTRAL_BG;

  const alignItems = align === "topLeft" ? "flex-start" : "center";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: active ? ACTIVE_BORDER : "transparent",
          alignItems,
          justifyContent: align === "topLeft" ? "space-between" : "center",
        },
        pressed && { transform: [{ scale: 0.98 }] },
        disabled && !active && { opacity: 0.4 },
      ]}
    >
      {icon ? (
        <Text
          style={[
            styles.icon,
            align === "topLeft" ? styles.iconTopLeft : styles.iconCenter,
          ]}
        >
          {icon}
        </Text>
      ) : null}
      <Text
        style={[
          styles.label,
          align === "topLeft" && styles.labelTopLeft,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    minHeight: ms(110),
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    padding: ms(14),
  },
  icon: { fontSize: ms(24) },
  iconTopLeft: { alignSelf: "flex-start" },
  iconCenter: { marginBottom: ms(8) },
  label: {
    fontSize: ms(14),
    fontWeight: FONTS.bold,
    color: HEADING,
    letterSpacing: -0.1,
  },
  labelTopLeft: { marginTop: "auto" },
});
