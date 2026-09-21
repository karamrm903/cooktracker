import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { moderateScale as ms } from "../../utils/responsive";
import { FONTS, FONT_SIZES, RADIUS } from "../../constants/theme";

const HEADING = "#493026";
const ACTIVE_BG = "#FF8A45";
const ACTIVE_TEXT = "#FFFFFF";
const IDLE_BG = "#FFFFFF";
const IDLE_BORDER = "#F1D8C1";

export interface ChipProps {
  label: string;
  icon?: string; // emoji
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export default function Chip({ label, icon, active, onPress, disabled }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        active
          ? { backgroundColor: ACTIVE_BG, borderColor: ACTIVE_BG }
          : { backgroundColor: IDLE_BG, borderColor: IDLE_BORDER },
        pressed && { transform: [{ scale: 0.97 }] },
        disabled && !active && { opacity: 0.4 },
      ]}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}
      <Text
        style={[
          styles.label,
          { color: active ? ACTIVE_TEXT : HEADING },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: ms(20),
    height: ms(20),
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: ms(16) },
  label: {
    fontSize: FONT_SIZES.label,
    fontWeight: FONTS.semibold,
    letterSpacing: -0.1,
  },
});
