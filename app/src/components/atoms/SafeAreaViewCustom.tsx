import React from "react";
import { StatusBar, StyleSheet, View, ViewStyle } from "react-native";
import {
  Edge,
  SafeAreaView,
} from "react-native-safe-area-context";
import { BRAND_COLOR, DEFAULT_BG } from "../../styles/colors";

interface Props {
  children: React.ReactNode;
  backgroundColor?: string;
  statusBarBg?: string;
  statusBarStyle?: "light-content" | "dark-content";
  edges?: Edge[];
  style?: ViewStyle | ViewStyle[];
}

export default function SafeAreaViewCustom({
  children,
  backgroundColor = DEFAULT_BG,
  statusBarBg = BRAND_COLOR,
  statusBarStyle = "dark-content",
  edges = ["top", "bottom"],
  style,
}: Props) {
  return (
    <View style={[styles.root, { backgroundColor }]}>
      <StatusBar
        backgroundColor={statusBarBg}
        barStyle={statusBarStyle}
        translucent={false}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor }, style]}
        edges={edges}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
