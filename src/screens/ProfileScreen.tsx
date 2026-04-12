import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { USER, PROFILE_SETTINGS } from '../data/placeholder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthSession, setPersistedAccessToken } from '../store/slices/authSlice';
import { authService } from '../services/auth.service';
import { RootState } from '../store';

const GROUPS = ['Account', 'Preferences', 'More'] as const;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [mealVisibility, setMealVisibility] = useState(USER.mealVisibility ?? 'friends');
  const [shareMealNames, setShareMealNames] = useState(USER.shareMealNames ?? true);
  const [shareCalories, setShareCalories] = useState(USER.shareCalories ?? true);
  const [shareMacros, setShareMacros] = useState(USER.shareMacros ?? true);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const displayName = user?.email ? user.email.split('@')[0] : USER.name;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('').toUpperCase();

  const handleLogout = async () => {
    try {
      // Requirement 1: Clear user storage (except onboarding)
      const onboardingFlag = await AsyncStorage.getItem('hasCompletedOnboarding');
      await AsyncStorage.clear();
      if (onboardingFlag) {
        await AsyncStorage.setItem('hasCompletedOnboarding', onboardingFlag);
      }

      // Requirement 2: Sign out from Supabase & clear Redux
      await authService.signOut();
      dispatch(setPersistedAccessToken(null));
      dispatch(setAuthSession(null));
    } catch (err) {
      console.error("Logout error", err);
    }
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
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>

        {/* ── Profile section ─────────────────────────────────────────── */}
        <View style={styles.profileSection}>
          <View
            style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}
          >
            <Text style={[styles.avatarInitials, { color: colors.text }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {displayName}
          </Text>
          <Text style={[styles.profileUsername, { color: colors.textMuted }]}>
            {USER.username}
          </Text>
          <View
            style={[styles.goalPill, { backgroundColor: colors.surfaceAlt }]}
          >
            <Text style={[styles.goalPillText, { color: colors.textSecondary }]}>
              {USER.goal}
            </Text>
          </View>
        </View>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <View
          style={[
            styles.statsRow,
            {
              borderTopColor: colors.border,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statBig, { color: colors.text }]}>
              {USER.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Day Streak
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statBig, { color: colors.text }]}>
              {USER.totalMealsLogged}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Meals Logged
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statBig, { color: colors.text }]}>
              {USER.goalsMetThisMonth}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Goals Met
            </Text>
          </View>
        </View>
        {/* ── Meal Privacy ────────────────────────────────────────────── */}
        <View style={[styles.privacySection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.privacyTitle, { color: colors.text }]}>
            Meal Privacy
          </Text>

          <Text style={[styles.privacyLabel, { color: colors.textMuted }]}>
            Who can see my meals
          </Text>

          <View style={styles.privacyOptionsRow}>
            <TouchableOpacity
              style={[
                styles.privacyChip,
                { backgroundColor: colors.surfaceAlt },
                mealVisibility === 'private' && [styles.privacyChipActive, { backgroundColor: colors.text }],
              ]}
              onPress={() => setMealVisibility('private')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.privacyChipText,
                  { color: colors.text },
                  mealVisibility === 'private' && styles.privacyChipTextActive,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyChip,
                { backgroundColor: colors.surfaceAlt },
                mealVisibility === 'friends' && [styles.privacyChipActive, { backgroundColor: colors.text }],
              ]}
              onPress={() => setMealVisibility('friends')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.privacyChipText,
                  { color: colors.text },
                  mealVisibility === 'friends' && styles.privacyChipTextActive,
                ]}
              >
                Friends
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyChip,
                { backgroundColor: colors.surfaceAlt },
                mealVisibility === 'public' && [styles.privacyChipActive, { backgroundColor: colors.text }],
              ]}
              onPress={() => setMealVisibility('public')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.privacyChipText,
                  { color: colors.text },
                  mealVisibility === 'public' && styles.privacyChipTextActive,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Share meal names</Text>
            <TouchableOpacity onPress={() => setShareMealNames(!shareMealNames)} activeOpacity={0.8}>
              <Text style={[styles.toggleValue, { color: colors.text }]}>
                {shareMealNames ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Share calories</Text>
            <TouchableOpacity onPress={() => setShareCalories(!shareCalories)} activeOpacity={0.8}>
              <Text style={[styles.toggleValue, { color: colors.text }]}>
                {shareCalories ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Share macros</Text>
            <TouchableOpacity onPress={() => setShareMacros(!shareMacros)} activeOpacity={0.8}>
              <Text style={[styles.toggleValue, { color: colors.text }]}>
                {shareMacros ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* ── Settings groups ─────────────────────────────────────────── */}
        <View style={styles.settingsContainer}>
          {GROUPS.map((group) => {
            const items = PROFILE_SETTINGS.filter((s) => s.group === group);
            return (
              <View key={group} style={styles.settingsGroup}>
                <Text
                  style={[styles.groupLabel, { color: colors.textMuted }]}
                >
                  {group}
                </Text>
                <View
                  style={[
                    styles.groupCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  {items.map((item, index) => {
                    const isDanger = !!item.danger;
                    return (
                      <React.Fragment key={item.id}>
                        {index > 0 && (
                          <View
                            style={[
                              styles.rowHairline,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        )}
                        <TouchableOpacity
                          style={styles.settingsRow}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={item.icon}
                            size={18}
                            color={
                              isDanger ? colors.error : colors.textMuted
                            }
                          />
                          <Text
                            style={[
                              styles.settingsLabel,
                              {
                                color: isDanger
                                  ? colors.error
                                  : colors.text,
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                          {!isDanger && (
                            <Ionicons
                              name="chevron-forward"
                              size={14}
                              color={colors.textMuted}
                            />
                          )}
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Sign Out ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Text style={[styles.signOutText, { color: colors.error }]}>Log Out</Text>
        </TouchableOpacity>

        {/* ── Version ─────────────────────────────────────────────────── */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          CookTrack v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: SPACING.xxl,
  },

  // ── Header ────────────────────────────────────────────────────────
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

  // ── Profile section ───────────────────────────────────────────────
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
  },
  profileUsername: {
    fontSize: 13,
    fontWeight: FONTS.regular,
    marginTop: 3,
  },
  goalPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginTop: 8,
  },
  goalPillText: {
    fontSize: 12,
    fontWeight: FONTS.medium,
  },

  // ── Stats row ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 28,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statBig: {
    fontSize: 24,
    fontWeight: FONTS.bold,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: FONTS.regular,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
  },

  // ── Settings groups ───────────────────────────────────────────────
  settingsContainer: {
    gap: 0,
  },
  settingsGroup: {
    marginBottom: 32,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  groupCard: {
    borderRadius: RADIUS.lg,
    marginHorizontal: 24,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 15,
    gap: 14,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: FONTS.medium,
  },
  rowHairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 0,
  },

  // ── Version ───────────────────────────────────────────────────────
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
  // ── Meal Privacy ──────────────────────────────────────────────────
  privacySection: {
    marginHorizontal: 24,
    marginBottom: 28,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: FONTS.bold,
    marginBottom: 14,
  },
  privacyLabel: {
    fontSize: 13,
    fontWeight: FONTS.medium,
    marginBottom: 10,
  },
  privacyOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  privacyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  privacyChipActive: {},
  privacyChipText: {
    fontSize: 14,
    fontWeight: FONTS.medium,
  },
  privacyChipTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: FONTS.medium,
  },
  toggleValue: {
    fontSize: 14,
    fontWeight: FONTS.bold,
  },
});
