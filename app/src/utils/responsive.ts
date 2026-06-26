import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Phone baseline (iPhone 11/12/13). Portrait.
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/** Scale a size proportional to screen WIDTH (use for horizontal spacing, widths). */
export const horizontalScale = (size: number) =>
  (width / GUIDELINE_BASE_WIDTH) * size;

/** Scale a size proportional to screen HEIGHT (use for vertical spacing, heights). */
export const verticalScale = (size: number) =>
  (height / GUIDELINE_BASE_HEIGHT) * size;

/**
 * Dampened width-scale — preferred for fonts, radius, padding.
 * factor 0.5 = grow/shrink at half the raw rate so big phones don't get huge text.
 */
export const moderateScale = (size: number, factor = 0.5) =>
  size + (horizontalScale(size) - size) * factor;

export const moderateVerticalScale = (size: number, factor = 0.5) =>
  size + (verticalScale(size) - size) * factor;

// Short aliases (common RN convention)
export const hs = horizontalScale;
export const vs = verticalScale;
export const ms = moderateScale;
export const mvs = moderateVerticalScale;

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
