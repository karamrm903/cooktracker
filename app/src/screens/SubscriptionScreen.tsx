import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import SafeAreaViewCustom from "../components/atoms/SafeAreaViewCustom";
import { useDispatch, useSelector } from "react-redux";
import { setSubscription } from "../store/slices/subscriptionSlice";
import { RootState } from "../store";
import Purchases, { PURCHASES_ERROR_CODE } from "react-native-purchases";
import { RC_ENTITLEMENT_ID } from "../config/revenuecat";
import { subscriptionService } from "../services/subscription.service";
import CommonAlertModal, { CommonModalVariant } from "../components/CommonModal";
import {
  BRAND_COLOR,
  DEFAULT_BG,
  TEXT_DARK,
  TEXT_MUTED,
  INPUT_BORDER,
  FORGOT_GREEN,
} from "../styles/colors";

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

const leafImg = require("../../assets/webp/UserInfoLeaf.webp");

// Figma-tuned tokens (kept local; not added to global colors.ts since they're
// branding for this screen alone).
const CARD_BG = "#FFFFFF";
const FEATURE_TINT = "#EAF0E2";
const TRIAL_TINT = "#FBE4D2";
const PLAN_TAB_INACTIVE_BG = "#FFFFFF";
const PLAN_TAB_ACTIVE_BG = BRAND_COLOR;
const STRIKETHROUGH = "#9C8676";
const FEATURE_ICON_BG = "#D8E2C7";

export default function SubscriptionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
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

  const pkgMap = {
    weekly: offerings?.current?.weekly ?? null,
    monthly: offerings?.current?.monthly ?? null,
    yearly: offerings?.current?.annual ?? null,
  };

  const annualPkg = pkgMap.yearly;
  const selectedPkg = pkgMap[selectedPlan];
  const hasTrial = selectedPkg?.product?.introPrice?.price === 0;
  const showTrialToggle = offeringsLoading || hasTrial;

  const yearlyPriceStr = annualPkg?.product?.priceString ?? "—";
  const monthlyPriceStr = pkgMap.monthly?.product?.priceString ?? "—";
  const weeklyPriceStr = pkgMap.weekly?.product?.priceString ?? "—";

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

  const originalMonthlyStr = monthlyPriceStr;

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

      if (!pkg) throw new Error(`${PLAN_LABELS[selectedPlan]} plan not available. Please try again.`);

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const entitlement = customerInfo.entitlements.active[RC_ENTITLEMENT_ID];

      if (entitlement) {
        const status = entitlement.periodType === "TRIAL" ? "trial" : "active";
        const activeSub = (customerInfo.activeSubscriptions[0] ?? "").toLowerCase();
        const plan = (
          activeSub.includes("weekly") ? "weekly" :
          activeSub.includes("monthly") ? "monthly" : "yearly"
        ) as PlanKey;
        finishSuccess(status, plan);
      } else {
        setAlert({
          visible: true,
          variant: "success",
          title: "Purchase Successful",
          message: "Your subscription is activating. If premium features aren't available yet, close and reopen the app.",
          primaryText: "OK",
          onPrimary: () => navigation.goBack(),
        });
      }
    } catch (err: any) {
      if (err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return;
      try {
        const info = await Purchases.getCustomerInfo();
        const entitlement = info.entitlements.active[RC_ENTITLEMENT_ID];
        if (entitlement) {
          const status = entitlement.periodType === "TRIAL" ? "trial" : "active";
          const activeSub = (info.activeSubscriptions[0] ?? "").toLowerCase();
          const plan = (
            activeSub.includes("weekly") ? "weekly" :
            activeSub.includes("monthly") ? "monthly" : "yearly"
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
        const activeSub = (customerInfo.activeSubscriptions[0] ?? "").toLowerCase();
        const plan = (
          activeSub.includes("weekly") ? "weekly" :
          activeSub.includes("monthly") ? "monthly" : "yearly"
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
  const trialEligiblePlan = selectedPlan === "yearly" || selectedPlan === "monthly";
  const trialActive = trialEligiblePlan && showTrialToggle && trialEnabled;
  const ctaLabel = trialActive ? "Start Free Trial" : `Get ${PLAN_LABELS[selectedPlan]} Plan`;
  const footerText = trialActive
    ? "No commitment. Cancel anytime."
    : `Billed ${selectedPlan === "weekly" ? "weekly" : selectedPlan === "monthly" ? "monthly" : "yearly"}. Cancel anytime.`;

  // Card render varies per plan
  function renderCardBody() {
    if (offeringsError) {
      return (
        <View style={styles.statusBlock}>
          <Text style={styles.statusText}>Could not load pricing</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadOfferings} activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (offeringsLoading) {
      return (
        <View style={styles.statusBlock}>
          <ActivityIndicator color={BRAND_COLOR} />
        </View>
      );
    }

    if (selectedPlan === "yearly") {
      return (
        <>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>80% OFF</Text>
          </View>

          <Text style={styles.strikethrough}>{originalMonthlyStr} / month</Text>

          <View style={styles.priceRow}>
            <Text style={styles.bigPrice}>{monthlyEquivStr}</Text>
            <Text style={styles.bigPriceUnit}> / month</Text>
          </View>

          <Text style={styles.billedAs}>Billed as {yearlyPriceStr} / year</Text>

          <View style={styles.divider} />

          <View style={styles.planRow}>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Yearly Plan</Text>
              <Text style={styles.planSub}>{yearlyPriceStr} yearly</Text>
            </View>
            <View style={styles.radioOuter}>
              <View style={styles.radioInner} />
            </View>
          </View>

          {showTrialToggle && <TrialToggle on={trialEnabled} onToggle={() => setTrialEnabled(v => !v)} />}
        </>
      );
    }

    if (selectedPlan === "monthly") {
      return (
        <>
          <View style={styles.priceRow}>
            <Text style={styles.bigPrice}>{monthlyPriceStr}</Text>
            <Text style={styles.bigPriceUnit}> / month</Text>
          </View>
          <Text style={styles.billedAs}>Billed monthly, cancel anytime</Text>
          <View style={styles.divider} />
          <View style={styles.planRow}>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Monthly Plan</Text>
              <Text style={styles.planSub}>No long-term commitment</Text>
            </View>
            <View style={styles.radioOuter}>
              <View style={styles.radioInner} />
            </View>
          </View>
          {showTrialToggle && <TrialToggle on={trialEnabled} onToggle={() => setTrialEnabled(v => !v)} />}
        </>
      );
    }

    return (
      <>
        <View style={styles.priceRow}>
          <Text style={styles.bigPrice}>{weeklyPriceStr}</Text>
          <Text style={styles.bigPriceUnit}> / week</Text>
        </View>
        <Text style={styles.billedAs}>Billed weekly, cancel anytime</Text>
        <View style={styles.divider} />
        <View style={styles.planRow}>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>Weekly Plan</Text>
            <Text style={styles.planSub}>Try it for a week</Text>
          </View>
          <View style={styles.radioOuter}>
            <View style={styles.radioInner} />
          </View>
        </View>
      </>
    );
  }

  return (
    <SafeAreaViewCustom backgroundColor={DEFAULT_BG} statusBarBg={DEFAULT_BG}>
      {/* Decorative leaf */}
      <View style={styles.leafDecor} pointerEvents="none">
        <Image source={leafImg} style={styles.fillImg} resizeMode="contain" />
      </View>

      <View style={styles.topBar}>
        {navigation.canGoBack() && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LIMITED OFFER</Text>
          <Text style={styles.title}>Your one-time{"\n"}launch offer</Text>
        </View>

        {/* Plan selector tabs (kept per request) */}
        <View style={styles.planSelector}>
          {(["weekly", "monthly", "yearly"] as PlanKey[]).map((plan) => {
            const active = selectedPlan === plan;
            return (
              <TouchableOpacity
                key={plan}
                style={[styles.planTab, active && styles.planTabActive]}
                onPress={() => setSelectedPlan(plan)}
                activeOpacity={0.85}
              >
                {plan === "yearly" && !active && (
                  <Text style={styles.bestValueBadge}>BEST VALUE</Text>
                )}
                <Text style={[styles.planTabLabel, active && styles.planTabLabelActive]}>
                  {PLAN_LABELS[plan]}
                </Text>
                <Text style={[styles.planTabPrice, active && styles.planTabPriceActive]}>
                  {offeringsLoading
                    ? "—"
                    : plan === "weekly"
                      ? weeklyPriceStr
                      : plan === "monthly"
                        ? monthlyPriceStr
                        : `${monthlyEquivStr}/mo`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Offer card */}
        <View style={styles.offerCard}>{renderCardBody()}</View>

        {/* Features */}
        <View style={styles.features}>
          {(
            [
              ["videocam", "Paste any cooking video link"],
              ["sparkles", "AI-powered recipe extraction"],
              ["stats-chart", "Instant nutrition breakdown"],
            ] as [keyof typeof Ionicons.glyphMap, string][]
          ).map(([icon, text], i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={icon} size={18} color={FORGOT_GREEN} />
              </View>
              <Text style={styles.featureText}>{text}</Text>
              <Ionicons name="checkmark" size={20} color={FORGOT_GREEN} />
            </View>
          ))}
        </View>

        <View style={styles.scrollFooter}>
          <TouchableOpacity onPress={handleRestore} disabled={purchasing || offeringsLoading} activeOpacity={0.6}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
          <Text style={styles.legalText}>
            {Platform.OS === "ios"
              ? "Payment charged to your Apple ID at confirmation. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Managed in App Store settings."
              : "Payment charged to your Google Play account at confirmation. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Managed in Google Play settings."}
          </Text>
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View style={[styles.ctaFloat, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, ctaDisabled && { opacity: 0.6 }]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={ctaDisabled}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.ctaFooter}>{footerText}</Text>
      </View>

      <CommonAlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        primaryText={alert.primaryText}
        secondaryText={alert.secondaryText}
        onPrimary={() => { setAlert(a => ({ ...a, visible: false })); alert.onPrimary?.(); }}
        onSecondary={() => { setAlert(a => ({ ...a, visible: false })); alert.onSecondary?.(); }}
        onClose={() => setAlert(a => ({ ...a, visible: false }))}
      />
    </SafeAreaViewCustom>
  );
}

function TrialToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={styles.trialRow} onPress={onToggle} activeOpacity={0.85}>
      <View style={{ flex: 1 }}>
        <Text style={styles.trialLabel}>3-day free trial</Text>
        <Text style={styles.trialSub}>Cancel anytime before trial ends</Text>
      </View>
      <View style={[styles.toggle, on && styles.toggleOn]}>
        <View style={[styles.toggleThumb, on && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  leafDecor: {
    position: "absolute",
    top: 130,
    right: -20,
    width: 160,
    height: 150,
    zIndex: 1,
  },
  fillImg: { width: "100%", height: "100%" },

  topBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  scroll: {
    paddingHorizontal: 20,
    gap: 16,
  },

  header: {
    paddingTop: 12,
    gap: 6,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "800",
    color: BRAND_COLOR,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.5,
    lineHeight: 42,
  },

  // Plan tabs
  planSelector: { flexDirection: "row", gap: 8 },
  planTab: {
    flex: 1,
    height: 78,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: PLAN_TAB_INACTIVE_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  planTabActive: {
    backgroundColor: PLAN_TAB_ACTIVE_BG,
    borderColor: PLAN_TAB_ACTIVE_BG,
  },
  bestValueBadge: {
    fontSize: 9,
    fontWeight: "800",
    color: BRAND_COLOR,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  planTabLabel: { fontSize: 13, fontWeight: "700", color: TEXT_DARK },
  planTabLabelActive: { color: "#FFFFFF" },
  planTabPrice: { fontSize: 12, fontWeight: "600", color: TEXT_MUTED },
  planTabPriceActive: { color: "#FFFFFF" },

  // Offer card
  offerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  statusBlock: { alignItems: "center", paddingVertical: 24, gap: 12 },
  statusText: { fontSize: 14, color: TEXT_MUTED },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: TEXT_DARK },

  strikethrough: {
    fontSize: 15,
    color: STRIKETHROUGH,
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  bigPrice: {
    fontSize: 44,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -1,
    lineHeight: 50,
  },
  bigPriceUnit: {
    fontSize: 16,
    color: TEXT_MUTED,
    fontWeight: "500",
    marginBottom: 8,
  },
  billedAs: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "400",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: INPUT_BORDER,
    marginVertical: 12,
  },

  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planInfo: { gap: 2 },
  planName: { fontSize: 16, fontWeight: "700", color: TEXT_DARK },
  planSub: { fontSize: 13, color: TEXT_MUTED },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: TEXT_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TEXT_DARK,
  },

  trialRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TRIAL_TINT,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    gap: 12,
  },
  trialLabel: { fontSize: 15, fontWeight: "700", color: TEXT_DARK },
  trialSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E0D3C2",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: BRAND_COLOR },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  toggleThumbOn: { alignSelf: "flex-end" },

  // Features
  features: {
    backgroundColor: FEATURE_TINT,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: FEATURE_ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, fontSize: 15, fontWeight: "600", color: TEXT_DARK },

  scrollFooter: { alignItems: "center", gap: 10, marginTop: 4 },
  restoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  legalText: {
    fontSize: 10,
    fontWeight: "400",
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 14,
    paddingHorizontal: 8,
  },

  ctaFloat: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: DEFAULT_BG,
    alignItems: "center",
    gap: 6,
  },
  ctaBtn: {
    width: "100%",
    backgroundColor: BRAND_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  ctaFooter: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
});
