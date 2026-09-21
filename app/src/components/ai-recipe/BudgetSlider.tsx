import React, { useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
} from "react-native";
import { moderateScale as ms } from "../../utils/responsive";
import { FONTS } from "../../constants/theme";

const TRACK_HEIGHT = 6;
const THUMB_SIZE = ms(28);
const TRACK_BG = "#E7E4DE";
const FILL = "#7CB342";
const HEADING = "#1F2A20";
const SUB_TEXT = "#8B8B8B";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function BudgetSlider({
  value,
  onChange,
  min = 20,
  max = 200,
  step = 1,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const snap = (v: number) => Math.round(v / step) * step;

  const pctToValue = (px: number) => {
    if (trackWidth <= 0) return valueRef.current;
    const pct = Math.max(0, Math.min(1, px / trackWidth));
    return clamp(snap(min + pct * (max - min)));
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const x = e.nativeEvent.locationX;
          onChange(pctToValue(x));
        },
        onPanResponderMove: (e, g) => {
          const x = e.nativeEvent.locationX;
          if (Number.isFinite(x) && x >= 0) onChange(pctToValue(x));
          else onChange(pctToValue(g.moveX));
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackWidth],
  );

  const filledPct = trackWidth
    ? ((clamp(value) - min) / (max - min)) * trackWidth
    : 0;

  function onLayout(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.amountRow}>
        <Text style={styles.currency}>$</Text>
        <Text style={styles.amount}>{Math.round(value)}</Text>
      </View>
      <Text style={styles.subLabel}>this week</Text>

      <View style={styles.trackTouch} onLayout={onLayout} {...pan.panHandlers}>
        <View style={styles.track} />
        <View style={[styles.fill, { width: filledPct }]} />
        <View
          style={[
            styles.thumb,
            { left: Math.max(0, filledPct - THUMB_SIZE / 2) },
          ]}
        />
      </View>

      <View style={styles.rangeRow}>
        <Text style={styles.rangeLabel}>${min}</Text>
        <Text style={styles.rangeLabel}>${max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: ms(8), paddingVertical: ms(30) },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  currency: {
    fontSize: ms(42),
    fontWeight: FONTS.bold,
    color: HEADING,
    marginTop: ms(14),
    marginRight: ms(2),
  },
  amount: {
    fontSize: ms(72),
    fontWeight: FONTS.bold,
    color: HEADING,
    letterSpacing: -2,
    lineHeight: ms(78),
  },
  subLabel: {
    marginTop: ms(2),
    marginBottom: ms(28),
    fontSize: ms(14),
    color: SUB_TEXT,
    textAlign: "center",
    fontWeight: FONTS.medium,
  },
  trackTouch: { height: THUMB_SIZE + ms(20), justifyContent: "center" },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: TRACK_BG,
  },
  fill: {
    position: "absolute",
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: FILL,
  },
  thumb: {
    position: "absolute",
    top: (THUMB_SIZE + ms(20)) / 2 - THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: FILL,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  rangeRow: {
    marginTop: ms(4),
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: ms(4),
  },
  rangeLabel: { fontSize: ms(13), color: SUB_TEXT, fontWeight: FONTS.medium },
});
