/**
 * Shared smooth bottom-sheet "Save to category" modal.
 * Used by DashboardScreen, SavedMealsScreen, and ExploreScreen.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, FONTS } from '../constants/theme';

const SAVE_CATEGORIES = [
  { id: 'Breakfast', label: 'Breakfast', icon: 'sunny-outline'        },
  { id: 'Lunch',     label: 'Lunch',     icon: 'partly-sunny-outline' },
  { id: 'Dinner',    label: 'Dinner',    icon: 'moon-outline'         },
  { id: 'Snack',     label: 'Snack',     icon: 'cafe-outline'         },
];

export default function SaveModal({ meal, visible, onClose, onSave, onRemove, savedCategory, colors, title }) {
  const [showing,         setShowing]         = useState(false);
  const [displayCategory, setDisplayCategory] = useState(null);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible && meal) {
      setDisplayCategory(savedCategory);
      setShowing(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(400);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (!visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 400, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          setShowing(false);
          setDisplayCategory(null);
        }
      });
    }
  }, [visible]);

  if (!showing) return null;

  const alreadySaved = !!displayCategory;

  return (
    <Modal transparent animationType="none" visible={showing} onRequestClose={onClose}>
      <Animated.View style={[sav.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[sav.sheet, { backgroundColor: colors.surface, transform: [{ translateY: sheetTranslateY }] }]}
      >
        <View style={[sav.handle, { backgroundColor: colors.border }]} />
        <Text style={[sav.sheetTitle, { color: colors.textMuted }]}>
          {title ?? (alreadySaved ? 'Saved' : 'Save to…')}
        </Text>

        {SAVE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[sav.categoryRow, displayCategory === cat.id && { backgroundColor: colors.surfaceAlt }]}
            activeOpacity={0.7}
            onPress={() => onSave(cat.id)}
          >
            <Ionicons name={cat.icon} size={20} color={colors.textSecondary} />
            <Text style={[sav.categoryLabel, { color: colors.text }]}>{cat.label}</Text>
            {displayCategory === cat.id && (
              <Ionicons name="checkmark" size={17} color={colors.text} />
            )}
          </TouchableOpacity>
        ))}

        {alreadySaved && (
          <>
            <View style={[sav.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={sav.categoryRow} activeOpacity={0.7} onPress={onRemove}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[sav.categoryLabel, { color: colors.error }]}>Remove from Saved</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const sav = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 44,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: FONTS.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    marginHorizontal: 12,
  },
});
