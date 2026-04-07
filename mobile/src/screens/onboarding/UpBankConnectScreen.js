/**
 * UpBankConnectScreen - Connect Up Bank API
 * Enter personal access token and test connection
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Linking, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from '../../components/ProgressBar';
import { tokenService, accountService } from '../../services/upBank';

export default function UpBankConnectScreen({ navigation, route }) {
  const { commitmentMonths, guardian, aiAnswers, whitelist } = route.params;
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleOpenUpBank = () => {
    Linking.openURL('https://api.up.com.au/getting_started');
  };

  const handleTestConnection = async () => {
    if (!token.trim()) {
      Alert.alert('Missing Token', 'Please enter your Up Bank personal access token.');
      return;
    }

    setIsConnecting(true);
    try {
      // Save token temporarily for testing
      await tokenService.saveToken(token.trim());

      // Test connection by fetching account info
      const accounts = await accountService.getAccounts();

      if (accounts && accounts.length > 0) {
        setIsConnected(true);
        Alert.alert(
          'Connected!',
          `Successfully connected to Up Bank. Found ${accounts.length} account(s).`,
          [{ text: 'Continue', onPress: handleContinue }]
        );
      } else {
        throw new Error('No accounts found');
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert(
        'Connection Failed',
        'Unable to connect to Up Bank. Please check your token and try again.',
        [{ text: 'OK' }]
      );
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleContinue = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to Up Bank first.');
      return;
    }

    navigation.navigate('AccountVerify', {
      commitmentMonths,
      guardian,
      aiAnswers,
      whitelist,
      upBankToken: token.trim()
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={6} totalSteps={9} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect your Up Bank account</Text>
          <Text style={styles.subtitle}>
            I need access to create your Vault, manage your allowance, and block gambling transactions.
          </Text>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to get your API token:</Text>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepText}>Open the Up Bank app</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepText}>Go to Settings → API</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepText}>Create a "Personal Access Token"</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>4.</Text>
            <Text style={styles.stepText}>Copy the token and paste it below</Text>
          </View>

          <TouchableOpacity style={styles.helpButton} onPress={handleOpenUpBank}>
            <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.helpButtonText}>Need help? Open Up Bank guide</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Personal Access Token</Text>
          <TextInput
            style={styles.tokenInput}
            value={token}
            onChangeText={setToken}
            placeholder="up:yeah_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            placeholderTextColor="#666"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {isConnected && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#34c759" />
              <Text style={styles.successText}>Connected successfully</Text>
            </View>
          )}
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Your token is secure</Text>
            <Text style={styles.warningText}>
              • Stored encrypted on your device{'\n'}
              • Never shared with third parties{'\n'}
              • Only used for Anchor functions{'\n'}
              • You can revoke anytime in Up Bank app
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestConnection}
            disabled={isConnecting || !token.trim()}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={styles.testButtonText}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>

          {isConnected && (
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </TouchableWithoutFeedback>
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
  instructionsContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff3b30',
    width: 20,
  },
  stepText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#0a1a2a',
    borderRadius: 8,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  tokenContainer: {
    marginBottom: 24,
  },
  tokenLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  tokenInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#111',
    fontFamily: 'monospace',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  successText: {
    fontSize: 14,
    color: '#34c759',
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#0a1a2a',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  footer: {
    gap: 12,
    paddingBottom: 32,
  },
  backButton: {
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
  testButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  continueButton: {
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