import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

type RootStackParamList = {
  SocialProof: undefined;
  Subscription: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SocialProof'>;
};

// Avatar colors are brand/persona colors — kept the same in both modes
const AVATARS = [
  { initials: 'AM', color: '#FFE0B2', textColor: '#E65100' },
  { initials: 'SL', color: '#E3F2FD', textColor: '#1565C0' },
  { initials: 'JR', color: '#F3E5F5', textColor: '#6A1B9A' },
];

export default function SocialProofScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* Back */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Rating badge */}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingStars}>⭐</Text>
          <Text style={styles.ratingNumber}>4.8</Text>
          <View style={styles.ratingDivider} />
          <Text style={styles.ratingCount}>{t('socialProof.ratingCount')}</Text>
        </View>

        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('socialProof.title')}</Text>
          <Text style={styles.subtitle}>{t('socialProof.subtitle')}</Text>
        </View>

        {/* Avatars */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRow}>
            {AVATARS.map((a, i) => (
              <View key={i} style={[styles.avatar, { backgroundColor: a.color }]}>
                <Text style={[styles.avatarText, { color: a.textColor }]}>{a.initials}</Text>
              </View>
            ))}
          </View>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map((i) => (
              <Text key={i} style={styles.starIcon}>⭐</Text>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{t('socialProof.ratingLabel')}</Text>
        </View>

        {/* Review card */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={[styles.reviewAvatar, { backgroundColor: '#FFE0B2' }]}>
              <Text style={[styles.reviewAvatarText, { color: '#E65100' }]}>AM</Text>
            </View>
            <View style={styles.reviewMeta}>
              <Text style={styles.reviewName}>{t('socialProof.reviewerName')}</Text>
              <View style={styles.reviewStars}>
                {[1,2,3,4,5].map((i) => (
                  <Text key={i} style={styles.reviewStar}>⭐</Text>
                ))}
              </View>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>{t('socialProof.verified')}</Text>
            </View>
          </View>
          <Text style={styles.reviewText}>{t('socialProof.reviewText')}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>500K+</Text>
            <Text style={styles.statLabel}>{t('socialProof.statUsers')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2M+</Text>
            <Text style={styles.statLabel}>{t('socialProof.statRecipes')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>#1</Text>
            <Text style={styles.statLabel}>{t('socialProof.statFoodTracker')}</Text>
          </View>
        </View>

      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('Subscription')}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>{t('socialProof.continue')}</Text>
        </TouchableOpacity>
      </View>

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
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    backArrow: { fontSize: 17, color: colors.text, lineHeight: 21 },

    scroll: { paddingHorizontal: 24, paddingBottom: 16, gap: 24 },

    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      marginTop: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    ratingStars: { fontSize: 16 },
    ratingNumber: { fontSize: 16, fontWeight: '800', color: colors.text },
    ratingDivider: { width: 1, height: 16, backgroundColor: colors.border },
    ratingCount: { fontSize: 13, fontWeight: '500', color: colors.textMuted },

    header: { gap: 8 },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 38,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 24,
      fontWeight: '400',
    },

    avatarSection: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    avatarRow: { flexDirection: 'row', gap: -10 },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
      marginLeft: -10,
    },
    avatarText: { fontSize: 16, fontWeight: '700' },
    starsRow: { flexDirection: 'row', gap: 2 },
    starIcon: { fontSize: 16 },
    ratingLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    reviewAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewAvatarText: { fontSize: 14, fontWeight: '700' },
    reviewMeta: { flex: 1, gap: 3 },
    reviewName: { fontSize: 15, fontWeight: '700', color: colors.text },
    reviewStars: { flexDirection: 'row', gap: 1 },
    reviewStar: { fontSize: 12 },
    verifiedBadge: {
      backgroundColor: colors.rolloverGreenBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    verifiedText: { fontSize: 11, fontWeight: '600', color: colors.rolloverGreenText },
    reviewText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      fontStyle: 'italic',
    },

    statsRow: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500', textAlign: 'center' },
    statDivider: { width: 1, height: 36, backgroundColor: colors.border },

    bottomBar: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
    continueBtn: {
      backgroundColor: colors.btnPrimary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    continueBtnText: { fontSize: 17, fontWeight: '700', color: colors.btnPrimaryText, letterSpacing: 0.2 },
  });
}
