import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { initDatabase } from './src/db/database';
import { useSubscriptionStore } from './src/store/subscriptionStore';

import { TimerScreen } from './src/screens/TimerScreen';
import { TimesheetScreen } from './src/screens/TimesheetScreen';
import { InvoiceListScreen } from './src/screens/InvoiceListScreen';
import { InvoiceBuilderScreen } from './src/screens/InvoiceBuilderScreen';
import { ClientsScreen } from './src/screens/ClientsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const InvoiceStack = createNativeStackNavigator();

function InvoiceStackNavigator() {
  return (
    <InvoiceStack.Navigator screenOptions={{ headerShown: false }}>
      <InvoiceStack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <InvoiceStack.Screen name="InvoiceBuilder" component={InvoiceBuilderScreen} />
    </InvoiceStack.Navigator>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const { initRevenueCat } = useSubscriptionStore();

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
        setDbReady(true);
        initRevenueCat();
      } catch (e) {
        console.warn('Initialization error:', e);
        setDbReady(true);
      }
    }
    prepare();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: '#2563EB',
            tabBarInactiveTintColor: '#64748B',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#E2E8F0',
              paddingBottom: 6,
              paddingTop: 6,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
            tabBarIcon: ({ color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'help';
              if (route.name === 'Timer') iconName = 'timer-outline';
              else if (route.name === 'Timesheets') iconName = 'calendar-outline';
              else if (route.name === 'InvoicesTab') iconName = 'document-text-outline';
              else if (route.name === 'Clients') iconName = 'people-outline';
              else if (route.name === 'Settings') iconName = 'settings-outline';

              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Timer" component={TimerScreen} />
          <Tab.Screen name="Timesheets" component={TimesheetScreen} />
          <Tab.Screen
            name="InvoicesTab"
            component={InvoiceStackNavigator}
            options={{ tabBarLabel: 'Invoices' }}
          />
          <Tab.Screen name="Clients" component={ClientsScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
