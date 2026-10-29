import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';

// Screens
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { SessionsListScreen } from '../screens/sessions/SessionsListScreen';
import { CreateSessionScreen } from '../screens/sessions/CreateSessionScreen';
import { SessionDetailScreen } from '../screens/sessions/SessionDetailScreen';
import { WalletScreen } from '../screens/wallet/WalletScreen';
import { MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
import { BlogScreen } from '../screens/blog/BlogScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ShowcaseScreen } from '../screens/showcase/ShowcaseScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';

// Icons
import { Compass, Users, Wallet, ShoppingBag, User } from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      sceneContainerStyle={{ paddingTop: insets.top }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          borderTopWidth: 1.5,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="SessionsTab"
        component={SessionsListScreen}
        options={{
          tabBarLabel: 'My Sessions',
          tabBarIcon: ({ color, size }) => <Users color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="MarketTab"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: 'Market & Blogs',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={22} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0B0F19' },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0B0F19' },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateSession"
              component={CreateSessionScreen}
              options={{ title: 'Host Session' }}
            />
            <Stack.Screen
              name="SessionDetail"
              component={SessionDetailScreen}
              options={{ title: 'Session Details' }}
            />
            <Stack.Screen
              name="Showcase"
              component={ShowcaseScreen}
              options={{ title: 'Showcase Portfolio' }}
            />
            <Stack.Screen
              name="Blog"
              component={BlogScreen}
              options={{ title: 'Campus Insights' }}
            />
            <Stack.Screen
              name="Wallet"
              component={WalletScreen}
              options={{ title: 'Time-Credit Wallet' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings & Reverification' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ title: 'Register Account' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
