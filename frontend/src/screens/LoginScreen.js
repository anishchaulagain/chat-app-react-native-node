import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuthStore from '../store/useAuthStore';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      // Session loaded automatically with private key from response
    } else {
      Alert.alert('Login Failed', result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#f8f9ff]"
    >
      <View className="flex-1 justify-center px-8">
        {/* Header */}
        <View className="mb-12">
          <Text className="text-[#0d1c2e] text-4xl font-bold tracking-tight">Welcome Back</Text>
          <Text className="text-[#454652] text-base mt-2">Sign in to your secure account</Text>
        </View>

        {/* Form */}
        <View className="mb-8">
          <View className="mb-6">
            <Text className="text-[#0d1c2e] text-sm font-medium mb-2">Email Address</Text>
            <TextInput
              className="bg-white text-[#0d1c2e] px-4 py-4 rounded-xl border border-[#c5c5d4] focus:border-[#24389c]"
              placeholder="name@example.com"
              placeholderTextColor="#757684"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View className="mb-2">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[#0d1c2e] text-sm font-medium">Password</Text>
              <TouchableOpacity>
                <Text className="text-[#24389c] text-sm font-medium">Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-white text-[#0d1c2e] px-4 py-4 rounded-xl border border-[#c5c5d4] focus:border-[#24389c]"
              placeholder="••••••••"
              placeholderTextColor="#757684"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          className="bg-[#24389c] py-4 rounded-xl items-center shadow-lg shadow-indigo-200"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View className="mt-8 flex-row justify-center items-center">
          <Text className="text-[#454652] text-sm">Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text className="text-[#24389c] text-sm font-bold">Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Link - Subtle */}
        <TouchableOpacity
          className="mt-12 items-center"
          onPress={() => navigation.navigate('AdminLogin')}
        >
          <Text className="text-[#757684] text-xs uppercase tracking-widest">Admin Console</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
