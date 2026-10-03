import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Modal,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

interface SpeedDialOverlayProps {
  visible: boolean;
  onClose: () => void;
  onPressCamera: () => void;
  onPressPaste: () => void;
  onPressAddMeal: () => void;
}

export default function SpeedDialOverlay({
  visible,
  onClose,
  onPressCamera,
  onPressPaste,
  onPressAddMeal,
}: SpeedDialOverlayProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedBubble, setSelectedBubble] = useState<
    "camera" | "paste" | "meal" | null
  >(null);
  const isAnimatingOut = useRef(false);

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim1 = useRef(new Animated.Value(0)).current; // Camera (Left)
  const bubbleAnim2 = useRef(new Animated.Value(0)).current; // Paste (Center)
  const bubbleAnim3 = useRef(new Animated.Value(0)).current; // Add Meal (Right)
  const selectAnim = useRef(new Animated.Value(0)).current; // Selection pulse

  useEffect(() => {
    if (visible) {
      isAnimatingOut.current = false;
      setSelectedBubble(null);
      backdropAnim.setValue(0);
      fabAnim.setValue(0);
      bubbleAnim1.setValue(0);
      bubbleAnim2.setValue(0);
      bubbleAnim3.setValue(0);
      selectAnim.setValue(0);

      // Entrance animation:
      // 1. Backdrop fades in
      // 2. Center FAB rotates 0 -> 45deg
      // 3. Staggered pop out: Center shoots up first, then Left & Right unfold
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(fabAnim, {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.stagger(30, [
          Animated.spring(bubbleAnim2, {
            toValue: 1,
            tension: 70,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(bubbleAnim1, {
            toValue: 1,
            tension: 68,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(bubbleAnim3, {
            toValue: 1,
            tension: 68,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible]);

  // If not visible, return null
  if (!visible) return null;

  // Handle dismissal (tapping backdrop or center FAB)
  const handleDismiss = () => {
    if (isAnimatingOut.current) return;
    isAnimatingOut.current = true;

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(fabAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim1, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim2, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim3, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Handle selecting an icon:
  // Scales up the selected icon, shrinks others, then transitions to destination
  const handleSelect = (
    bubble: "camera" | "paste" | "meal",
    actionCallback: () => void
  ) => {
    if (isAnimatingOut.current) return;
    isAnimatingOut.current = true;
    setSelectedBubble(bubble);

    Animated.parallel([
      Animated.timing(selectAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(fabAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      actionCallback();
    });
  };

  // Center FAB rotation (0 -> 45deg)
  const rotateFab = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // Center FAB scale & opacity when a bubble is tapped
  const centerFabScale = selectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });
  const centerFabOpacity = selectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // Calculate transforms for each bubble
  const getBubbleStyle = (
    key: "camera" | "paste" | "meal",
    bubbleAnim: Animated.Value,
    targetX: number,
    targetY: number
  ): any => {
    const translateX = bubbleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, targetX],
    });
    const translateY = bubbleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, targetY],
    });
    const entranceScale = bubbleAnim.interpolate({
      inputRange: [0, 0.35, 1],
      outputRange: [0.1, 0.5, 1],
    });
    const entranceOpacity = bubbleAnim.interpolate({
      inputRange: [0, 0.25, 1],
      outputRange: [0, 0.7, 1],
    });

    if (selectedBubble === key) {
      // Selected bubble grows larger
      const tapScale = selectAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.35],
      });
      return {
        transform: [
          { translateX },
          { translateY },
          { scale: Animated.multiply(entranceScale, tapScale) },
        ],
        opacity: entranceOpacity,
      };
    } else if (selectedBubble !== null) {
      // Other unselected bubbles shrink and vanish
      const shrinkScale = selectAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.2],
      });
      const shrinkOpacity = selectAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      });
      return {
        transform: [
          { translateX },
          { translateY },
          { scale: Animated.multiply(entranceScale, shrinkScale) },
        ],
        opacity: Animated.multiply(entranceOpacity, shrinkOpacity),
      };
    }

    return {
      transform: [{ translateX }, { translateY }, { scale: entranceScale }],
      opacity: entranceOpacity,
    };
  };

  const bottomOffset = Math.max(insets.bottom, 12) + 26;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Full-screen backdrop blur */}
        {Platform.OS === "ios" ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}
          >
            <BlurView
              intensity={70}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(10, 12, 16, 0.85)"
                  : "rgba(245, 245, 240, 0.85)",
                opacity: backdropAnim,
              },
            ]}
          />
        )}

        {/* Backdrop tap to close */}
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Center Bottom Anchor for Bubbles & Central Button */}
        <View
          style={[styles.anchor, { bottom: bottomOffset }]}
          pointerEvents="box-none"
        >
          {/* Bubble 1 (Left): AI Plate Scanner Camera */}
          <Animated.View
            style={[
              styles.bubble,
              styles.cameraBubble,
              getBubbleStyle("camera", bubbleAnim1, -76, -82),
            ]}
          >
            <TouchableOpacity
              style={styles.bubbleTouchable}
              onPress={() => handleSelect("camera", onPressCamera)}
              activeOpacity={0.85}
              accessibilityLabel="AI Plate Scanner"
              accessibilityRole="button"
            >
              <Ionicons name="camera" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Bubble 2 (Center): Paste Recipe Link */}
          <Animated.View
            style={[
              styles.bubble,
              styles.pasteBubble,
              getBubbleStyle("paste", bubbleAnim2, 0, -114),
            ]}
          >
            <TouchableOpacity
              style={styles.bubbleTouchable}
              onPress={() => handleSelect("paste", onPressPaste)}
              activeOpacity={0.85}
              accessibilityLabel="Paste Recipe Link"
              accessibilityRole="button"
            >
              <Ionicons name="link" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Bubble 3 (Right): Add Meal / Food */}
          <Animated.View
            style={[
              styles.bubble,
              styles.mealBubble,
              getBubbleStyle("meal", bubbleAnim3, 76, -82),
            ]}
          >
            <TouchableOpacity
              style={styles.bubbleTouchable}
              onPress={() => handleSelect("meal", onPressAddMeal)}
              activeOpacity={0.85}
              accessibilityLabel="Add Food Meal"
              accessibilityRole="button"
            >
              <Ionicons name="restaurant" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Floating Center Button (rotates into × close button) */}
          <Animated.View
            style={[
              styles.centerFab,
              {
                backgroundColor: colors.primary,
                transform: [{ scale: centerFabScale }],
                opacity: centerFabOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.centerFabTouchable}
              onPress={handleDismiss}
              activeOpacity={0.85}
              accessibilityLabel="Close Menu"
              accessibilityRole="button"
            >
              <Animated.View style={{ transform: [{ rotate: rotateFab }] }}>
                <Ionicons name="add" size={38} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleTouchable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBubble: {
    backgroundColor: "#FF8A45",
    shadowColor: "#FF8A45",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  pasteBubble: {
    backgroundColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  mealBubble: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  centerFab: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF8A45",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
  },
  centerFabTouchable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
