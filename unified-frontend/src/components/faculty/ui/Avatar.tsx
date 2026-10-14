import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { getInitials } from '../../../utils/faculty/formatters';
import { avatarColors } from '../../../theme/faculty/colors';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZES: Record<AvatarSize, number> = {
  xs: 28, sm: 36, md: 44, lg: 64, xl: 96, '2xl': 128,
};
const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 11, sm: 13, md: 14, lg: 20, xl: 28, '2xl': 36,
};

function getAvatarBg(name = ''): string {
  if (!name) return avatarColors[0];
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
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
  const containerStyle: StyleProp<ViewStyle> = [styles.base, { width: dim, height: dim, borderRadius: dim / 2 }, style];

  if (src) {
    // Create image-specific style without ViewStyle-only properties
    const imageStyle: StyleProp<ImageStyle> = [
      {
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        borderWidth: 2,
        borderColor: '#ffffff'
      },
      styles.image
    ];
    return <Image source={{ uri: src }} style={imageStyle} accessibilityLabel={name} />;
  }
  return (
    <View style={[containerStyle, { backgroundColor: getAvatarBg(name) }]}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff', overflow: 'hidden' } as ViewStyle,
  image: { resizeMode: 'cover' } as ImageStyle,
  initials: { color: '#ffffff', fontWeight: '600' },
});
