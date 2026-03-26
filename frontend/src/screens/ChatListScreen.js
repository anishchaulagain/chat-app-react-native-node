import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import axios from 'axios';
import config from '../config';
import useAuthStore from '../store/useAuthStore';
import useChatStore from '../store/useChatStore';

const ChatListScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setAdminPublicKey = useChatStore((s) => s.setAdminPublicKey);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${config.API_URL}/api/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAdminPubKey = async () => {
      try {
        const res = await axios.get(`${config.API_URL}/api/admin/config`);
        setAdminPublicKey(res.data.admin_public_key);
      } catch (err) {
        console.error('Failed to fetch admin config', err);
      }
    };

    fetchUsers();
    fetchAdminPubKey();
  }, []);
  
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item }) => (
    <TouchableOpacity
      className="bg-[#1A1A2E] mx-4 my-2 p-4 rounded-2xl flex-row items-center"
      onPress={() => navigation.navigate('Chat', { receiverId: item._id, receiverEmail: item.email, receiverPublicKey: item.public_key })}
    >
      <View className="w-12 h-12 rounded-full bg-[#6C63FF] items-center justify-center mr-4">
        <Text className="text-white text-lg font-bold">{item.email[0].toUpperCase()}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white text-base font-semibold">{item.email}</Text>
        <Text className="text-[#8B8FAE] text-xs mt-1">Tap to chat securely</Text>
      </View>
      <View className="w-3 h-3 rounded-full bg-green-400" />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-[#f8f9ff]">
      {/* Header */}
      <View className="bg-white px-6 pt-16 pb-6 shadow-sm">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-[#0d1c2e] text-3xl font-bold tracking-tight">Messages</Text>
            <View className="flex-row items-center mt-1">
              <View className="w-2 h-2 rounded-full bg-indigo-500 mr-2" />
              <Text className="text-[#454652] text-xs font-medium uppercase tracking-wider">Secure Vault Active</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={logout} 
            className="w-10 h-10 rounded-full bg-[#eff4ff] items-center justify-center border border-[#dee0ff]"
          >
            <Text className="text-[#24389c] text-xs font-bold">GT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-6 py-4">
        <View className="flex-row items-center bg-white px-4 py-3 rounded-2xl border border-[#dee0ff] shadow-sm">
          <Text className="mr-3 text-lg">🔍</Text>
          <TextInput
            className="flex-1 text-[#0d1c2e] text-base"
            placeholder="Search conversations..."
            placeholderTextColor="#757684"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Users List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#24389c" size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white mx-6 my-2 p-4 rounded-2xl flex-row items-center border border-[#eff4ff] shadow-sm active:bg-[#f8f9ff]"
              onPress={() => navigation.navigate('Chat', { receiverId: item._id, receiverEmail: item.email, receiverPublicKey: item.public_key })}
            >
              <View className="w-14 h-14 rounded-2xl bg-[#eff4ff] items-center justify-center mr-4 border border-[#dee0ff]">
                <Text className="text-[#24389c] text-xl font-bold">{item.email[0].toUpperCase()}</Text>
                <View className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00c853] border-2 border-white" />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-[#0d1c2e] text-lg font-bold" numberOfLines={1}>{item.email.split('@')[0]}</Text>
                  <Text className="text-[#757684] text-[10px] font-medium uppercase">Now</Text>
                </View>
                <Text className="text-[#454652] text-sm" numberOfLines={1}>Tap to open secure channel</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListEmptyComponent={
            <View className="items-center mt-20 px-10">
              <Text className="text-[#757684] text-center text-base">No active conversations found matching your search.</Text>
            </View>
          }
        />
      )}
      
      {/* Floating Action Button - New Chat */}
      <TouchableOpacity 
        className="absolute bottom-10 right-8 w-16 h-16 rounded-full bg-[#24389c] items-center justify-center shadow-2xl shadow-indigo-500"
        onPress={() => { /* Opne new chat flow */}}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChatListScreen;
