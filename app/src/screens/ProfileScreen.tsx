import React, { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { RADIUS, FONTS } from "../constants/theme";
import { moderateScale as ms } from "../utils/responsive";
import { SVG_ICONS, SVG_ICON_COMPONENT_MAP } from "../constants/svgIcons";
import { useLanguage } from "../context/LanguageContext";
import { LANGUAGE_META } from "../i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import {
  setAuthSession,
  setPersistedAccessToken,
  setOnboardingStatus,
} from "../store/slices/authSlice";
import { clearSubscription } from "../store/slices/subscriptionSlice";
import { authService } from "../services/auth.service";
import { profileService } from "../services/profile.service";
import { subscriptionService } from "../services/subscription.service";
import { useSubscription } from "../hooks/useSubscription";
import { RootState } from "../store";
import LanguagePickerModal from "../components/LanguagePickerModal";

const SCREEN_BG = "#FCF7F3";
const TEXT_DARK = "#493026";
const TEXT_MUTED = "#7F6C64";
const GREEN = "#94AE7F";
const GREEN_LIGHT = "#E1EADA";
const RED = "#E04D4D";

const leafImg = require("../../assets/pngs/caloriesLeaf.png");
const fireImg = require("../../assets/webp/StreakFire.webp");

const SUBSCRIPTION_LABELS: Record<string, string> = {
  free: "Not subscribed",
  trial: "Free trial active",
  active: "Premium",
  cancelled: "Premium (cancels soon)",
  expired: "Expired",
};

const GOAL_LABELS: Record<string, string> = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  muscle: "Build muscle",
  healthy: "Eat healthy",
};

/** Renders an icon from the shared SVG registry by its SVG_ICONS key. */
function SvgIcon({ name, ...props }: { name: string; [k: string]: any }) {
  const Icon = SVG_ICON_COMPONENT_MAP[name];
  return Icon ? <Icon {...props} /> : null;
}

type RowProps = {
  icon: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
};

function SettingsRow({ icon, label, subtitle, value, onPress }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <SvgIcon name={icon} color={TEXT_DARK} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={styles.rowValue}>{value}</Text>}
      <SvgIcon name={SVG_ICONS.CHEVRON_RIGHT_ICON} color={TEXT_DARK} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [goalLabel, setGoalLabel] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  const { user, session } = useSelector((state: RootState) => state.auth);
  const streak = useSelector((state: RootState) => state.meals.streak);
  const dispatch = useDispatch();
  const { status: subStatus, expiresAt, isSubscribed } = useSubscription();

  useFocusEffect(
    useCallback(() => {
      if (!session?.access_token) return;
      profileService
        .getProfile(session)
        .then((p) => {
          if (p?.goal) setGoalLabel(GOAL_LABELS[p.goal] ?? p.goal);
          setProfileName(p?.name || null);
        })
        .catch(() => {});
    }, [session]),
  );

  const emailPrefix = user?.email ? user.email.split("@")[0] : "Chef";
  const displayName = profileName || emailPrefix;
  const initials = displayName
    .split(/[\s._-]/)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const subscriptionSubtitle =
    (SUBSCRIPTION_LABELS[subStatus] ?? "Not subscribed") +
    (isSubscribed && expiresAt
      ? ` · ${subStatus === "cancelled" ? "until " : "renews "}${new Date(expiresAt).toLocaleDateString()}`
      : "");

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      await authService.signOut();
      dispatch(setPersistedAccessToken(null));
      dispatch(setAuthSession(null));
      dispatch(setOnboardingStatus(false));
      dispatch(clearSubscription());
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account, all meals, recipes, and subscription data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: async () => {
            try {
              await subscriptionService.deleteAccount(session);
              await AsyncStorage.clear();
              dispatch(setPersistedAccessToken(null));
              dispatch(setAuthSession(null));
              dispatch(setOnboardingStatus(false));
              dispatch(clearSubscription());
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.message ?? "Account deletion failed. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: SCREEN_BG }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: title + streak pill ───────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.streakPill}>
            <Image
              source={fireImg}
              style={styles.streakFire}
              resizeMode="contain"
            />
            <Text style={styles.streakCount}>{Math.max(1, streak)}</Text>
          </View>
        </View>

        {/* ── Identity block (leaf sits behind, to the right) ───────── */}
        <View style={styles.identity}>
          <Image
            source={leafImg}
            style={styles.decorLeaf}
            resizeMode="contain"
          />

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.cameraBadge}>
              <SvgIcon name={SVG_ICONS.CAMERA_ICON} />
            </View>
          </View>

          <Text style={styles.profileName}>{displayName}</Text>

          {goalLabel && (
            <View style={styles.goalPill}>
              <SvgIcon
                name={SVG_ICONS.MAINTAIN_WEIGHT_ICON}
                color={TEXT_DARK}
              />
              <Text style={styles.goalPillText}>{goalLabel}</Text>
            </View>
          )}
        </View>

        {/* ── Account ───────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingsRow
            icon={SVG_ICONS.EDIT_PROFILE_ICON}
            label="Edit profile"
            onPress={() => navigation.navigate("EditProfile")}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={SVG_ICONS.SUBSCRIPTION_ICON}
            label="Manage subscription"
            subtitle={subscriptionSubtitle}
            onPress={() => navigation.navigate("ManageSubscription")}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={SVG_ICONS.LANGUAGE_ICON}
            label={t("profile.settings.language")}
            value={LANGUAGE_META[language].label}
            onPress={() => setLangPickerVisible(true)}
          />
        </View>

        {/* ── Support ───────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>SUPPORT</Text>
        <View style={styles.card}>
          <SettingsRow
            icon={SVG_ICONS.CONTACT_US_ICON}
            label="Contact us"
            onPress={() => navigation.navigate("ContactUs")}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={SVG_ICONS.PRIVACY_POLICY_ICON}
            label="Privacy policy"
            onPress={() => navigation.navigate("Legal", { type: "privacy" })}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={SVG_ICONS.TERMS_AND_CONDITION_ICON}
            label="Terms and conditions"
            onPress={() => navigation.navigate("Legal", { type: "terms" })}
          />
        </View>

        {/* ── Log out ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log Out</Text>
          <SvgIcon name={SVG_ICONS.LOGOUT_ICON} color={RED} />
        </TouchableOpacity>

        {/* ── Delete account (GDPR / store compliance) ──────────────── */}
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.7}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <LanguagePickerModal
        visible={langPickerVisible}
        onClose={() => setLangPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: ms(32) },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(20),
    paddingTop: ms(8),
  },
  title: {
    fontSize: ms(28),
    lineHeight: ms(34),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
    borderRadius: RADIUS.full,
    backgroundColor: "#FFFFFF",
  },
  streakFire: { width: ms(16), height: ms(16) },
  streakCount: {
    fontSize: ms(18),
    lineHeight: ms(26),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },

  identity: {
    alignItems: "center",
    marginTop: ms(8),
    marginBottom: ms(20),
  },
  decorLeaf: {
    position: "absolute",
    right: ms(-10),
    top: ms(4),
    width: ms(150),
    height: ms(120),
  },
  avatarWrap: { width: ms(64), height: ms(64) },
  avatar: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: ms(24),
    fontWeight: FONTS.bold,
    color: "#FFFFFF",
  },
  cameraBadge: {
    position: "absolute",
    right: ms(-2),
    bottom: ms(-2),
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: ms(2),
    borderColor: SCREEN_BG,
  },
  profileName: {
    fontSize: ms(20),
    lineHeight: ms(22),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
    marginTop: ms(10),
    marginBottom: ms(8),
  },
  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    paddingHorizontal: ms(20),
    paddingVertical: ms(8),
    borderRadius: RADIUS.full,
    backgroundColor: GREEN_LIGHT,
  },
  goalPillText: {
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },

  sectionHeading: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
    marginHorizontal: ms(20),
    marginBottom: ms(10),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: ms(20),
    marginHorizontal: ms(20),
    padding: ms(16),
    marginBottom: ms(24),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#EDE5DE",
    marginVertical: ms(4),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(12),
    gap: ms(12),
  },
  rowIcon: { width: ms(20), alignItems: "center" },
  rowTextWrap: { flex: 1 },
  rowLabel: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: TEXT_DARK,
  },
  rowSubtitle: {
    fontSize: ms(12),
    lineHeight: ms(18),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
  },
  rowValue: {
    fontSize: ms(14),
    lineHeight: ms(20),
    fontWeight: FONTS.bold,
    color: TEXT_MUTED,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(10),
    marginHorizontal: ms(20),
    paddingVertical: ms(14),
    borderRadius: RADIUS.full,
    backgroundColor: "#FFFFFF",
  },
  logoutText: {
    fontSize: ms(16),
    lineHeight: ms(22),
    fontWeight: FONTS.bold,
    color: RED,
  },
  deleteBtn: {
    alignItems: "center",
    paddingVertical: ms(14),
  },
  deleteText: {
    fontSize: ms(13),
    fontWeight: FONTS.medium,
    color: TEXT_MUTED,
  },
});
