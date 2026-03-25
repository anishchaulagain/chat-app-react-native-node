import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuthStore from '../store/useAuthStore';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const setPrivateKey = useAuthStore((s) => s.setPrivateKey);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      // Save private key if provided (for testing with seeded users)
      if (privateKeyInput.trim()) {
        await AsyncStorage.setItem('privateKey', privateKeyInput.trim());
        setPrivateKey(privateKeyInput.trim());
      }
    } else {
      Alert.alert('Login Failed', result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0F0E17]"
    >
      <View className="flex-1 justify-center px-8">
        {/* Header */}
        <View className="items-center mb-10">
          <View className="w-16 h-16 rounded-2xl bg-[#6C63FF] items-center justify-center mb-4">
            <Text className="text-white text-2xl font-bold">🔐</Text>
          </View>
          <Text className="text-white text-3xl font-bold">SecureChat</Text>
          <Text className="text-[#8B8FAE] text-sm mt-2">End-to-End Encrypted Messaging</Text>
        </View>

        {/* Form */}
        <View className="bg-[#1A1A2E] rounded-2xl p-6 mb-4">
          <Text className="text-[#8B8FAE] text-xs uppercase tracking-widest mb-2">Email</Text>
          <TextInput
            className="bg-[#16213E] text-white px-4 py-3 rounded-xl mb-4"
            placeholder="user1@test.com"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text className="text-[#8B8FAE] text-xs uppercase tracking-widest mb-2">Password</Text>
          <TextInput
            className="bg-[#16213E] text-white px-4 py-3 rounded-xl mb-4"
            placeholder="••••••••"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Text className="text-[#8B8FAE] text-xs uppercase tracking-widest mb-2">RSA Private Key (for testing)</Text>
          <TextInput
            className="bg-[#16213E] text-white px-4 py-2 rounded-xl"
            placeholder="Paste seeded private key here..."
            placeholderTextColor="#555"
            value={privateKeyInput}
            onChangeText={setPrivateKeyInput}
            multiline
            numberOfLines={3}
            style={{ height: 70, textAlignVertical: 'top' }}
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity
          className="bg-[#6C63FF] py-4 rounded-xl items-center"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Admin Link */}
        <TouchableOpacity
          className="mt-6 items-center"
          onPress={() => navigation.navigate('AdminLogin')}
        >
          <Text className="text-[#6C63FF] text-sm">Admin Console →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
