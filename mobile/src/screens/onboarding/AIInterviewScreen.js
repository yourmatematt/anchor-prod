/**
 * AIInterviewScreen - The 10 hard love questions
 * No bullshit assessment to understand the user's situation
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from '../../components/ProgressBar';

const QUESTIONS = [
  {
    id: 1,
    type: 'text',
    question: "What happened that made you finally stop bullshitting yourself?",
    placeholder: "The moment you realized you had a problem..."
  },
  {
    id: 2,
    type: 'amount_select',
    question: "How much have you lost? Total. Best guess.",
    options: [
      { label: 'More than $10,000', value: '10000' },
      { label: 'More than $25,000', value: '25000' },
      { label: 'More than $50,000', value: '50000' },
      { label: 'More than $100,000', value: '100000' },
      { label: 'More than $250,000', value: '250000' },
    ]
  },
  {
    id: 3,
    type: 'text',
    question: "What are you actually chasing? Not 'to win money' - what's the FEELING?",
    placeholder: "Control? Escape? Excitement? Validation?"
  },
  {
    id: 4,
    type: 'text',
    question: "When you gamble, what happens after the money's gone?",
    placeholder: "Shame? Anger? Plan the next bet?"
  },
  {
    id: 5,
    type: 'text',
    question: "Who knows you have a problem?",
    placeholder: "Everyone? No one? Just your bank balance?"
  },
  {
    id: 6,
    type: 'text',
    question: "What would have to change for life to not feel like something you need to escape from?",
    placeholder: "Your job? Relationship? Financial stress?"
  },
  {
    id: 7,
    type: 'text',
    question: "When you ask me for money, how should I respond?",
    placeholder: "What would actually help you in that moment?"
  },
  {
    id: 8,
    type: 'allowance_select',
    question: "What's your daily allowance?",
    subtitle: "Money you can spend without my permission. NO ROLLOVER - use it or lose it.",
    options: [
      { label: '$20', value: 20, description: 'Bare minimum' },
      { label: '$30', value: 30, description: 'Recommended' },
      { label: '$50', value: 50, description: 'Moderate' },
      { label: '$75', value: 75, description: 'Comfortable' },
      { label: '$100', value: 100, description: 'Maximum' },
    ]
  },
  {
    id: 9,
    type: 'whitelist',
    question: "List your non-negotiable expenses",
    subtitle: "Bills, groceries, legitimate purchases I should never block"
  },
  {
    id: 10,
    type: 'confirmation',
    question: "Ready to give me control?",
    subtitle: "Last chance to back out"
  }
];

export default function AIInterviewScreen({ navigation, route }) {
  const { commitmentMonths, guardian } = route.params;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [whitelistItems, setWhitelistItems] = useState([]);

  const question = QUESTIONS[currentQuestion];
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;
  const canContinue = answers[question.id] || answers[question.id] === 0;

  const handleAnswer = (value) => {
    setAnswers({ ...answers, [question.id]: value });
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Navigate to UpBankConnect
      navigation.navigate('UpBankConnect', {
        commitmentMonths,
        guardian,
        aiAnswers: answers,
        whitelist: whitelistItems
      });
    } else {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      navigation.goBack();
    }
  };

  const addWhitelistItem = () => {
    setWhitelistItems([...whitelistItems, '']);
  };

  const updateWhitelistItem = (index, value) => {
    const updated = [...whitelistItems];
    updated[index] = value;
    setWhitelistItems(updated);
    handleAnswer(updated.filter(item => item.trim()));
  };

  const removeWhitelistItem = (index) => {
    const updated = whitelistItems.filter((_, i) => i !== index);
    setWhitelistItems(updated);
    handleAnswer(updated.filter(item => item.trim()));
  };

  const renderQuestion = () => {
    switch (question.type) {
      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            value={answers[question.id] || ''}
            onChangeText={(value) => handleAnswer(value)}
            placeholder={question.placeholder}
            placeholderTextColor="#666"
            multiline
            textAlignVertical="top"
          />
        );

      case 'amount_select':
        return (
          <View style={styles.amountSelectContainer}>
            {question.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.amountOption,
                  answers[question.id] === option.value && styles.amountOptionSelected,
                ]}
                onPress={() => handleAnswer(option.value)}
              >
                <Text style={[
                  styles.amountOptionText,
                  answers[question.id] === option.value && styles.amountOptionTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'allowance_select':
        return (
          <View style={styles.allowanceContainer}>
            <View style={styles.allowanceOptions}>
              {question.options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.allowanceOption,
                    answers[question.id] === option.value && styles.allowanceOptionSelected,
                    option.value === 30 && styles.allowanceOptionRecommended,
                  ]}
                  onPress={() => handleAnswer(option.value)}
                >
                  <Text style={[
                    styles.allowanceValue,
                    answers[question.id] === option.value && styles.allowanceValueSelected,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.allowanceDescription,
                    answers[question.id] === option.value && styles.allowanceDescriptionSelected,
                  ]}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.allowanceWarning}>
              Unused allowance disappears at midnight. No saving up for big purchases.
            </Text>
          </View>
        );

      case 'whitelist':
        return (
          <View style={styles.whitelistContainer}>
            {whitelistItems.map((item, index) => (
              <View key={index} style={styles.whitelistItem}>
                <TextInput
                  style={styles.whitelistInput}
                  value={item}
                  onChangeText={(value) => updateWhitelistItem(index, value)}
                  placeholder="e.g., Woolworths, Rent, Phone bill"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  onPress={() => removeWhitelistItem(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addWhitelistItem}>
              <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>Add expense</Text>
            </TouchableOpacity>
          </View>
        );

      case 'confirmation':
        return (
          <View style={styles.confirmationContainer}>
            <Text style={styles.confirmationText}>
              This is it. After this, I'm in charge of your money.
            </Text>
            <Text style={styles.confirmationSubtext}>
              • Daily allowance: ${answers[8] || 30}{'\n'}
              • Lock-in period: {commitmentMonths} months{'\n'}
              • Guardian: {guardian.name}{'\n'}
              • Whitelist items: {whitelistItems.filter(item => item.trim()).length}
            </Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => handleAnswer(true)}
            >
              <Text style={styles.confirmButtonText}>
                {answers[question.id] ? 'Yes, I\'m ready' : 'Give you control'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={5} totalSteps={9} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.questionNumber}>
            Question {currentQuestion + 1} of {QUESTIONS.length}
          </Text>
          <Text style={styles.question}>{question.question}</Text>
          {question.subtitle && (
            <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
          )}
        </View>

        <View style={styles.answerContainer}>
          {renderQuestion()}
        </View>
      </ScrollView>
      </TouchableWithoutFeedback>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>
            {isLastQuestion ? 'Continue' : 'Next'}
          </Text>
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
  },
  header: {
    marginVertical: 32,
  },
  questionNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 32,
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  answerContainer: {
    marginBottom: 32,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#111',
    minHeight: 120,
  },
  amountSelectContainer: {
    gap: 12,
  },
  amountOption: {
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#111',
  },
  amountOptionSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#1a0a0a',
  },
  amountOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  amountOptionTextSelected: {
    color: '#ff3b30',
  },
  allowanceContainer: {
    gap: 16,
  },
  allowanceOptions: {
    gap: 12,
  },
  allowanceOption: {
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#111',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allowanceOptionSelected: {
    borderColor: '#ff3b30',
    backgroundColor: '#1a0a0a',
  },
  allowanceOptionRecommended: {
    borderColor: '#007AFF',
  },
  allowanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  allowanceValueSelected: {
    color: '#ff3b30',
  },
  allowanceDescription: {
    fontSize: 14,
    color: '#666',
  },
  allowanceDescriptionSelected: {
    color: '#999',
  },
  allowanceWarning: {
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  whitelistContainer: {
    gap: 12,
  },
  whitelistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  whitelistInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#111',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  confirmationContainer: {
    alignItems: 'center',
    gap: 24,
  },
  confirmationText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  confirmationSubtext: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 32,
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
  continueButtonDisabled: {
    backgroundColor: '#333',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});