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
        className="flex-1 bg-[#f8f9ff] justify-center px-8"
      >
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-3xl bg-[#ffebee] items-center justify-center mb-6 border border-[#ffcdd2]">
            <Text className="text-3xl">🛡️</Text>
          </View>
          <Text className="text-[#0d1c2e] text-3xl font-bold tracking-tight">Admin Console</Text>
          <Text className="text-[#454652] text-base mt-2 text-center">Enter your 16-digit master key to decrypt the vault</Text>
        </View>

        <View className="bg-white rounded-2xl p-6 mb-8 border border-[#dee0ff] shadow-sm">
          <Text className="text-[#0d1c2e] text-sm font-semibold mb-4 text-center uppercase tracking-widest">Master Key</Text>
          <TextInput
            className="bg-[#f8f9ff] text-[#0d1c2e] text-center text-3xl font-light px-4 py-5 rounded-2xl tracking-[6px] border border-[#dee0ff] focus:border-[#e91e63]"
            placeholder="••••••••••••••••"
            placeholderTextColor="#c5c5d4"
            value={masterKey}
            onChangeText={setMasterKey}
            maxLength={16}
            keyboardType="numeric"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          className="bg-[#e91e63] py-4 rounded-xl items-center shadow-lg shadow-pink-100"
          onPress={handleUnlock}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Unlock & Decrypt</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity className="mt-8 items-center" onPress={() => Alert.alert('Security Info', 'All decryption happens locally on your device.')}>
          <Text className="text-[#757684] text-xs font-medium">Zero-Knowledge Decryption System</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View className="flex-1 bg-[#f8f9ff]">
      <View className="bg-white px-6 pt-16 pb-6 border-b border-[#dee0ff]">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-[#0d1c2e] text-2xl font-bold tracking-tight">Shield Dashboard</Text>
            <Text className="text-[#e91e63] text-xs font-bold mt-1 uppercase tracking-wider">{messages.length} Active Records Unlocked</Text>
          </View>
          <TouchableOpacity onPress={() => setUnlocked(false)} className="w-10 h-10 rounded-full bg-[#eff4ff] items-center justify-center border border-[#dee0ff]">
            <Text className="text-[#24389c] text-xs font-bold">GT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => item._id?.toString() || index.toString()}
        renderItem={({ item }) => {
          const isExpired = new Date(item.expires_at) < new Date();
          return (
            <View className="bg-white mx-6 my-2 p-5 rounded-2xl border border-[#eff4ff] shadow-sm">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-[#eff4ff] items-center justify-center mr-2">
                    <Text className="text-[#24389c] text-xs font-bold">{item.senderEmail[0].toUpperCase()}</Text>
                  </View>
                  <Text className="text-[#0d1c2e] text-xs font-bold">{item.senderEmail.split('@')[0]}</Text>
                  <Text className="text-[#757684] text-xs mx-2">→</Text>
                  <Text className="text-[#0d1c2e] text-xs font-bold">{item.receiverEmail.split('@')[0]}</Text>
                </View>
                {isExpired && (
                  <View className="bg-[#ffebee] px-2 py-1 rounded-md border border-[#ffcdd2]">
                    <Text className="text-[#e91e63] text-[9px] font-bold uppercase">Expired</Text>
                  </View>
                )}
              </View>
              <Text className="text-[#0d1c2e] text-[15px] leading-5">{item.text}</Text>
              <View className="flex-row justify-between items-center mt-4">
                <Text className="text-[#757684] text-[10px] font-medium font-mono">
                  ID: {item._id.substring(0, 8)}...
                </Text>
                <Text className="text-[#757684] text-[10px]">
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={{ paddingVertical: 15 }}
        ListEmptyComponent={
          <View className="items-center mt-20 px-10">
            <Text className="text-[#757684] text-center">No messages have been intercepted or decrypted.</Text>
          </View>
        }
      />
    </View>
  );
};

export default AdminScreen;
