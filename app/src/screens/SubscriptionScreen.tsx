import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";
import type { Colors } from "../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { setSubscription } from "../store/slices/subscriptionSlice";
import { RootState } from "../store";
import Purchases, { PURCHASES_ERROR_CODE } from "react-native-purchases";
import { RC_ENTITLEMENT_ID } from "../config/revenuecat";
import { subscriptionService } from "../services/subscription.service";
import CommonAlertModal, { CommonModalVariant } from "../components/CommonModal";

type PlanKey = "weekly" | "monthly" | "yearly";

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

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const PLAN_LABELS: Record<PlanKey, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function SubscriptionScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const session = useSelector((s: RootState) => s.auth.session);

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("yearly");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [offeringsError, setOfferingsError] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    visible: false, title: "", message: "", variant: "info",
  });
  const purchasingRef = useRef(false);

  const loadOfferings = useCallback(async () => {
    setOfferingsLoading(true);
    setOfferingsError(false);
    try {
      const o = await Purchases.getOfferings();
      setOfferings(o);
    } catch (err: any) {
      console.warn("[SubscriptionScreen] getOfferings failed:", err.message);
      setOfferingsError(true);
    } finally {
      setOfferingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  // RC package map — 'annual' is RC's identifier for yearly
  const pkgMap = {
    weekly: offerings?.current?.weekly ?? null,
    monthly: offerings?.current?.monthly ?? null,
    yearly: offerings?.current?.annual ?? null,
  };

  const annualPkg = pkgMap.yearly;
  const selectedPkg = pkgMap[selectedPlan];
  const hasTrial = selectedPkg?.product?.introPrice?.price === 0;
  const showTrialToggle = offeringsLoading || hasTrial;

  // All prices from RC only — no hardcoded fallbacks
  const yearlyPriceStr = annualPkg?.product?.priceString ?? "—";
  const monthlyPriceStr = pkgMap.monthly?.product?.priceString ?? "—";
  const weeklyPriceStr = pkgMap.weekly?.product?.priceString ?? "—";

  // Monthly equivalent = yearly price / 12, formatted with RC's currency
  const monthlyEquivStr = (() => {
    const p = annualPkg?.product;
    if (!p?.price || !p?.currencyCode) return "—";
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: p.currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(p.price / 12);
    } catch {
      return "—";
    }
  })();

  // Strikethrough "was" price = actual monthly plan price (authentic, not inflated)
  const originalMonthlyStr = monthlyPriceStr;

  // Shared post-purchase handler. Dispatches the RC status immediately (instant
  // UI), then polls the BE so the server-side state (which usage gates rely on)
  // catches up via the RevenueCat webhook. Navigation depends on context:
  //  - no session (onboarding flow): go create the account
  //  - reachable back stack (opened from Manage Subscription): pop back
  //  - rendered as the Premium tab: stay put — the tab unmounts once subscribed
  function finishSuccess(status: "trial" | "active", plan: PlanKey) {
    dispatch(setSubscription({ status, plan }));

    if (session?.access_token) {
      subscriptionService.pollSubscriptionStatus(session).catch(() => {});
    }

    if (!session?.access_token) {
      navigation.navigate("AccountCreation" as any);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  async function handlePurchase() {
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    setPurchasing(true);

    try {
      const o = offerings ?? (await Purchases.getOfferings());
      const pkg =
        selectedPlan === "yearly"
          ? o.current?.annual
          : selectedPlan === "monthly"
            ? o.current?.monthly
            : o.current?.weekly;

      if (!pkg)
        throw new Error(
          `${PLAN_LABELS[selectedPlan]} plan not available. Please try again.`,
        );

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const entitlement = customerInfo.entitlements.active[RC_ENTITLEMENT_ID];

      if (entitlement) {
        const status = entitlement.periodType === "TRIAL" ? "trial" : "active";
        const activeSub = (
          customerInfo.activeSubscriptions[0] ?? ""
        ).toLowerCase();
        const plan = (
          activeSub.includes("weekly")
            ? "weekly"
            : activeSub.includes("monthly")
              ? "monthly"
              : "yearly"
        ) as PlanKey;
        finishSuccess(status, plan);
      } else {
        setAlert({
          visible: true,
          variant: "success",
          title: "Purchase Successful",
          message:
            "Your subscription is activating. If premium features aren't available yet, close and reopen the app.",
          primaryText: "OK",
          onPrimary: () => navigation.goBack(),
        });
      }
    } catch (err: any) {
      if (err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return;

      // Network may have failed AFTER Apple charged the user. Ask RC for the
      // authoritative entitlement state before declaring failure — if Apple
      // recorded the purchase, the entitlement is already active.
      try {
        const info = await Purchases.getCustomerInfo();
        const entitlement = info.entitlements.active[RC_ENTITLEMENT_ID];
        if (entitlement) {
          const status =
            entitlement.periodType === "TRIAL" ? "trial" : "active";
          const activeSub = (info.activeSubscriptions[0] ?? "").toLowerCase();
          const plan = (
            activeSub.includes("weekly")
              ? "weekly"
              : activeSub.includes("monthly")
                ? "monthly"
                : "yearly"
          ) as PlanKey;
          finishSuccess(status, plan);
          return;
        }
      } catch {}

      setAlert({
        visible: true,
        variant: "error",
        title: "Purchase Failed",
        message: err.message ?? "Something went wrong. Please try again.",
      });
    } finally {
      purchasingRef.current = false;
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
      if (entitlement) {
        const status = entitlement.periodType === "TRIAL" ? "trial" : "active";
        const activeSub = (
          customerInfo.activeSubscriptions[0] ?? ""
        ).toLowerCase();
        const plan = (
          activeSub.includes("weekly")
            ? "weekly"
            : activeSub.includes("monthly")
              ? "monthly"
              : "yearly"
        ) as "weekly" | "monthly" | "yearly";
        dispatch(setSubscription({ status, plan }));
        setAlert({
          visible: true,
          variant: "success",
          title: "Restored",
          message: "Your subscription has been restored.",
          primaryText: "OK",
          onPrimary: () => navigation.goBack(),
        });
      } else {
        setAlert({
          visible: true,
          variant: "info",
          title: "Nothing to Restore",
          message: "No active subscription was found for this Apple ID.",
        });
      }
    } catch (err: any) {
      setAlert({
        visible: true,
        variant: "error",
        title: "Restore Failed",
        message: err.message ?? "Could not restore purchases. Please try again.",
      });
    }
  }

  const ctaDisabled = purchasing || offeringsLoading || offeringsError;

  // Trial is offered on the yearly AND monthly tabs (both render the toggle).
  const trialEligiblePlan =
    selectedPlan === "yearly" || selectedPlan === "monthly";
  const trialActive = trialEligiblePlan && showTrialToggle && trialEnabled;

  const billingWord =
    selectedPlan === "weekly"
      ? "weekly"
      : selectedPlan === "monthly"
        ? "monthly"
        : "yearly";

  const ctaLabel = trialActive
    ? "Start Free Trial"
    : `Get ${PLAN_LABELS[selectedPlan]} Plan`;

  const footerText = trialActive
    ? `Free for 3 days, then billed ${billingWord}. Cancel anytime.`
    : `Billed ${billingWord}. Cancel anytime.`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 92 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LIMITED OFFER</Text>
        </View>

        {/* Plan selector */}
        <View style={styles.planSelector}>
          {(["weekly", "monthly", "yearly"] as PlanKey[]).map((plan) => (
            <TouchableOpacity
              key={plan}
              style={[
                styles.planTab,
                selectedPlan === plan && styles.planTabActive,
              ]}
              onPress={() => setSelectedPlan(plan)}
              activeOpacity={0.7}
            >
              {plan === "yearly" && (
                <Text style={styles.bestValueBadge}>BEST VALUE</Text>
              )}
              <Text
                style={[
                  styles.planTabLabel,
                  selectedPlan === plan && styles.planTabLabelActive,
                ]}
              >
                {PLAN_LABELS[plan]}
              </Text>
              <Text
                style={[
                  styles.planTabPrice,
                  selectedPlan === plan && styles.planTabPriceActive,
                ]}
              >
                {offeringsLoading
                  ? "—"
                  : plan === "weekly"
                    ? weeklyPriceStr
                    : plan === "monthly"
                      ? monthlyPriceStr
                      : monthlyEquivStr + "/mo"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Offer card — content adapts to selected plan */}
        <View style={styles.offerCard}>
          {selectedPlan === "yearly" && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>80% OFF</Text>
            </View>
          )}

          {offeringsError ? (
            <View style={styles.statusBlock}>
              <Text style={styles.statusText}>Could not load pricing</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadOfferings}
                activeOpacity={0.7}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : offeringsLoading ? (
            <View style={styles.statusBlock}>
              <ActivityIndicator color={colors.cardInvertedText} />
            </View>
          ) : selectedPlan === "yearly" ? (
            <>
              <View style={styles.priceSection}>
                <Text style={styles.originalPrice}>
                  {originalMonthlyStr} / month
                </Text>
                <View style={styles.newPriceRow}>
                  <Text style={styles.newPrice}>{monthlyEquivStr}</Text>
                  <Text style={styles.period}>/ month</Text>
                </View>
                <Text style={styles.billedAs}>
                  Billed as {yearlyPriceStr} / year
                </Text>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.planRow}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Yearly Plan</Text>
                  <Text style={styles.planSub}>{yearlyPriceStr} / year</Text>
                </View>
                <View style={styles.selectedDot} />
              </View>

              {showTrialToggle && (
                <TouchableOpacity
                  style={styles.trialRow}
                  onPress={() => setTrialEnabled((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View style={styles.trialInfo}>
                    <Text style={styles.trialLabel}>3-day free trial</Text>
                    <Text style={styles.trialSub}>
                      Cancel anytime before trial ends
                    </Text>
                  </View>
                  <View
                    style={[styles.toggle, trialEnabled && styles.toggleOn]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        trialEnabled && styles.toggleThumbOn,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              )}
            </>
          ) : selectedPlan === "monthly" ? (
            <>
              <View style={styles.priceSection}>
                <View style={styles.newPriceRow}>
                  <Text style={styles.newPrice}>{monthlyPriceStr}</Text>
                  <Text style={styles.period}>/ month</Text>
                </View>
                <Text style={styles.billedAs}>
                  Billed monthly, cancel anytime
                </Text>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.planRow}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Monthly Plan</Text>
                  <Text style={styles.planSub}>No long-term commitment</Text>
                </View>
                <View style={styles.selectedDot} />
              </View>
              {showTrialToggle && (
                <TouchableOpacity
                  style={styles.trialRow}
                  onPress={() => setTrialEnabled((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View style={styles.trialInfo}>
                    <Text style={styles.trialLabel}>3-day free trial</Text>
                    <Text style={styles.trialSub}>
                      Cancel anytime before trial ends
                    </Text>
                  </View>
                  <View
                    style={[styles.toggle, trialEnabled && styles.toggleOn]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        trialEnabled && styles.toggleThumbOn,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.priceSection}>
                <View style={styles.newPriceRow}>
                  <Text style={styles.newPrice}>{weeklyPriceStr}</Text>
                  <Text style={styles.period}>/ week</Text>
                </View>
                <Text style={styles.billedAs}>
                  Billed weekly, cancel anytime
                </Text>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.planRow}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Weekly Plan</Text>
                  <Text style={styles.planSub}>Try it for a week</Text>
                </View>
                <View style={styles.selectedDot} />
              </View>
            </>
          )}
        </View>

        {/* Features */}
        <View style={styles.features}>
          {(
            [
              ["🎬", "Paste any cooking video link"],
              ["🤖", "AI-powered recipe extraction"],
              ["📊", "Instant nutrition breakdown"],
              ["⏱️", "Guided cooking with timers"],
              ["📁", "Unlimited saved recipes"],
            ] as [string, string][]
          ).map(([emoji, text], i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{emoji}</Text>
              <Text style={styles.featureText}>{text}</Text>
              <Text style={styles.featureCheck}>✓</Text>
            </View>
          ))}
        </View>

        {/* Trial / billing info, restore + legal — scroll to reveal below the
            floating CTA */}
        <View style={styles.scrollFooter}>
          <Text style={styles.footerText}>{footerText}</Text>

          <TouchableOpacity
            onPress={handleRestore}
            disabled={purchasing || offeringsLoading}
            activeOpacity={0.6}
          >
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>

          <Text style={[styles.legalText, { color: colors.textDisabled }]}>
            {Platform.OS === "ios"
              ? "Payment charged to your Apple ID at confirmation. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Managed in App Store settings."
              : "Payment charged to your Google Play account at confirmation. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Managed in Google Play settings."}
          </Text>
        </View>
      </ScrollView>

      {/* Floating CTA — sticks to bottom, overlays the scroll */}
      <View style={[styles.ctaFloat, { paddingBottom: 10 }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, ctaDisabled && { opacity: 0.6 }]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={ctaDisabled}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.btnPrimaryText} />
          ) : (
            <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

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

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    topBar: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 999,
      backgroundColor: colors.backBtnBg,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    backArrow: { fontSize: 17, color: colors.text, lineHeight: 21 },

    scroll: { paddingHorizontal: 24, paddingBottom: 16, gap: 16 },

    header: {
      paddingTop: 12,
      gap: 4,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
      letterSpacing: 1.5,
    },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
      lineHeight: 40,
    },

    // ── Plan selector ─────────────────────────────────────────────────────────
    planSelector: { flexDirection: "row", gap: 8 },
    planTab: {
      flex: 1,
      borderRadius: 16,
      padding: 12,
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: "transparent",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    planTabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    bestValueBadge: {
      fontSize: 8,
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    planTabLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    planTabLabelActive: { color: colors.text },
    planTabPrice: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    planTabPriceActive: { color: colors.primary },

    // ── Offer card ────────────────────────────────────────────────────────────
    offerCard: {
      backgroundColor: colors.cardInverted,
      borderRadius: 24,
      padding: 24,
      gap: 20,
      borderWidth: 1,
      borderColor: colors.cardInvertedDivider,
    },
    discountBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
    },
    discountText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },

    statusBlock: { alignItems: "center", paddingVertical: 16, gap: 12 },
    statusText: { fontSize: 14, color: colors.cardInvertedSub },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.cardInvertedDivider,
    },
    retryText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.cardInvertedText,
    },

    priceSection: { gap: 4 },
    originalPrice: {
      fontSize: 14,
      color: colors.cardInvertedSub,
      textDecorationLine: "line-through",
      fontWeight: "500",
    },
    newPriceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    newPrice: {
      fontSize: 42,
      fontWeight: "800",
      color: colors.cardInvertedText,
      letterSpacing: -1,
      lineHeight: 50,
    },
    period: { fontSize: 14, color: colors.cardInvertedSub, fontWeight: "400" },
    billedAs: {
      fontSize: 13,
      color: colors.cardInvertedSub,
      fontWeight: "400",
    },

    cardDivider: { height: 1, backgroundColor: colors.cardInvertedDivider },

    planRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    planInfo: { gap: 2 },
    planName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.cardInvertedText,
    },
    planSub: { fontSize: 13, color: colors.cardInvertedSub },
    selectedDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.3)",
    },

    trialRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: 14,
    },
    trialInfo: { gap: 2 },
    trialLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.cardInvertedText,
    },
    trialSub: { fontSize: 12, color: colors.cardInvertedSub },
    toggle: {
      width: 46,
      height: 26,
      borderRadius: 13,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    toggleOn: { backgroundColor: colors.primary },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.6)",
    },
    toggleThumbOn: { backgroundColor: "#FFFFFF", alignSelf: "flex-end" },

    // ── Features ──────────────────────────────────────────────────────────────
    features: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    featureEmoji: { fontSize: 20, width: 28 },
    featureText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    featureCheck: { fontSize: 15, color: colors.secondary, fontWeight: "700" },

    // ── In-scroll footer (trial info, restore, legal) ──────────────────────────
    scrollFooter: { alignItems: "center", gap: 8, marginTop: 4 },
    footerText: {
      fontSize: 12,
      color: colors.textDisabled,
      fontWeight: "400",
      textAlign: "center",
    },
    restoreText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      paddingVertical: 2,
    },
    legalText: {
      fontSize: 9,
      fontWeight: "400",
      textAlign: "center",
      lineHeight: 12,
      paddingHorizontal: 8,
    },

    // ── Floating CTA — absolute, stuck to bottom ────────────────────────────────
    ctaFloat: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 24,
      paddingTop: 10,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    ctaBtn: {
      width: "100%",
      backgroundColor: colors.btnPrimary,
      paddingVertical: 15,
      borderRadius: 999,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    ctaBtnText: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.btnPrimaryText,
      letterSpacing: 0.2,
    },
  });
}
