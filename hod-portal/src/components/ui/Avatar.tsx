import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { getInitials } from '../../utils/formatters';
import { avatarColors } from '../../theme/colors';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Sizes in pixels — mirrors the Tailwind w-/h- classes from the web version.
 */
const SIZES: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 64,
  xl: 96,
  '2xl': 128,
};

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 36,
};

/**
 * Pick a consistent background color from the palette based on the name string.
 */
function getAvatarBg(name = ''): string {
  if (!name) return avatarColors[0];
  const idx = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[idx];
}

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

export default function Avatar({ src, name = '', size = 'md', style }: AvatarProps) {
  const dim = SIZES[size] ?? SIZES.md;
  const fontSize = FONT_SIZES[size] ?? FONT_SIZES.md;

  const containerStyle = [
    styles.base,
    { width: dim, height: dim, borderRadius: dim / 2 },
    style,
  ];

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[containerStyle, styles.image]}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View style={[containerStyle, { backgroundColor: getAvatarBg(name) }]}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    // subtle ring effect using border
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
