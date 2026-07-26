import React, { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS, FONTS } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import { useSubscription } from "../hooks/useSubscription";
import { subscriptionService } from "../services/subscription.service";
import CommonAlertModal, {
  CommonModalVariant,
} from "../components/CommonModal";

const SCREEN_BG = "#FCF7F3";
const TEXT_DARK = "#493026";
const TEXT_MUTED = "#7F6C64";
const BORDER = "#EDE5DE";
const ORANGE = "#E89457";
const GREEN = "#94AE7F";
const BADGE_BG = "#D6EEE5";
const BADGE_TEXT = "#007A4B";

const PREMIUM_FEATURES = [
  "All premium features",
  "Unlimited access",
  "Cancel anytime",
];

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  variant: CommonModalVariant;
  primaryText?: string;
  onPrimary?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
};

/** Badge copy per status — free tier still reads "Active" since it is the plan in force. */
const BADGE_LABELS: Record<string, string> = {
  free: "Active",
  trial: "Trial",
  active: "Active",
  cancelled: "Cancelling",
  expired: "Expired",
};

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark" size={ms(18)} color={GREEN} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

export default function ManageSubscriptionScreen({ navigation }: any) {
  const { isSubscribed, status, expiresAt, trialEndsAt, sync } =
    useSubscription();
  const [restoring, setRestoring] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
    variant: "info",
  });

  // Re-sync on focus so a freshly-landed purchase webhook or an App Store
  // cancellation is reflected the moment the user returns to this screen.
  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync]),
  );

  const handleManage = () => {
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/account/subscriptions"
        : "https://play.google.com/store/account/subscriptions";

    setAlert({
      visible: true,
      variant: "info",
      title: "Manage Subscription",
      message:
        Platform.OS === "ios"
          ? "You'll be taken to App Store subscription settings."
          : "You'll be taken to Google Play subscription settings.",
      secondaryText: "Not Now",
      primaryText: "Continue",
      onPrimary: () => Linking.openURL(url),
    });
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      await subscriptionService.restorePurchases();
      await sync();
      setAlert({
        visible: true,
        variant: "success",
        title: "Purchases Restored",
        message: "Your subscription has been restored.",
      });
    } catch (err: any) {
      setAlert({
        visible: true,
        variant: "error",
        title: "Restore Failed",
        message: err.message ?? "Please try again.",
      });
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Premium layout covers anyone with entitlement in force — including a
  // cancelled sub still inside its paid period.
  const showPremiumLayout = isSubscribed || status === "cancelled";
  const validUntil = status === "trial" ? trialEndsAt : expiresAt;
  const dateLabel =
    status === "trial"
      ? "Trial ends"
      : status === "cancelled"
        ? "Access until"
        : "Next billing date";

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: SCREEN_BG }]}
      edges={["top"]}
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
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: ms(36) }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {showPremiumLayout ? (
          /* ── Premium: single card with features, billing date, manage CTA ── */
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>CURRENT PLAN</Text>
            <View style={styles.cardDivider} />

            <View style={styles.planTitleRow}>
              <Text style={styles.planTitle}>Premium Plan</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {BADGE_LABELS[status] ?? "Active"}
                </Text>
              </View>
            </View>
            <Text style={styles.planSub}>
              Full access to all premium features
            </Text>

            <View style={styles.featureList}>
              {PREMIUM_FEATURES.map((f) => (
                <FeatureRow key={f} label={f} />
              ))}
            </View>

            {validUntil && (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>{dateLabel}</Text>
                  <Text style={styles.dateValue}>{formatDate(validUntil)}</Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.cta}
              onPress={handleManage}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>Manage Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Free: current-plan card + premium promo card ─────────────── */
          <>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>CURRENT PLAN</Text>
              <View style={styles.cardDivider} />

              <View style={styles.planTitleRow}>
                <Text style={styles.planTitle}>Free Plan</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {BADGE_LABELS[status] ?? "Active"}
                  </Text>
                </View>
              </View>
              <Text style={styles.planSub}>Basic access and features</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>PREMIUM PLAN</Text>
              <View style={styles.cardDivider} />

              <Text style={styles.planTitle}>Unlock Premium</Text>
              <Text style={styles.planSub}>Get more from your experience</Text>

              <View style={styles.featureList}>
                {PREMIUM_FEATURES.map((f) => (
                  <FeatureRow key={f} label={f} />
                ))}
              </View>

              <TouchableOpacity
                style={styles.cta}
                onPress={() => navigation.navigate("Subscription")}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>Update To Premium</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Info note */}
        <View style={styles.info}>
          <Text style={styles.infoNote}>
            {Platform.OS === "ios"
              ? "Subscriptions are managed through your Apple ID."
              : "Subscriptions are managed through Google Play."}
          </Text>
          <Text style={styles.infoNote2}>
            {
              "\nCancellation takes effect at the end of the current billing period."
            }
          </Text>
        </View>
      </ScrollView>

      {/* Restore — required for store compliance, kept as a quiet text link */}
      <TouchableOpacity
        style={styles.restoreBtn}
        onPress={handleRestore}
        disabled={restoring}
        activeOpacity={0.7}
      >
        {restoring ? (
          <ActivityIndicator size="small" color={TEXT_MUTED} />
        ) : (
          <Text style={styles.restoreText}>Restore Purchases</Text>
        )}
      </TouchableOpacity>

      <CommonAlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        primaryText={alert.primaryText}
        secondaryText={alert.secondaryText}
        onPrimary={() => {
          setAlert((a) => ({ ...a, visible: false }));
          alert.onPrimary?.();
        }}
        onSecondary={() => {
          setAlert((a) => ({ ...a, visible: false }));
          alert.onSecondary?.();
        }}
        onClose={() => setAlert((a) => ({ ...a, visible: false }))}
      />
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
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
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
    paddingBottom: ms(40),
    gap: ms(16),
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: ms(20),
    padding: ms(20),
  },
  cardEyebrow: {
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
    opacity: 0.5,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F4F4F4",
    marginVertical: ms(14),
  },

  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planTitle: {
    fontSize: ms(18),
    lineHeight: ms(26),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },
  planSub: {
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
    marginTop: ms(6),
  },
  badge: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(5),
    borderRadius: RADIUS.full,
    backgroundColor: BADGE_BG,
  },
  badgeText: {
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: FONTS.bold,
    color: BADGE_TEXT,
  },

  featureList: { marginTop: ms(18), gap: ms(14) },
  featureRow: { flexDirection: "row", alignItems: "center", gap: ms(10) },
  featureText: {
    fontSize: ms(14),
    lineHeight: ms(22),
    fontWeight: FONTS.medium,
    color: TEXT_DARK,
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
  },
  dateValue: {
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: FONTS.bold,
    color: TEXT_MUTED,
  },

  cta: {
    marginTop: ms(20),
    paddingVertical: ms(16),
    borderRadius: RADIUS.full,
    alignItems: "center",
    backgroundColor: ORANGE,
  },
  ctaText: {
    fontSize: ms(16),
    lineHeight: ms(22),
    fontWeight: FONTS.bold,
    color: "#FFFFFF",
  },

  info: {
    position: "relative",
  },

  infoNote: {
    fontSize: ms(12),
    lineHeight: ms(18),
    color: TEXT_MUTED,
    position: "absolute",
    alignSelf: "center",
  },

  infoNote2: {
    fontSize: ms(12),
    lineHeight: ms(18),
    textAlign: "center",
    color: TEXT_MUTED,
    paddingHorizontal: ms(84),
    position: "absolute",
    alignSelf: "center",
  },

  restoreBtn: {
    alignItems: "center",
    paddingVertical: ms(6),
    position: "absolute",
    left: 0,
    right: 0,
    bottom: ms(80),
    alignSelf: "center",
  },
  restoreText: {
    fontSize: ms(13),
    lineHeight: ms(18),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
    textDecorationLine: "underline",
  },
});
