import React from 'react';
import { View, ActivityIndicator } from 'react-native';
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

function TabBarIconWithIndicator({
  icon: IconComponent,
  focused,
  color,
}: {
  icon: any;
  focused: boolean;
  color: string;
}) {
  return (
    <View
      style={{
        width: 64,
        height: 32,
        borderRadius: 16,
        backgroundColor: focused ? '#D8F3E5' : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
      }}
    >
      <IconComponent color={focused ? '#0E6245' : '#6B7280'} size={20} strokeWidth={focused ? 2.3 : 1.8} />
    </View>
  );
}

function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      sceneContainerStyle={{ paddingTop: insets.top, backgroundColor: '#F8FAF9' }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8EFEA',
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: '#0E6245',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithIndicator icon={Compass} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SessionsTab"
        component={SessionsListScreen}
        options={{
          tabBarLabel: 'My sessions',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithIndicator icon={Users} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MarketTab"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithIndicator icon={ShoppingBag} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithIndicator icon={User} focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAF9', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0E6245" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#F8FAF9' },
          headerTintColor: '#111827',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F8FAF9' },
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
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SessionDetail"
              component={SessionDetailScreen}
              options={{ headerShown: false }}
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
