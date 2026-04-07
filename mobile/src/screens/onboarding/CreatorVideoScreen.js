/**
 * CreatorVideoScreen - Matt's video introduction
 * Placeholder for now with skip option
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from '../../components/ProgressBar';

export default function CreatorVideoScreen({ navigation }) {
  const handleContinue = () => {
    navigation.navigate('Commitment');
  };

  const handleSkip = () => {
    navigation.navigate('Commitment');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={2} totalSteps={9} />

      <View style={styles.content}>
        <View style={styles.videoContainer}>
          <View style={styles.videoPlaceholder}>
            <Ionicons name="play-circle-outline" size={80} color="#666" />
            <Text style={styles.videoText}>Matt's Video</Text>
            <Text style={styles.videoSubtext}>Coming soon</Text>
          </View>
        </View>

        <View style={styles.textContent}>
          <Text style={styles.title}>Why I Built Anchor</Text>
          <Text style={styles.message}>
            Traditional gambling apps profit from your addiction. Recovery apps treat you like a victim.
          </Text>
          <Text style={styles.message}>
            Anchor treats you like an adult who made bad choices and needs real accountability.
          </Text>
          <Text style={styles.emphasisMessage}>
            No coddling. No excuses. Just control.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
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
    justifyContent: 'space-between',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#111',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  videoSubtext: {
    color: '#444',
    fontSize: 14,
  },
  textContent: {
    gap: 20,
    marginVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    textAlign: 'center',
  },
  emphasisMessage: {
    fontSize: 18,
    color: '#ff3b30',
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 32,
    gap: 12,
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
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