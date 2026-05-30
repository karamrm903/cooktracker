import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGE_META } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthSession, setPersistedAccessToken, setOnboardingStatus } from '../store/slices/authSlice';
import { clearSubscription } from '../store/slices/subscriptionSlice';
import { authService } from '../services/auth.service';
import { profileService } from '../services/profile.service';
import { subscriptionService } from '../services/subscription.service';
import { useSubscription } from '../hooks/useSubscription';
import { RootState } from '../store';
import LanguagePickerModal from '../components/LanguagePickerModal';

const SUBSCRIPTION_LABELS: Record<string, string> = {
  free: 'Not Subscribed',
  trial: 'Free Trial Active',
  active: 'Premium',
  cancelled: 'Premium (Cancels Soon)',
  expired: 'Expired',
};

// const GROUPS = ['Account', 'Preferences', 'More'] as const;  // removed — all settings rows were stubs with no onPress

const GOAL_LABELS: Record<string, string> = {
  lose:     'Lose Weight',
  maintain: 'Maintain Weight',
  muscle:   'Build Muscle',
  healthy:  'Eat Healthy',
};

export default function ProfileScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [goalLabel,   setGoalLabel]   = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  // removed — placeholder state, not persisted to DB
  // const [mealVisibility, setMealVisibility] = useState(USER.mealVisibility ?? 'friends');
  // const [shareMealNames, setShareMealNames] = useState(USER.shareMealNames ?? true);
  // const [shareCalories, setShareCalories] = useState(USER.shareCalories ?? true);
  // const [shareMacros, setShareMacros] = useState(USER.shareMacros ?? true);

  const { user, session } = useSelector((state: RootState) => state.auth);
  const streak = useSelector((state: RootState) => state.meals.streak);
  const dispatch = useDispatch();
  const { isSubscribed, status: subStatus, expiresAt } = useSubscription();

  useFocusEffect(
    useCallback(() => {
      if (!session?.access_token) return;
      profileService.getProfile(session)
        .then(p => {
          if (p?.goal) setGoalLabel(GOAL_LABELS[p.goal] ?? p.goal);
          setProfileName(p?.name || null);
        })
        .catch(() => {});
    }, [session])
  );

  const emailPrefix = user?.email ? user.email.split('@')[0] : 'Chef';
  const displayName = profileName || emailPrefix;
  // const displayName = user?.email ? user.email.split('@')[0] : USER.name;  // old — no name priority
  const initials = displayName
    .split(/[\s._-]/)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      await authService.signOut();
      dispatch(setPersistedAccessToken(null));
      dispatch(setAuthSession(null));
      dispatch(setOnboardingStatus(false));
      dispatch(clearSubscription());
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account, all meals, recipes, and subscription data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionService.deleteAccount(session);
              await AsyncStorage.clear();
              dispatch(setPersistedAccessToken(null));
              dispatch(setAuthSession(null));
              dispatch(setOnboardingStatus(false));
              dispatch(clearSubscription());
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Account deletion failed. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>

        {/* ── Profile card ──────────────────────────────────────────── */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.avatarInitials, { color: colors.text }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {displayName}
          </Text>
          {/* removed — USER.username was placeholder @alexrivera, not stored in DB */}
          {/* <Text style={[styles.profileUsername, { color: colors.textMuted }]}>{USER.username}</Text> */}
          {goalLabel && (
            <View style={[styles.goalPill, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.goalPillText, { color: colors.textSecondary }]}>
                {goalLabel}
              </Text>
            </View>
          )}
          {/* old goal pill — was showing USER.goal placeholder */}
          {/* <View style={[styles.goalPill, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.goalPillText, { color: colors.textSecondary }]}>{USER.goal}</Text>
          </View> */}
        </View>

        {/* ── Streak stat ───────────────────────────────────────────── */}
        <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Ionicons name="flame" size={20} color="#FF6B35" />
              <Text style={[styles.statBig, { color: colors.text, marginBottom: 0 }]}>
                {Math.max(1, streak)}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Day Streak
            </Text>
          </View>
          {/* removed — USER.totalMealsLogged (312) and USER.goalsMetThisMonth (18) were hardcoded placeholders */}
          {/* <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statBig, { color: colors.text }]}>{USER.totalMealsLogged}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Meals Logged</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statBig, { color: colors.text }]}>{USER.goalsMetThisMonth}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Goals Met</Text>
          </View> */}
        </View>

        {/* removed — Meal Privacy section had no DB persistence (no column in users table) */}
        {/* <View style={[styles.privacySection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.privacyTitle, { color: colors.text }]}>Meal Privacy</Text>
          <Text style={[styles.privacyLabel, { color: colors.textMuted }]}>Who can see my meals</Text>
          <View style={styles.privacyOptionsRow}>
            {['private','friends','public'].map(v => (
              <TouchableOpacity key={v} style={[styles.privacyChip,{backgroundColor:colors.surfaceAlt},mealVisibility===v&&{backgroundColor:colors.text}]} onPress={()=>setMealVisibility(v)}>
                <Text style={[styles.privacyChipText,{color:colors.text},mealVisibility===v&&styles.privacyChipTextActive]}>{v.charAt(0).toUpperCase()+v.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.toggleRow,{borderTopColor:colors.border}]}>
            <Text style={[styles.toggleLabel,{color:colors.text}]}>Share meal names</Text>
            <TouchableOpacity onPress={()=>setShareMealNames(!shareMealNames)}><Text style={[styles.toggleValue,{color:colors.text}]}>{shareMealNames?'On':'Off'}</Text></TouchableOpacity>
          </View>
          <View style={[styles.toggleRow,{borderTopColor:colors.border}]}>
            <Text style={[styles.toggleLabel,{color:colors.text}]}>Share calories</Text>
            <TouchableOpacity onPress={()=>setShareCalories(!shareCalories)}><Text style={[styles.toggleValue,{color:colors.text}]}>{shareCalories?'On':'Off'}</Text></TouchableOpacity>
          </View>
          <View style={[styles.toggleRow,{borderTopColor:colors.border}]}>
            <Text style={[styles.toggleLabel,{color:colors.text}]}>Share macros</Text>
            <TouchableOpacity onPress={()=>setShareMacros(!shareMacros)}><Text style={[styles.toggleValue,{color:colors.text}]}>{shareMacros?'On':'Off'}</Text></TouchableOpacity>
          </View>
        </View> */}

        {/* ── Account ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Account</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.7}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* removed — these settings rows had no onPress handlers (stubs):
          Edit Profile, Dietary Preferences, Health Goals (Account group)
          Notifications, Units & Measurements, Privacy & Security (Preferences group)
          Help & Support, Rate the App (More group)
        */}
        {/* {GROUPS.map((group) => {
          const items = PROFILE_SETTINGS.filter((s) => s.group === group);
          return (
            <View key={group} style={styles.settingsGroup}>
              <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{group}</Text>
              <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
                {items.map((item, index) => {
                  const isDanger = !!item.danger;
                  return (
                    <React.Fragment key={item.id}>
                      {index > 0 && <View style={[styles.rowHairline, { backgroundColor: colors.border }]} />}
                      <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}
                        onPress={item.id === 'language' ? () => setLangPickerVisible(true) : undefined}>
                        <Ionicons name={item.icon} size={18} color={isDanger ? colors.error : colors.textMuted} />
                        <Text style={[styles.settingsLabel, { color: isDanger ? colors.error : colors.text }]}>
                          {item.id === 'language' ? t('profile.settings.language') : item.label}
                        </Text>
                        {!isDanger && (
                          <>
                            {item.id === 'language' && (
                              <Text style={[styles.settingsBadge, { color: colors.textMuted }]}>
                                {LANGUAGE_META[language].flag} {language.toUpperCase()}
                              </Text>
                            )}
                            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                          </>
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          );
        })} */}

        {/* ── Subscription ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Subscription</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Manage Subscription — always navigates to the manage screen,
                regardless of whether a subscription is active. */}
            <TouchableOpacity
              style={[styles.row, { gap: 14 }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ManageSubscription' as any)}
            >
              <Ionicons name="diamond-outline" size={18} color={isSubscribed ? colors.primary : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  Manage Subscription
                </Text>
                <Text style={[{ fontSize: 12, color: colors.textMuted, marginTop: 1 }]}>
                  {SUBSCRIPTION_LABELS[subStatus] ?? 'Not Subscribed'}
                  {isSubscribed && expiresAt
                    ? ` · ${subStatus === 'cancelled' ? 'until ' : 'renews '}${new Date(expiresAt).toLocaleDateString()}`
                    : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Preferences ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Preferences</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.row} onPress={() => setLangPickerVisible(true)} activeOpacity={0.7}>
              <Ionicons name="language-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t('profile.settings.language')}</Text>
              <Text style={[styles.rowBadge, { color: colors.textMuted }]}>
                {language.toUpperCase()}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sign out ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Text style={[styles.signOutText, { color: colors.error }]}>Log Out</Text>
        </TouchableOpacity>

        {/* ── Delete account (GDPR) ────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: 'transparent', borderColor: 'transparent', marginTop: -8 }]}
          activeOpacity={0.7}
          onPress={handleDeleteAccount}
        >
          <Text style={[styles.signOutText, { color: colors.textDisabled, fontSize: 13 }]}>Delete Account</Text>
        </TouchableOpacity>

        {/* ── Version ───────────────────────────────────────────────── */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          Nutrily v1.0.0
        </Text>
      </ScrollView>

      <LanguagePickerModal
        visible={langPickerVisible}
        onClose={() => setLangPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingBottom: SPACING.xxl },

  header: {
    paddingHorizontal: 24,
    paddingTop: SPACING.lg,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: FONTS.bold,
    letterSpacing: -0.5,
  },

  profileSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: FONTS.bold,
  },
  profileName: {
    fontSize: 20,
    fontWeight: FONTS.bold,
    marginTop: 14,
    marginBottom: 8,
  },
  // profileUsername: { fontSize: 13, fontWeight: FONTS.regular, marginTop: 3 },  // removed — placeholder
  goalPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  goalPillText: {
    fontSize: 12,
    fontWeight: FONTS.medium,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statBig: {
    fontSize: 22,
    fontWeight: FONTS.bold,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: FONTS.regular,
    textAlign: 'center',
  },
  // statDivider: { width: 1, height: 32 },  // removed — only streak stat kept

  section: { marginBottom: 32 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  card: {
    borderRadius: RADIUS.lg,
    marginHorizontal: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 15,
    gap: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: FONTS.medium,
  },
  rowBadge: {
    fontSize: 13,
    fontWeight: FONTS.medium,
    marginRight: 4,
  },

  // removed — settings groups (stubs with no handlers)
  // settingsContainer: { gap: 0 },
  // settingsGroup: { marginBottom: 32 },
  // groupLabel: { fontSize: 11, fontWeight: FONTS.semibold, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 24, marginBottom: 8 },
  // groupCard: { borderRadius: RADIUS.lg, marginHorizontal: 24, overflow: 'hidden' },
  // settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 15, gap: 14 },
  // settingsLabel: { flex: 1, fontSize: 15, fontWeight: FONTS.medium },
  // settingsBadge: { fontSize: 13, fontWeight: FONTS.medium, marginRight: 4 },
  // rowHairline: { height: StyleSheet.hairlineWidth, marginLeft: 0 },

  // removed — meal privacy section (UI only, no DB persistence)
  // privacySection: { marginHorizontal: 24, marginBottom: 28, borderRadius: RADIUS.lg, padding: 16 },
  // privacyTitle: { fontSize: 18, fontWeight: FONTS.bold, marginBottom: 14 },
  // privacyLabel: { fontSize: 13, fontWeight: FONTS.medium, marginBottom: 10 },
  // privacyOptionsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  // privacyChip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  // privacyChipActive: {},
  // privacyChipText: { fontSize: 14, fontWeight: FONTS.medium },
  // privacyChipTextActive: { color: '#FFFFFF' },
  // toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  // toggleLabel: { fontSize: 15, fontWeight: FONTS.medium },
  // toggleValue: { fontSize: 14, fontWeight: FONTS.bold },

  signOutBtn: {
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: FONTS.semibold,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: FONTS.regular,
    marginTop: SPACING.xs,
  },
});
