import React, { useEffect, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONT_SIZES, RADIUS } from '../constants/theme';
import { moderateScale as ms } from '../utils/responsive';

export type CommonModalVariant = 'info' | 'success' | 'warning' | 'error';

export type CommonModalProps = {
  visible: boolean;
  title: string;
  message: string;
  variant?: CommonModalVariant;
  // Primary action button
  primaryText?: string;
  onPrimary?: () => void;
  // Optional secondary/cancel button
  secondaryText?: string;
  onSecondary?: () => void;
  // Legacy compat — maps to onPrimary
  onClose?: () => void;
};

const CommonAlertModal: React.FC<CommonModalProps> = ({
  visible,
  title,
  message,
  variant = 'info',
  primaryText,
  onPrimary,
  secondaryText,
  onSecondary,
  onClose,
}) => {
  const { colors } = useTheme();
  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  const handlePrimary = onPrimary ?? onClose ?? (() => {});
  const handleSecondary = onSecondary ?? onClose ?? (() => {});

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => scaleValue.setValue(0.9));
    }
  }, [visible]);

  const getVariant = () => {
    switch (variant) {
      case 'error':   return { icon: 'close-circle',        color: '#EF4444' };
      case 'warning': return { icon: 'warning',             color: '#F59E0B' };
      case 'success': return { icon: 'checkmark-circle',    color: '#22C55E' };
      default:        return { icon: 'information-circle',  color: colors.text };
    }
  };

  const { icon, color } = getVariant();

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleSecondary}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: opacityValue }]} />
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surface, opacity: opacityValue, transform: [{ scale: scaleValue }] },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon as any} size={ms(34)} color={color} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

          <View style={styles.buttons}>
            {secondaryText && (
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]}
                onPress={handleSecondary}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>{secondaryText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnPrimary,
                { backgroundColor: color },
                secondaryText ? styles.btnFlex : styles.btnFull,
              ]}
              onPress={handlePrimary}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>{primaryText ?? 'Got it'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '85%',
    maxWidth: ms(340),
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    padding: ms(28),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: ms(68),
    height: ms(68),
    borderRadius: ms(34),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(18),
  },
  title: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '800',
    marginBottom: ms(10),
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  message: {
    fontSize: FONT_SIZES.label,
    marginBottom: ms(28),
    textAlign: 'center',
    lineHeight: ms(21),
  },
  buttons: {
    width: '100%',
    flexDirection: 'row',
    gap: ms(10),
  },
  btn: {
    paddingVertical: ms(14),
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFull: { flex: 1 },
  btnFlex: { flex: 1 },
  btnPrimary: {},
  btnSecondary: {
    borderWidth: 1,
    flex: 1,
  },
  btnText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.body,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});

export default CommonAlertModal;
