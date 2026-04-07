/**
 * AccountVerifyScreen - Verify required Up Bank accounts exist
 * Check for Vault, Allowance, and Bills accounts
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from '../../components/ProgressBar';
import { accountService } from '../../services/upBank';

const REQUIRED_ACCOUNTS = [
  {
    name: 'Vault',
    description: 'Holds your locked funds',
    required: true
  },
  {
    name: 'Allowance',
    description: 'Your daily spending money',
    required: true
  },
  {
    name: 'Bills',
    description: 'For whitelisted expenses',
    required: true
  }
];

export default function AccountVerifyScreen({ navigation, route }) {
  const { commitmentMonths, guardian, aiAnswers, whitelist, upBankToken } = route.params;
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationResults, setVerificationResults] = useState({});

  useEffect(() => {
    verifyAccounts();
  }, []);

  const verifyAccounts = async () => {
    try {
      setIsLoading(true);

      // Fetch all user accounts
      const userAccounts = await accountService.getAccounts();
      setAccounts(userAccounts);

      // Check which required accounts exist
      const results = {};
      REQUIRED_ACCOUNTS.forEach(required => {
        const found = userAccounts.find(account =>
          account.attributes.displayName.toLowerCase().includes(required.name.toLowerCase()) ||
          account.attributes.nickname?.toLowerCase().includes(required.name.toLowerCase())
        );
        results[required.name] = {
          exists: !!found,
          account: found,
          required: required.required
        };
      });

      setVerificationResults(results);
    } catch (error) {
      console.error('Account verification error:', error);
      Alert.alert(
        'Verification Failed',
        'Unable to verify your accounts. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createMissingAccounts = async () => {
    Alert.alert(
      'Create Missing Accounts',
      'You need to create the missing accounts in your Up Bank app first. Would you like instructions?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Show Instructions', onPress: showInstructions }
      ]
    );
  };

  const showInstructions = () => {
    Alert.alert(
      'Creating Up Bank Savers',
      'In your Up Bank app:\n\n1. Go to Savers tab\n2. Create new Saver\n3. Name it "Vault", "Allowance", or "Bills"\n4. Come back and tap "Refresh"\n\nThese accounts are essential for Anchor to work.',
      [{ text: 'Got it' }]
    );
  };

  const handleContinue = () => {
    const allRequired = REQUIRED_ACCOUNTS.filter(acc => acc.required);
    const missingRequired = allRequired.filter(acc => !verificationResults[acc.name]?.exists);

    if (missingRequired.length > 0) {
      Alert.alert(
        'Missing Required Accounts',
        `You need: ${missingRequired.map(acc => acc.name).join(', ')}`
      );
      return;
    }

    navigation.navigate('WhitelistSetup', {
      commitmentMonths,
      guardian,
      aiAnswers,
      whitelist,
      upBankToken,
      verifiedAccounts: verificationResults
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const allRequiredExist = REQUIRED_ACCOUNTS
    .filter(acc => acc.required)
    .every(acc => verificationResults[acc.name]?.exists);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ProgressBar currentStep={7} totalSteps={9} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff3b30" />
          <Text style={styles.loadingText}>Verifying your accounts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={7} totalSteps={9} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verifying your Up Bank accounts</Text>
          <Text style={styles.subtitle}>
            Anchor needs specific accounts to manage your money. Let's make sure they exist.
          </Text>
        </View>

        <View style={styles.accountsList}>
          {REQUIRED_ACCOUNTS.map((required) => {
            const result = verificationResults[required.name];
            const exists = result?.exists;

            return (
              <View key={required.name} style={styles.accountCard}>
                <View style={styles.accountIcon}>
                  <Ionicons
                    name={exists ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={exists ? '#34c759' : '#ff3b30'}
                  />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{required.name}</Text>
                  <Text style={styles.accountDescription}>{required.description}</Text>
                  {exists && result.account && (
                    <Text style={styles.accountDetails}>
                      Found: {result.account.attributes.displayName}
                    </Text>
                  )}
                </View>
                <View style={styles.accountStatus}>
                  {required.required && (
                    <Text style={styles.requiredBadge}>REQUIRED</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {!allRequiredExist && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color="#ff3b30" />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Missing Required Accounts</Text>
              <Text style={styles.errorText}>
                You need to create the missing accounts in your Up Bank app before continuing.
              </Text>
              <TouchableOpacity style={styles.instructionsButton} onPress={showInstructions}>
                <Text style={styles.instructionsButtonText}>Show me how</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Found {accounts.length} total accounts</Text>
          <Text style={styles.summaryText}>
            Anchor will only access the Vault, Allowance, and Bills accounts.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshButton} onPress={verifyAccounts}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !allRequiredExist && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!allRequiredExist}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  accountsList: {
    gap: 12,
    marginBottom: 24,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  accountDescription: {
    fontSize: 14,
    color: '#666',
  },
  accountDetails: {
    fontSize: 12,
    color: '#34c759',
    marginTop: 4,
  },
  accountStatus: {
    alignItems: 'flex-end',
  },
  requiredBadge: {
    backgroundColor: '#ff3b30',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff3b30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 12,
  },
  instructionsButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  instructionsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  summaryBox: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0a1a2a',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
  },
  continueButtonDisabled: {
    backgroundColor: '#333',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});