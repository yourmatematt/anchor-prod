/**
 * WhitelistSetupScreen - Set up initial whitelist with bill details
 * Add bills with payee name, BSB, account number
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from '../../components/ProgressBar';

const COMMON_BILLS = [
  'Rent/Mortgage',
  'Electricity',
  'Gas',
  'Water',
  'Internet',
  'Phone',
  'Groceries',
  'Insurance',
  'Council Rates',
  'Gym Membership'
];

export default function WhitelistSetupScreen({ navigation, route }) {
  const { commitmentMonths, guardian, aiAnswers, whitelist, upBankToken, verifiedAccounts } = route.params;
  const [whitelistItems, setWhitelistItems] = useState([]);

  const addWhitelistItem = (preset = null) => {
    const newItem = {
      id: Date.now().toString(),
      payeeName: preset || '',
      description: '',
      category: 'bills',
      bsb: '',
      accountNumber: '',
      isActive: true
    };
    setWhitelistItems([...whitelistItems, newItem]);
  };

  const updateWhitelistItem = (id, field, value) => {
    setWhitelistItems(items =>
      items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeWhitelistItem = (id) => {
    setWhitelistItems(items => items.filter(item => item.id !== id));
  };

  const handleContinue = () => {
    const validItems = whitelistItems.filter(item =>
      item.payeeName.trim() && item.description.trim()
    );

    if (validItems.length === 0) {
      Alert.alert(
        'No Bills Added',
        'You should add at least some essential bills. Are you sure you want to continue without any?',
        [
          { text: 'Add Bills', style: 'cancel' },
          { text: 'Continue Anyway', onPress: proceedToFinal }
        ]
      );
      return;
    }

    proceedToFinal();
  };

  const proceedToFinal = () => {
    const validItems = whitelistItems.filter(item =>
      item.payeeName.trim() && item.description.trim()
    );

    navigation.navigate('FinalLock', {
      commitmentMonths,
      guardian,
      aiAnswers,
      upBankToken,
      verifiedAccounts,
      whitelist: validItems
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={8} totalSteps={9} />

      <View style={styles.header}>
        <Text style={styles.title}>Set up your essential bills</Text>
        <Text style={styles.subtitle}>
          I'll never block these. Be honest - only add things you genuinely need.
        </Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Common bills shortcuts */}
        <View style={styles.presetsContainer}>
          <Text style={styles.presetsTitle}>Quick add common bills:</Text>
          <View style={styles.presetsGrid}>
            {COMMON_BILLS.map((bill) => (
              <TouchableOpacity
                key={bill}
                style={styles.presetChip}
                onPress={() => addWhitelistItem(bill)}
              >
                <Text style={styles.presetChipText}>{bill}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Whitelist items */}
        <View style={styles.itemsContainer}>
          {whitelistItems.map((item) => (
            <View key={item.id} style={styles.whitelistItem}>
              <View style={styles.itemHeader}>
                <View style={styles.itemNumber}>
                  <Text style={styles.itemNumberText}>
                    {whitelistItems.indexOf(item) + 1}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeWhitelistItem(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </View>

              <View style={styles.itemForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payee Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.payeeName}
                    onChangeText={(value) => updateWhitelistItem(item.id, 'payeeName', value)}
                    placeholder="e.g., Woolworths, AGL, Commonwealth Bank"
                    placeholderTextColor="#666"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={item.description}
                    onChangeText={(value) => updateWhitelistItem(item.id, 'description', value)}
                    placeholder="e.g., Weekly groceries, Electricity bill"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>BSB (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={item.bsb}
                      onChangeText={(value) => updateWhitelistItem(item.id, 'bsb', value)}
                      placeholder="123-456"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      maxLength={7}
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex2]}>
                    <Text style={styles.inputLabel}>Account Number (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={item.accountNumber}
                      onChangeText={(value) => updateWhitelistItem(item.id, 'accountNumber', value)}
                      placeholder="12345678"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={() => addWhitelistItem()}>
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.addButtonText}>Add custom bill</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About the whitelist:</Text>
            <Text style={styles.infoText}>
              • These transactions will never be blocked{'\n'}
              • I'll still log them for transparency{'\n'}
              • You can add more later (with guardian approval){'\n'}
              • BSB/Account help with exact matching
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              Continue with {whitelistItems.filter(item => item.payeeName.trim()).length} bills
            </Text>
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 32,
    paddingVertical: 24,
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
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  presetsContainer: {
    marginBottom: 32,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetChipText: {
    fontSize: 12,
    color: '#fff',
  },
  itemsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  whitelistItem: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  removeButton: {
    padding: 4,
  },
  itemForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#000',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#0a1a2a',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
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