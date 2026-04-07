/**
 * WelcomeScreen - First screen of onboarding
 * Hard love introduction to Anchor
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen({ navigation }) {
  const handleContinue = () => {
    navigation.navigate('CreatorVideo');
  };

  const handleBack = () => {
    // Exit app or go to auth screen
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>This is Anchor.</Text>
          <Text style={styles.subtitle}>Your last shot.</Text>

          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              You've tried everything else. Apps, self-control, promises to yourself and others.
            </Text>
            <Text style={styles.message}>
              None of it worked. Because you can't trust yourself.
            </Text>
            <Text style={styles.message}>
              So don't.
            </Text>
            <Text style={styles.emphasisMessage}>
              Give me control instead.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Not ready</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>I'm ready</Text>
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
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 24,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 64,
    fontWeight: '600',
  },
  messageContainer: {
    gap: 24,
  },
  message: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
    textAlign: 'center',
  },
  emphasisMessage: {
    fontSize: 20,
    color: '#ff3b30',
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 16,
  },
  footer: {
    paddingBottom: 32,
    gap: 16,
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