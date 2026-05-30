import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';
import { SPACING, RADIUS, FONTS } from '../constants/theme';
import { useSubscription } from '../hooks/useSubscription';
import { subscriptionService } from '../services/subscription.service';
import CommonAlertModal, { CommonModalVariant } from '../components/CommonModal';

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

const STATUS_LABELS: Record<string, string> = {
  free:      'Not Subscribed',
  trial:     'Free Trial',
  active:    'Premium',
  cancelled: 'Premium (Cancels Soon)',
  expired:   'Expired',
};

const STATUS_COLORS = (colors: Colors): Record<string, string> => ({
  free:      colors.textMuted,
  trial:     '#F59E0B',
  active:    colors.primary,
  cancelled: '#F59E0B',
  expired:   colors.error,
});

export default function ManageSubscriptionScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const statusColors = STATUS_COLORS(colors);

  const { isSubscribed, status, expiresAt, trialEndsAt, plan, sync } = useSubscription();
  const [restoring, setRestoring] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    visible: false, title: '', message: '', variant: 'info',
  });

  // Re-sync on focus so a freshly-landed purchase webhook or an App Store
  // cancellation is reflected the moment the user returns to this screen.
  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync])
  );

  const handleCancel = () => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';

    setAlert({
      visible: true,
      variant: 'warning',
      title: 'Cancel Subscription',
      message: Platform.OS === 'ios'
        ? "You'll be taken to App Store subscription settings to cancel."
        : "You'll be taken to Google Play to cancel.",
      secondaryText: 'Not Now',
      primaryText: 'Continue',
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
        variant: 'success',
        title: 'Purchases Restored',
        message: 'Your subscription has been restored.',
      });
    } catch (err: any) {
      setAlert({
        visible: true,
        variant: 'error',
        title: 'Restore Failed',
        message: err.message ?? 'Please try again.',
      });
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const validUntil =
    status === 'trial' ? trialEndsAt : expiresAt;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Plan card */}
        <View style={[styles.planCard, { backgroundColor: colors.surface }]}>
          <View style={styles.planCardTop}>
            <Ionicons
              name="diamond-outline"
              size={28}
              color={statusColors[status] ?? colors.textMuted}
            />
            <View style={styles.planCardInfo}>
              <Text style={[styles.planLabel, { color: colors.text }]}>
                {STATUS_LABELS[status] ?? 'Not Subscribed'}
              </Text>
              {plan && (
                <Text style={[styles.planSub, { color: colors.textMuted }]}>
                  {plan === 'weekly' ? 'Weekly plan' : plan === 'monthly' ? 'Monthly plan' : 'Yearly plan'}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColors[status] ?? colors.textMuted}20` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColors[status] ?? colors.textMuted }]}>
                {status === 'active' ? 'Active' :
                 status === 'trial' ? 'Trial' :
                 status === 'cancelled' ? 'Cancelling' :
                 status === 'expired' ? 'Expired' : 'Inactive'}
              </Text>
            </View>
          </View>

          {validUntil && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.dateRow}>
                <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                  {status === 'trial'
                    ? 'Trial ends'
                    : status === 'cancelled'
                    ? 'Access until'
                    : 'Renews'}
                </Text>
                <Text style={[styles.dateValue, { color: colors.text }]}>
                  {formatDate(validUntil)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Non-subscribed — upgrade prompt */}
        {!isSubscribed && status !== 'cancelled' && (
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.85}
          >
            <Text style={[styles.upgradeBtnText, { color: colors.btnPrimaryText }]}>
              Upgrade to Premium
            </Text>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={[styles.actionsCard, { backgroundColor: colors.surface }]}>

          {/* Manage / cancel — only for active/trial subscribers */}
          {(status === 'active' || status === 'trial') && (
            <>
              <TouchableOpacity style={styles.actionRow} onPress={handleCancel} activeOpacity={0.7}>
                <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                <Text style={[styles.actionLabel, { color: colors.error }]}>Cancel Subscription</Text>
                <Ionicons name="open-outline" size={14} color={colors.error} />
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleRestore}
            disabled={restoring}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>Restore Purchases</Text>
            {restoring
              ? <ActivityIndicator size="small" color={colors.textMuted} />
              : <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>

        {/* Info note */}
        <Text style={[styles.infoNote, { color: colors.textMuted }]}>
          {Platform.OS === 'ios'
            ? 'Subscriptions are managed through your Apple ID. Cancellation takes effect at the end of the current billing period.'
            : 'Subscriptions are managed through Google Play. Cancellation takes effect at the end of the current billing period.'}
        </Text>

      </ScrollView>

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
    safe: { flex: 1 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: FONTS.semibold,
    },

    content: {
      padding: 24,
      gap: 16,
    },

    planCard: {
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
    },
    planCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      gap: 14,
    },
    planCardInfo: { flex: 1, gap: 2 },
    planLabel: {
      fontSize: 17,
      fontWeight: FONTS.bold,
    },
    planSub: {
      fontSize: 13,
      fontWeight: FONTS.regular,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: FONTS.semibold,
    },

    divider: { height: 1 },

    dateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
    },
    dateLabel: {
      fontSize: 14,
      fontWeight: FONTS.regular,
    },
    dateValue: {
      fontSize: 14,
      fontWeight: FONTS.semibold,
    },

    upgradeBtn: {
      paddingVertical: 16,
      borderRadius: RADIUS.full,
      alignItems: 'center',
    },
    upgradeBtnText: {
      fontSize: 16,
      fontWeight: FONTS.bold,
      letterSpacing: 0.2,
    },

    actionsCard: {
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: 15,
      gap: 14,
    },
    actionLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: FONTS.medium,
    },

    infoNote: {
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
  });
}
