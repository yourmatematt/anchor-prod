/**
 * Alert Screen
 *
 * CRITICAL INTERVENTION SCREEN
 * - Full-screen takeover when non-whitelisted transaction detected
 * - CANNOT dismiss without recording voice memo
 * - Forces accountability through voice recording
 * - Starts AI conversation after recording for risk score 41+
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  BackHandler,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VoiceRecorder from '../components/VoiceRecorder';
import { transactionService } from '../services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function AlertScreen({ route, navigation }) {
  const { transaction } = route.params;
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  // AI conversation state
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Prevent back button from dismissing
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!hasRecorded || (messages.length > 0 && !conversationComplete)) {
        Alert.alert(
          hasRecorded ? 'Conversation In Progress' : 'Voice Memo Required',
          hasRecorded
            ? 'Please finish your conversation with Anchor before continuing.'
            : 'You must record a voice memo explaining this transaction before continuing.',
          [{ text: 'OK' }]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [hasRecorded, messages, conversationComplete]);

  async function sendToConversation(text) {
    setIsSending(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId,
          transactionContext: {
            riskScore: transaction.risk_score || 50,
            amount: Math.abs(parseFloat(transaction.amount)),
            description: transaction.payee_name || transaction.description,
          },
        }),
      });

      const data = await response.json();

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);

      // Allow dismissal after 3+ exchanges (6 messages = 3 user + 3 assistant)
      if (messages.length + 2 >= 6) {
        setConversationComplete(true);
        setIsDismissing(true);
      }
    } catch (error) {
      console.error('AI conversation error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I'm having trouble connecting. You can continue when ready." },
      ]);
      setConversationComplete(true);
      setIsDismissing(true);
    } finally {
      setIsSending(false);
    }
  }

  async function handleRecordingComplete(voiceMemoUri, transcript) {
    setHasRecorded(true);

    try {
      const placeholderUrl = `file://${voiceMemoUri}`;

      // Update transaction with voice memo
      await transactionService.updateVoiceMemo(
        transaction.transaction_id,
        placeholderUrl,
        transcript
      );

      // Start AI conversation with the transcript
      if (transcript) {
        setMessages([{ role: 'user', content: transcript }]);
        await sendToConversation(transcript);
      } else {
        // No transcript available — allow dismissal
        setConversationComplete(true);
        setIsDismissing(true);
      }
    } catch (error) {
      console.error('Error saving voice memo:', error);
      Alert.alert('Error', 'Failed to save voice memo. Please try again.');
      setHasRecorded(false);
    }
  }

  async function handleSendMessage() {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    await sendToConversation(text);
  }

  function handleDismiss() {
    if (!hasRecorded) {
      Alert.alert(
        'Voice Memo Required',
        'You must record a voice memo explaining this transaction before continuing.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isDismissing || conversationComplete) {
      // End conversation on server
      if (conversationId) {
        fetch(`${API_URL}/api/voice/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId }),
        }).catch(() => {});
      }
      navigation.goBack();
    }
  }

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={true}
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Warning Header */}
        <View style={styles.header}>
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={48} color="#ff3b30" />
          </View>
          <Text style={styles.title}>ANCHOR ALERT</Text>
          <Text style={styles.subtitle}>Non-Whitelisted Transaction</Text>
        </View>

        {/* Transaction Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payee</Text>
            <Text style={styles.detailValue}>{transaction.payee_name || 'Unknown'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {new Date(transaction.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Phase 1: Voice Recording */}
        {!hasRecorded && (
          <>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                This transaction is NOT on your whitelist.
              </Text>
              <Text style={styles.warningSubtext}>
                You must record a voice memo explaining why you're making this transaction.
              </Text>
            </View>

            <View style={styles.recorderContainer}>
              <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
            </View>

            <View style={styles.footer}>
              <Ionicons name="lock-closed" size={16} color="#8e8e93" />
              <Text style={styles.footerText}>
                Recording required to continue
              </Text>
            </View>
          </>
        )}

        {/* Phase 2: AI Conversation */}
        {hasRecorded && messages.length > 0 && (
          <>
            <ScrollView
              ref={scrollRef}
              style={styles.chatContainer}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.role === 'user' ? styles.userText : styles.assistantText,
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              ))}
              {isSending && (
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              )}
            </ScrollView>

            {/* Chat input */}
            {!conversationComplete && (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your response..."
                  placeholderTextColor="#8e8e93"
                  editable={!isSending}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={isSending}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Dismiss Button */}
        {(isDismissing || conversationComplete) && (
          <TouchableOpacity
            style={[styles.dismissButton, styles.dismissButtonEnabled]}
            onPress={handleDismiss}
          >
            <Text style={styles.dismissButtonText}>Continue</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  warningIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
  },
  detailsCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    color: '#8e8e93',
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  warningText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff3b30',
    marginBottom: 8,
  },
  warningSubtext: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  recorderContainer: {
    marginBottom: 32,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#2c2c2e',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#e5e5e7',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  dismissButton: {
    backgroundColor: '#2c2c2e',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  dismissButtonEnabled: {
    backgroundColor: '#007AFF',
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#8e8e93',
    fontSize: 14,
    marginLeft: 8,
  },
});
