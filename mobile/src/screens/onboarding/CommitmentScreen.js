/**
 * CommitmentScreen - Choose lock-in period
 * Hard love commitment with NO CANCEL option
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProgressBar from '../../components/ProgressBar';

const COMMITMENT_PERIODS = [
  { months: 0.25, days: 7, label: '1 Week', subtitle: 'Initial trial', trial: true },
  { months: 6, label: '6 Months', subtitle: 'Testing the waters' },
  { months: 12, label: '1 Year', subtitle: 'Getting serious', recommended: true },
  { months: 18, label: '18 Months', subtitle: 'Real commitment' },
  { months: 24, label: '2 Years', subtitle: 'Nuclear option' },
];

export default function CommitmentScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState(12);
  const selectedPeriodData = COMMITMENT_PERIODS.find(p => p.months === selectedPeriod);

  const handleContinue = () => {
    const periodLabel = selectedPeriodData?.days ? '1 week' : `${selectedPeriod} months`;
    const commitmentDays = selectedPeriodData?.days || selectedPeriod * 30;

    Alert.alert(
      'Are You Sure?',
      `You're committing to ${periodLabel}. There is NO way to turn this off, cancel, or get your money back during this period. Your guardian will be notified if you try.`,
      [
        { text: 'Let me think about it', style: 'cancel' },
        {
          text: 'I understand',
          style: 'destructive',
          onPress: () => {
            navigation.navigate('GuardianSetup', {
              commitmentMonths: selectedPeriod,
              commitmentDays: commitmentDays
            });
          }
        }
      ]
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={3} totalSteps={9} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>How long do you need me to hold you accountable?</Text>
          <Text style={styles.subtitle}>
            Choose carefully. Once you lock in, that's it.
          </Text>
        </View>

        <View style={styles.options}>
          {COMMITMENT_PERIODS.map((period) => (
            <TouchableOpacity
              key={period.months}
              style={[
                styles.optionCard,
                selectedPeriod === period.months && styles.optionCardSelected,
                period.recommended && styles.optionCardRecommended,
                period.trial && styles.optionCardTrial,
              ]}
              onPress={() => setSelectedPeriod(period.months)}
            >
              <View style={styles.optionHeader}>
                <Text style={[
                  styles.optionLabel,
                  selectedPeriod === period.months && styles.optionLabelSelected
                ]}>
                  {period.label}
                </Text>
                {period.recommended && (
                  <Text style={styles.recommendedBadge}>RECOMMENDED</Text>
                )}
                {period.trial && (
                  <Text style={styles.trialBadge}>TRIAL</Text>
                )}
              </View>
              <Text style={[
                styles.optionSubtitle,
                selectedPeriod === period.months && styles.optionSubtitleSelected
              ]}>
                {period.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>NO CANCELLATION</Text>
          <Text style={styles.warningText}>
            • No refunds, no exceptions{'\n'}
            • No "changed my mind"{'\n'}
            • No "life circumstances"{'\n'}
            • Your guardian gets notified of attempts{'\n'}
            • This is the point
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              Lock in {selectedPeriodData?.days ? '1 week' : `${selectedPeriod} months`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
  },
  header: {
    marginVertical: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 32,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  options: {
    gap: 12,
    marginBottom: 32,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#111',
  },
  optionCardSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#1a0a0a',
  },
  optionCardRecommended: {
    borderColor: '#007AFF',
  },
  optionCardTrial: {
    borderColor: '#666',
    borderStyle: 'dashed',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  optionLabelSelected: {
    color: '#ff3b30',
  },
  recommendedBadge: {
    backgroundColor: '#007AFF',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  trialBadge: {
    backgroundColor: '#666',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  optionSubtitleSelected: {
    color: '#999',
  },
  warningBox: {
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 32,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  backButtonText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueButton: {
    flex: 2,
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});