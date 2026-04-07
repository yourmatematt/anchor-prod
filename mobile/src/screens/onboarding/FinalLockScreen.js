/**
 * FinalLockScreen - Final commitment and lock-in
 * Summary + "I understand I cannot turn this off" + "Give Anchor Control"
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from '../../components/ProgressBar';

export default function FinalLockScreen({ navigation, route }) {
  const { commitmentMonths, guardian, aiAnswers, upBankToken, verifiedAccounts, whitelist } = route.params;
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const handleLockIn = async () => {
    if (!acknowledged) {
      Alert.alert('Acknowledgment Required', 'You must acknowledge that you understand you cannot turn this off.');
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'This is irreversible. Once you tap "Give Anchor Control", you are locked in for the full period with no way out. Are you absolutely certain?',
      [
        { text: 'Let me think', style: 'cancel' },
        {
          text: 'I\'m certain',
          style: 'destructive',
          onPress: proceedWithLockIn
        }
      ]
    );
  };

  const proceedWithLockIn = async () => {
    setIsLocking(true);

    try {
      // TODO: Save all onboarding data to Supabase
      // This would include:
      // - User profile with commitment period
      // - Guardian information
      // - AI interview answers
      // - Up Bank token (encrypted)
      // - Whitelist items
      // - Activation timestamp

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Navigate to success/main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'OnboardingComplete' }],
      });

    } catch (error) {
      console.error('Lock-in error:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleBack = () => {
    Alert.alert(
      'Go Back?',
      'You\'re so close to being done. Are you sure you want to go back?',
      [
        { text: 'Continue Setup', style: 'cancel' },
        { text: 'Go Back', onPress: () => navigation.goBack() }
      ]
    );
  };

  if (isLocking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockingContainer}>
          <ActivityIndicator size="large" color="#ff3b30" />
          <Text style={styles.lockingTitle}>Activating Anchor...</Text>
          <Text style={styles.lockingSubtitle}>
            Setting up your accounts, saving your preferences, and locking you in.
          </Text>
          <Text style={styles.lockingWarning}>
            Do not close the app.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={9} totalSteps={9} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Ready to hand over control?</Text>
          <Text style={styles.subtitle}>
            This is your last chance to change anything. Review everything below.
          </Text>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Lock-in Period</Text>
            <Text style={styles.summaryValue}>{commitmentMonths} months</Text>
            <Text style={styles.summaryNote}>Cannot be changed or cancelled</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Daily Allowance</Text>
            <Text style={styles.summaryValue}>${aiAnswers[8] || 30}</Text>
            <Text style={styles.summaryNote}>No rollover - use it or lose it</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Guardian</Text>
            <Text style={styles.summaryValue}>{guardian.name}</Text>
            <Text style={styles.summaryNote}>{guardian.phone} ({guardian.relationship})</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Whitelisted Bills</Text>
            <Text style={styles.summaryValue}>{whitelist.length} items</Text>
            <Text style={styles.summaryNote}>
              {whitelist.slice(0, 3).map(item => item.payeeName).join(', ')}
              {whitelist.length > 3 && ` +${whitelist.length - 3} more`}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Up Bank Connection</Text>
            <Text style={styles.summaryValue}>Connected</Text>
            <Text style={styles.summaryNote}>Token secured and encrypted</Text>
          </View>
        </View>

        <View style={styles.finalWarningBox}>
          <Ionicons name="warning" size={24} color="#ff3b30" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>FINAL WARNING</Text>
            <Text style={styles.warningText}>
              • NO refunds under ANY circumstances{'\n'}
              • NO exceptions for "emergencies"{'\n'}
              • NO "I changed my mind"{'\n'}
              • Your guardian will be contacted if you try to break this{'\n'}
              • This is designed to be unbreakable
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.acknowledgmentContainer}
          onPress={() => setAcknowledged(!acknowledged)}
        >
          <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
            {acknowledged && <Ionicons name="checkmark" size={16} color="#000" />}
          </View>
          <Text style={styles.acknowledgmentText}>
            I understand that I cannot turn this off, cancel my subscription, or get my money back for {commitmentMonths} months. I am giving Anchor complete control over my finances during this period.
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.lockButton,
              !acknowledged && styles.lockButtonDisabled
            ]}
            onPress={handleLockIn}
            disabled={!acknowledged}
          >
            <Text style={styles.lockButtonText}>Give Anchor Control</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  lockingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  lockingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  lockingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  lockingWarning: {
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 16,
  },
  header: {
    marginVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  summaryContainer: {
    gap: 20,
    marginBottom: 32,
  },
  summaryItem: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  summaryNote: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  finalWarningBox: {
    flexDirection: 'row',
    backgroundColor: '#1a0a0a',
    borderWidth: 2,
    borderColor: '#ff3b30',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    gap: 16,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  acknowledgmentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 4,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  acknowledgmentText: {
    flex: 1,
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
  lockButton: {
    flex: 2,
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
  },
  lockButtonDisabled: {
    backgroundColor: '#333',
  },
  lockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});