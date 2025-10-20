/**
 * Composant Badge pour afficher les statuts
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  style,
}) => {
  const getBadgeStyle = (): ViewStyle => {
    const baseStyle = [styles.badge, styles[`badge_${size}`]];

    switch (variant) {
      case 'success':
        return { ...StyleSheet.flatten(baseStyle), backgroundColor: Colors.successLight };
      case 'warning':
        return { ...StyleSheet.flatten(baseStyle), backgroundColor: Colors.warningLight };
      case 'danger':
        return { ...StyleSheet.flatten(baseStyle), backgroundColor: Colors.dangerLight };
      case 'info':
        return { ...StyleSheet.flatten(baseStyle), backgroundColor: Colors.infoLight };
      default:
        return { ...StyleSheet.flatten(baseStyle), backgroundColor: Colors.gray[200] };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'success':
        return Colors.successDark;
      case 'warning':
        return Colors.warningDark;
      case 'danger':
        return Colors.dangerDark;
      case 'info':
        return Colors.infoDark;
      default:
        return Colors.gray[700];
    }
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      <Text
        style={[
          styles.text,
          styles[`text_${size}`],
          { color: getTextColor() },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  badge_small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badge_medium: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: 11,
  },
  text_medium: {
    fontSize: 13,
  },
});
