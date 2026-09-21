import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { moderateScale as ms } from "../../utils/responsive";

const TRACK = "#E7E4DE";
const FILL = "#7CB342";

interface Props {
  step: number; // 0-indexed
  total: number;
}

export default function WizardProgressBar({ step, total }: Props) {
  const anim = useRef(new Animated.Value((step + 1) / total)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: (step + 1) / total,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [step, total, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: TRACK,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: FILL, borderRadius: ms(3) },
});
