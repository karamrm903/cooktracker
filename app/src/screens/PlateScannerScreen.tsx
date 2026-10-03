import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useSelector } from "react-redux";
import { useTheme } from "../context/ThemeContext";
import { FONTS, FONT_SIZES, RADIUS, SHADOWS, SPACING } from "../constants/theme";
import { moderateScale as ms, SCREEN_WIDTH } from "../utils/responsive";
import {
  analyzePlateImage,
  PlateAnalysisResult,
  FALLBACK_PLATE_ANALYSIS,
} from "../services/plateScanner.service";
import { RootState } from "../store";

function getItemDotColor(item: any, primaryColor: string): string {
  if (!item) return primaryColor;
  if (item.dotColor && item.dotColor !== "#06B6D4") return item.dotColor;
  switch (item.category) {
    case "protein":
      return "#FF8A45";
    case "carb":
      return "#F59E0B";
    case "veggie":
      return "#22C55E";
    case "fat":
      return "#EC4899";
    case "condiment":
      return "#8B5CF6";
    default:
      return primaryColor;
  }
}

export default function PlateScannerScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSelector((state: RootState) => state.auth.session);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Phase 1 controls
  const diningContext = "dining_in";
  const [torchOn, setTorchOn] = useState(false);

  // Phase 2: Instant Recognition state
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<PlateAnalysisResult | null>(null);

  // Scan line animation for recognition phase
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnalyzing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [isAnalyzing]);

  const handleRequestPermission = async () => {
    try {
      if (requestPermission) {
        await requestPermission();
      }
    } catch (e) {
      console.warn("Could not request camera permission:", e);
    }
  };

  // Safe initial request on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!permission?.granted && permission?.canAskAgain) {
          await requestPermission();
        }
      } catch (err) {
        if (mounted) {
          console.warn("Failed to request camera permission automatically:", err);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      if (photo?.uri) {
        setCapturedPhotoUri(photo.uri);
        const result = await analyzePlateImage({
          image: photo.base64
            ? `data:image/jpeg;base64,${photo.base64}`
            : photo.uri,
          diningContext,
          mealType: "dinner",
          session,
        });
        setAnalysisResult(result);
      }
    } catch (err: any) {
      console.warn("Error capturing/analyzing photo:", err);
      Alert.alert(
        "Scanning Failed",
        "Could not analyze the plate. Please verify your connection to the server or try selecting an image from your gallery.",
        [{ text: "OK", onPress: () => handleRetake() }]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePickGallery = async () => {
    if (isAnalyzing) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedPhotoUri(asset.uri);
        setIsAnalyzing(true);

        const analysis = await analyzePlateImage({
          image: asset.base64
            ? `data:image/jpeg;base64,${asset.base64}`
            : asset.uri,
          diningContext,
          mealType: "dinner",
          session,
        });
        setAnalysisResult(analysis);
        setIsAnalyzing(false);
      }
    } catch (err: any) {
      console.warn("Error picking/analyzing image:", err);
      Alert.alert(
        "Analysis Failed",
        "Could not analyze the selected image. Please try again.",
        [{ text: "OK", onPress: () => handleRetake() }]
      );
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhotoUri(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
  };

  const handleViewResults = () => {
    if (!analysisResult) return;
    navigation.navigate("PlateResults", {
      photoUri: capturedPhotoUri,
      analysis: analysisResult,
      diningContext,
    });
  };

  // Permission fallback
  if (!permission?.granted) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "#0A0A0A" : "#FCF7F3",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          },
        ]}
      >
        <View
          style={{
            width: ms(88),
            height: ms(88),
            borderRadius: ms(44),
            backgroundColor: isDark ? "#2A241F" : "#FFF3E8",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: ms(20),
          }}
        >
          <Ionicons name="camera-outline" size={ms(48)} color={colors.primary} />
        </View>
        <Text style={[styles.permTitle, { color: colors.text }]}>
          Camera Access Required
        </Text>
        <Text style={[styles.permSub, { color: colors.textMuted }]}>
          Allow camera access to scan your food plates, or select an existing photo from your library.
        </Text>
        <TouchableOpacity
          style={[styles.permBtn, { backgroundColor: colors.primary, width: "100%", alignItems: "center" }]}
          onPress={handleRequestPermission}
          activeOpacity={0.85}
        >
          <Text style={styles.permBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.permBtn,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? colors.border : "#FEEBDD",
              borderWidth: 1,
              marginTop: 12,
              width: "100%",
              alignItems: "center",
            },
          ]}
          onPress={handlePickGallery}
          activeOpacity={0.8}
        >
          <Text style={[styles.permBtnText, { color: colors.text }]}>
            Upload from Gallery Instead
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: 24 }}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: colors.textMuted, fontSize: FONT_SIZES.label, fontWeight: "600" }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scanLineTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * 0.85],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── CAMERA / PHOTO VIEWPORT ── */}
      {capturedPhotoUri ? (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: capturedPhotoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {/* Dark gradient overlay for readability */}
          <View style={styles.darkGradientOverlay} />
        </View>
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
        />
      )}

      {/* ── TOP BAR (Back button + Torch toggle) ── */}
      <SafeAreaView style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleIconBtn}
            onPress={() => (capturedPhotoUri ? handleRetake() : navigation.goBack())}
            activeOpacity={0.8}
          >
            <Ionicons
              name={capturedPhotoUri ? "arrow-back" : "close"}
              size={ms(22)}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Torch toggle */}
          <TouchableOpacity
            style={[styles.circleIconBtn, torchOn && { backgroundColor: "rgba(255,138,69,0.3)" }]}
            onPress={() => setTorchOn(!torchOn)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={torchOn ? "flash" : "flash-outline"}
              size={ms(20)}
              color={torchOn ? colors.primary : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── FRAMING BRACKETS VIEWPORT (Image 1 & 2) ── */}
      <View style={styles.framingContainer} pointerEvents="none">
        <View style={styles.framingBox}>
          {/* 4 Corner Brackets (Brand Orange) */}
          <View style={[styles.cornerBracket, styles.topLeftBracket]} />
          <View style={[styles.cornerBracket, styles.topRightBracket]} />
          <View style={[styles.cornerBracket, styles.bottomLeftBracket]} />
          <View style={[styles.cornerBracket, styles.bottomRightBracket]} />

          {/* Animated Scanning Laser Line during analysis */}
          {isAnalyzing && (
            <Animated.View
              style={[
                styles.scanLaser,
                { transform: [{ translateY: scanLineTranslate }] },
              ]}
            />
          )}
        </View>
      </View>

      {/* ── PHASE 2: INSTANT RECOGNITION & INITIAL SCORING CARD (Image 2) ── */}
      {capturedPhotoUri && (
        <View
          style={[
            styles.phase2Card,
            {
              backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
              borderColor: isDark ? colors.border : "#FEEBDD",
              paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 16,
            },
            SHADOWS.lg,
          ]}
        >
          {isAnalyzing ? (
            <View style={styles.analyzingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.analyzingText, { color: colors.text }]}>
                Scanning meal components with AI...
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                Identifying ingredients & nutritional balance
              </Text>
            </View>
          ) : analysisResult ? (
            <View style={{ width: "100%" }}>
              {/* Detected Item Pills */}
              <View style={styles.pillsWrap}>
                {analysisResult.items.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.itemPill,
                      {
                        backgroundColor: isDark ? colors.surfaceAlt : "#FFF6EE",
                        borderColor: isDark ? colors.border : "#FEEBDD",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.itemDot,
                        { backgroundColor: getItemDotColor(item, colors.primary) },
                      ]}
                    />
                    <Text style={[styles.itemPillText, { color: colors.text }]}>
                      {item.name}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Score and Items found */}
              <View style={styles.scoreRow}>
                <Text style={[styles.plateScoredLabel, { color: colors.text }]}>
                  Plate scored.
                </Text>
                <Text style={styles.scoreNumber}>
                  {analysisResult.initialScore || 100}%
                </Text>
              </View>

              {/* Green Progress Bar */}
              <View
                style={[
                  styles.scoreBarTrack,
                  { backgroundColor: isDark ? "#2A2F3D" : "#F0ECE8" },
                ]}
              >
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${analysisResult.initialScore || 100}%`,
                      backgroundColor: "#22C55E",
                    },
                  ]}
                />
              </View>

              <Text style={[styles.itemsFoundCount, { color: colors.textMuted }]}>
                {analysisResult.items.length} items found
              </Text>

              {/* View results Button */}
              <TouchableOpacity
                style={[
                  styles.viewResultsBtn,
                  { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={handleViewResults}
                activeOpacity={0.85}
              >
                <Text style={[styles.viewResultsText, { color: "#FFFFFF" }]}>
                  View results
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {/* ── PHASE 1 BOTTOM CONTROLS (Shutter, Gallery, Torch) ── */}
      {!capturedPhotoUri && (
        <View
          style={[
            styles.bottomControlsWrap,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 },
          ]}
        >
          {/* Shutter Bar with Flash & Gallery */}
          <View style={styles.shutterBar}>
            {/* Gallery picker */}
            <TouchableOpacity
              style={styles.shutterSideBtn}
              onPress={handlePickGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={ms(26)} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Big Circular White Shutter Button */}
            <TouchableOpacity
              style={styles.shutterOuter}
              onPress={handleCapture}
              activeOpacity={0.85}
              disabled={isAnalyzing}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            {/* Retake / Torch toggle */}
            <TouchableOpacity
              style={styles.shutterSideBtn}
              onPress={() => setTorchOn(!torchOn)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={torchOn ? "flash" : "flash-outline"}
                size={ms(26)}
                color={torchOn ? colors.primary : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const BRACKET_SIZE = 28;
const BRACKET_THICKNESS = 4;
const BRACKET_COLOR = "#FF8A45"; // Brand Orange

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D11",
  },
  darkGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  topBarSafe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingTop: Platform.OS === "android" ? 12 : 4,
  },
  circleIconBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  framingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: ms(140),
  },
  framingBox: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    position: "relative",
  },
  cornerBracket: {
    position: "absolute",
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: BRACKET_COLOR,
  },
  topLeftBracket: {
    top: 0,
    left: 0,
    borderTopWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
    borderTopLeftRadius: 10,
  },
  topRightBracket: {
    top: 0,
    right: 0,
    borderTopWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
    borderTopRightRadius: 10,
  },
  bottomLeftBracket: {
    bottom: 0,
    left: 0,
    borderBottomWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
    borderBottomLeftRadius: 10,
  },
  bottomRightBracket: {
    bottom: 0,
    right: 0,
    borderBottomWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
    borderBottomRightRadius: 10,
  },
  scanLaser: {
    height: 2,
    backgroundColor: "#FF8A45",
    shadowColor: "#FF8A45",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
    width: "100%",
  },
  bottomControlsWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shutterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: ms(32),
  },
  shutterOuter: {
    width: ms(78),
    height: ms(78),
    borderRadius: ms(39),
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  shutterInner: {
    width: ms(62),
    height: ms(62),
    borderRadius: ms(31),
    backgroundColor: "#FFFFFF",
  },
  shutterSideBtn: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Phase 2
  phase2Card: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: ms(20),
    paddingTop: ms(18),
    borderTopWidth: 1,
    borderColor: "#FEEBDD",
  },
  analyzingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(32),
    gap: ms(14),
  },
  analyzingText: {
    color: "#3D2618",
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
  },
  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ms(8),
    marginBottom: ms(16),
  },
  itemPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF6EE",
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "#FEEBDD",
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  itemPillText: {
    color: "#3D2618",
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ms(6),
  },
  plateScoredLabel: {
    color: "#3D2618",
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
  },
  scoreNumber: {
    color: "#22C55E",
    fontSize: FONT_SIZES.h2,
    fontWeight: "800",
  },
  scoreBarTrack: {
    height: 6,
    backgroundColor: "#F0ECE8",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: ms(8),
  },
  scoreBarFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 3,
  },
  itemsFoundCount: {
    color: "#888888",
    fontSize: FONT_SIZES.small,
    marginBottom: ms(16),
  },
  viewResultsBtn: {
    width: "100%",
    height: ms(48),
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: "#FF8A45",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF8A45",
  },
  viewResultsText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
  },
  permTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  permSub: {
    fontSize: FONT_SIZES.body,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  permBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
  },
  permBtnText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.button,
    fontWeight: "700",
  },
});
