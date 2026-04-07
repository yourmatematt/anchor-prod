/**
 * OnboardingCompleteScreen - Success screen after lock-in
 * Hard love confirmation that they're now under Anchor's control
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingCompleteScreen({ navigation }) {

  const handleContinue = () => {
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={60} color="#ff3b30" />
          </View>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.title}>Alright.</Text>
          <Text style={styles.subtitle}>You gave me control.</Text>

          <View style={styles.rulesContainer}>
            <Text style={styles.rulesTitle}>That means:</Text>
            <Text style={styles.rule}>• When I say no, it's no.</Text>
            <Text style={styles.rule}>• No negotiations, no exceptions.</Text>
            <Text style={styles.rule}>• Your guardian watches your back.</Text>
            <Text style={styles.rule}>• Every transaction gets logged.</Text>
            <Text style={styles.rule}>• I'm not going anywhere.</Text>
          </View>

          <Text style={styles.finalMessage}>
            You wanted accountability. Now you have it.
          </Text>

          <Text style={styles.encouragement}>
            Time to prove you meant it.
          </Text>
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Enter Anchor</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  lockIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a0a0a',
    borderWidth: 2,
    borderColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    color: '#ff3b30',
    textAlign: 'center',
    fontWeight: '600',
  },
  rulesContainer: {
    gap: 12,
    marginVertical: 20,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  rule: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  finalMessage: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 26,
  },
  encouragement: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#ff3b30',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});