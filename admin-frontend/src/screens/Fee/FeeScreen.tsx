// @ts-nocheck

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenLayout from '../../navigation/ScreenLayout';
import FeeOptionCard from '../../components/Fee/FeeOptionCard';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

const FEE_OPTIONS = [
  {
    key: 'TransportFee',
    title: 'Transport',
    description: 'Manage student transport fees and payments',
    icon: 'bus-outline',
    screen: 'TransportFee',
    accent: 'blue',
  },
  {
    key: 'HostelFee',
    title: 'Hostel',
    description: 'Manage hostel fees and student payments',
    icon: 'home-city-outline',
    screen: 'HostelFee',
    accent: 'teal',
  },
  {
    key: 'AcademicFee',
    title: 'Academic Fee',
    description: 'Manage tuition fee and examination fee',
    icon: 'school-outline',
    screen: 'AcademicFee',
    accent: 'violet',
  },
];

const FeeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
  <ScreenLayout navigation={navigation} activeScreen="Fee">
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Fee Management</Text>
        <Text style={styles.subtitle}>Manage student fees and payments</Text>
      </View>

      <View style={styles.optionsContainer}>
        {FEE_OPTIONS.map((item) => (
          <FeeOptionCard
            key={item.key}
            icon={item.icon}
            title={item.title}
            description={item.description}
            accent={item.accent}
            onPress={() => navigation.navigate(item.screen)}
          />
        ))}
      </View>
    </ScrollView>
  </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 900,
  },
});

export default FeeScreen;
