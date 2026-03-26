import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import AdminScreen from './src/screens/AdminScreen';
import useAuthStore from './src/store/useAuthStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    loadSession();
  }, []);

  if (isLoading) {
    return null; // splash/loading
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f8f9ff' },
          animation: 'slide_from_right',
        }}
      >
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="AdminLogin" component={AdminScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="AdminLogin" component={AdminScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
