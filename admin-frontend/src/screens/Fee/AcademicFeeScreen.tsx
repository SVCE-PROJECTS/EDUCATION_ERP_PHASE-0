// @ts-nocheck

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenLayout from '../../navigation/ScreenLayout';
import FeeOptionCard from '../../components/Fee/FeeOptionCard';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

const ACADEMIC_FEE_OPTIONS = [
  {
    key: 'TuitionFee',
    title: 'Tuition Fees',
    description: 'Manage semester-wise tuition fee structure and student dues',
    icon: 'currency-inr',
    screen: 'TuitionFee',
    accent: 'blue',
  },
  {
    key: 'ExamFee',
    title: 'Exam Fees',
    description: 'Manage internal and external examination fee structure',
    icon: 'clipboard-text-outline',
    screen: 'ExamFee',
    accent: 'violet',
  },
];

const AcademicFeeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
  <ScreenLayout navigation={navigation} activeScreen="Fee">
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Academic Fee</Text>
        <Text style={styles.subtitle}>Tuition fee and examination fee for students</Text>
      </View>

      <View style={styles.optionsContainer}>
        {ACADEMIC_FEE_OPTIONS.map((item) => (
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

export default AcademicFeeScreen;
