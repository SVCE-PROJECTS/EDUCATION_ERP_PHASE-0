
// @ts-nocheck

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors, spacing, typography } from '../../theme';

const FeeScreen = ({ navigation }) => {
  const feeOptions = [
    {
      key: 'TransportFee',
      title: 'Transport',
      description: 'Manage student transport fees and payments',
      icon: 'bus-outline',
      screen: 'TransportFee',
    },
    {
      key: 'HostelFee',
      title: 'Hostel',
      description: 'Manage hostel fees and student payments',
      icon: 'home-city-outline',
      screen: 'HostelFee',
    },
    {
      key: 'AcademicFee',
      title: 'Academic Fee',
      description: 'Manage tuition fee and examination fee',
      icon: 'school-outline',
      screen: 'AcademicFee',
    },
  ];

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBack}
            style={styles.backButton}
          >
            <Icon
              source="arrow-left"
              size={24}
              color={colors.textPrimary}
            />

            <Text style={styles.backText}>
              Back
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            Fee Management
          </Text>

          <Text style={styles.subtitle}>
            Manage student fees and payments
          </Text>
        </View>

        {/* Fee Options */}
        <View style={styles.optionsContainer}>
          {feeOptions.map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(item.screen)}
              style={styles.feeCard}
            >
              <View style={styles.iconContainer}>
                <Icon
                  source={item.icon}
                  size={32}
                  color={colors.primary}
                />
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {item.title}
                </Text>

                <Text style={styles.cardDescription}>
                  {item.description}
                </Text>
              </View>

              <Icon
                source="chevron-right"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.xl,
  },

  header: {
    marginBottom: spacing.xl,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },

  backText: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
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

  feeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 100,
  },

  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default FeeScreen;

