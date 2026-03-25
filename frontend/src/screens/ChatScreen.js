import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import config from '../config';
import useAuthStore from '../store/useAuthStore';
import useChatStore from '../store/useChatStore';
import { encryptMessage, decryptMessage } from '../crypto';

const ChatScreen = ({ route }) => {
  const { receiverId, receiverEmail, receiverPublicKey } = route.params;
  const [text, setText] = useState('');
  const flatListRef = useRef(null);

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const privateKey = useAuthStore((s) => s.privateKey);

  const messages = useChatStore((s) => s.messages);
  const mode = useChatStore((s) => s.mode);
  const setMode = useChatStore((s) => s.setMode);
  const addMessage = useChatStore((s) => s.addMessage);
  const setMessages = useChatStore((s) => s.setMessages);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const adminPublicKey = useChatStore((s) => s.adminPublicKey);
  const ws = useChatStore((s) => s.ws);
  const setWs = useChatStore((s) => s.setWs);

  // Load history + connect WS
  useEffect(() => {
    clearMessages();

    // Fetch history for SECURE mode
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${config.API_URL}/api/messages/${receiverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Decrypt each message
        const decrypted = res.data.map((msg) => {
          try {
            const isSender = msg.sender_id === user._id || msg.sender_id?._id === user._id;
            // If I'm the sender, I can't decrypt with encrypted_session_key_user (that's for the receiver).
            // For simplicity in this demo, the sender also needs a copy. We'll store the sender's copy too.
            // Actually, let's just try to decrypt with the user key - if it fails (because we're the sender),
            // we show a placeholder.
            let plaintext = '[Encrypted]';
            if (!isSender) {
              plaintext = decryptMessage(
                msg.encrypted_message,
                msg.iv,
                msg.auth_tag,
                msg.encrypted_session_key_user,
                privateKey
              );
            }
            return { ...msg, text: plaintext, isSender };
          } catch {
            return { ...msg, text: '[Encrypted]', isSender: msg.sender_id === user._id || msg.sender_id?._id === user._id };
          }
        });

        setMessages(decrypted);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      }
    };

    fetchHistory();

    // Connect WebSocket
    const socket = new WebSocket(`${config.WS_URL}?token=${token}`);
    setWs(socket);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_MESSAGE' || data.type === 'MESSAGE_SENT') {
          const msg = data.payload;
          // Determine if I'm sender
          const isSender = msg.sender_id === user._id;
          
          let plaintext = '[Encrypted]';
          if (data.type === 'MESSAGE_SENT') {
            // I sent this, I know the plaintext locally (we store it in the message we just sent)
            // Actually, we add it in the send handler below. Skip re-adding from ack if we want.
            // For simplicity: the send handler adds the message, so we just return for MESSAGE_SENT.
            return;
          }

          // NEW_MESSAGE means I received it
          try {
            plaintext = decryptMessage(
              msg.encrypted_message,
              msg.iv,
              msg.auth_tag,
              msg.encrypted_session_key_user,
              privateKey
            );
          } catch (e) {
            plaintext = '[Decryption Error]';
          }

          addMessage({ ...msg, text: plaintext, isSender: false });
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    return () => {
      socket.close();
    };
  }, [receiverId]);

  const handleSend = () => {
    if (!text.trim()) return;
    if (!privateKey) {
      Alert.alert('Error', 'Private key not loaded. Please re-login with your private key.');
      return;
    }
    if (!adminPublicKey) {
      Alert.alert('Error', 'Admin public key not available. Cannot encrypt.');
      return;
    }

    try {
      const encrypted = encryptMessage(text, receiverPublicKey, adminPublicKey);

      const payload = {
        type: 'SEND_MESSAGE',
        payload: {
          receiver_id: receiverId,
          ...encrypted,
          mode,
        },
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));

        // Add to local messages immediately (optimistic)
        addMessage({
          _id: Date.now().toString(),
          sender_id: user._id,
          receiver_id: receiverId,
          text: text,
          isSender: true,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          isPrivate: mode === 'PRIVATE',
        });

        setText('');
      } else {
        Alert.alert('Error', 'WebSocket not connected');
      }
    } catch (err) {
      Alert.alert('Encryption Error', err.message);
    }
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const renderMessage = ({ item }) => {
    const isSender = item.isSender;
    return (
      <View className={`mx-4 my-1 ${isSender ? 'items-end' : 'items-start'}`}>
        <View
          className={`max-w-[80%] px-4 py-3 rounded-2xl ${
            isSender ? 'bg-[#6C63FF] rounded-br-sm' : 'bg-[#1A1A2E] rounded-bl-sm'
          }`}
        >
          <Text className={`${isSender ? 'text-white' : 'text-gray-200'} text-sm`}>{item.text}</Text>
          <View className="flex-row items-center mt-1">
            {item.isPrivate && (
              <Text className="text-[10px] text-yellow-400 mr-2">🔥 Private</Text>
            )}
            {!item.isPrivate && item.expires_at && (
              <Text className="text-[10px] text-[#8B8FAE]">⏳ {getTimeRemaining(item.expires_at)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0F0E17]"
    >
      {/* Header */}
      <View className="bg-[#1A1A2E] px-6 pt-14 pb-4">
        <Text className="text-white text-lg font-bold">{receiverEmail}</Text>
        <View className="flex-row items-center mt-2">
          {/* Mode Toggle */}
          <TouchableOpacity
            className={`px-3 py-1 rounded-full mr-2 ${mode === 'SECURE' ? 'bg-[#6C63FF]' : 'bg-[#16213E]'}`}
            onPress={() => setMode('SECURE')}
          >
            <Text className="text-white text-xs">🔒 Secure</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${mode === 'PRIVATE' ? 'bg-[#E94560]' : 'bg-[#16213E]'}`}
            onPress={() => setMode('PRIVATE')}
          >
            <Text className="text-white text-xs">🔥 Private</Text>
          </TouchableOpacity>
          <Text className="text-[#8B8FAE] text-[10px] ml-auto">
            {mode === 'SECURE' ? 'Messages stored for 7 days' : 'Messages are ephemeral'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item._id?.toString() || index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingVertical: 10 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <View className="bg-[#1A1A2E] px-4 py-3 flex-row items-center">
        <TextInput
          className="flex-1 bg-[#16213E] text-white px-4 py-3 rounded-2xl mr-3"
          placeholder="Type a message..."
          placeholderTextColor="#555"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          className="bg-[#6C63FF] w-12 h-12 rounded-full items-center justify-center"
          onPress={handleSend}
        >
          <Text className="text-white text-lg">↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;
