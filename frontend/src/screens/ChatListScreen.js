import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import config from '../config';
import useAuthStore from '../store/useAuthStore';
import useChatStore from '../store/useChatStore';

const ChatListScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
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
    <View className="flex-1 bg-[#0F0E17]">
      {/* Header */}
      <View className="bg-[#1A1A2E] px-6 pt-14 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-white text-2xl font-bold">Chats</Text>
          <Text className="text-[#8B8FAE] text-xs mt-1">End-to-End Encrypted</Text>
        </View>
        <TouchableOpacity onPress={logout} className="bg-[#E94560] px-4 py-2 rounded-xl">
          <Text className="text-white text-xs font-bold">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-[#8B8FAE]">No users available</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ChatListScreen;
