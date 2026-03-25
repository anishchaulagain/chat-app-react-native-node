import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import config from '../config';
import { decryptAdminPrivateKey, decryptMessage } from '../crypto';

const AdminScreen = () => {
  const [masterKey, setMasterKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = async () => {
    if (masterKey.length !== 16) {
      Alert.alert('Error', 'Master key must be 16 digits');
      return;
    }
    setLoading(true);
    try {
      // 1. Login as admin to get encrypted private key + salt + JWT
      const loginRes = await axios.post(`${config.API_URL}/api/admin/login`, { master_key: masterKey });
      const { token, encrypted_admin_private_key, salt } = loginRes.data;

      // 2. Derive AES key from master key + salt and decrypt admin private key (CLIENT-SIDE)
      const adminPrivateKeyPem = decryptAdminPrivateKey(masterKey, salt, encrypted_admin_private_key);

      // 3. Fetch all encrypted messages
      const msgRes = await axios.get(`${config.API_URL}/api/admin/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 4. Decrypt each message using admin's private key + encrypted_session_key_admin
      const decrypted = msgRes.data.map((msg) => {
        try {
          const plaintext = decryptMessage(
            msg.encrypted_message,
            msg.iv,
            msg.auth_tag,
            msg.encrypted_session_key_admin,
            adminPrivateKeyPem
          );
          return {
            ...msg,
            text: plaintext,
            senderEmail: msg.sender_id?.email || 'Unknown',
            receiverEmail: msg.receiver_id?.email || 'Unknown',
          };
        } catch {
          return {
            ...msg,
            text: '[Decryption Failed]',
            senderEmail: msg.sender_id?.email || 'Unknown',
            receiverEmail: msg.receiver_id?.email || 'Unknown',
          };
        }
      });

      setMessages(decrypted);
      setUnlocked(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Unlock failed');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isExpired = new Date(item.expires_at) < new Date();
    return (
      <View className="bg-[#1A1A2E] mx-4 my-2 p-4 rounded-2xl">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-[#6C63FF] text-xs font-bold">{item.senderEmail} → {item.receiverEmail}</Text>
          {isExpired && (
            <View className="bg-[#E94560] px-2 py-0.5 rounded-full">
              <Text className="text-white text-[10px]">Expired</Text>
            </View>
          )}
        </View>
        <Text className="text-white text-sm">{item.text}</Text>
        <Text className="text-[#8B8FAE] text-[10px] mt-2">
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    );
  };

  if (!unlocked) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-[#0F0E17] justify-center px-8"
      >
        <View className="items-center mb-10">
          <View className="w-16 h-16 rounded-2xl bg-[#E94560] items-center justify-center mb-4">
            <Text className="text-white text-2xl">🛡️</Text>
          </View>
          <Text className="text-white text-2xl font-bold">Admin Console</Text>
          <Text className="text-[#8B8FAE] text-sm mt-2">Enter your 16-digit master key</Text>
        </View>

        <View className="bg-[#1A1A2E] rounded-2xl p-6 mb-6">
          <Text className="text-[#8B8FAE] text-xs uppercase tracking-widest mb-2">Master Key</Text>
          <TextInput
            className="bg-[#16213E] text-white text-center text-lg px-4 py-4 rounded-xl tracking-[4px]"
            placeholder="••••••••••••••••"
            placeholderTextColor="#555"
            value={masterKey}
            onChangeText={setMasterKey}
            maxLength={16}
            keyboardType="numeric"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          className="bg-[#E94560] py-4 rounded-xl items-center"
          onPress={handleUnlock}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Unlock & Decrypt</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View className="flex-1 bg-[#0F0E17]">
      <View className="bg-[#1A1A2E] px-6 pt-14 pb-4">
        <Text className="text-white text-xl font-bold">🛡️ Admin Console</Text>
        <Text className="text-[#8B8FAE] text-xs mt-1">{messages.length} messages decrypted</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => item._id?.toString() || index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingVertical: 10 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-[#8B8FAE]">No messages found</Text>
          </View>
        }
      />
    </View>
  );
};

export default AdminScreen;
