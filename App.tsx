import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Mock/Your Screens
import LanguageScreen from './src/screens/Language/LanguageScreen';
import WelcomeScreen from './src/screens/Welcome/WelcomeScreen';
import CreateOrImportScreen from './src/screens/Welcome/CreateOrImportScreen';
import CreateWalletScreen from './src/screens/CreateWallet/CreateWalletScreen';
import ImportWalletScreen from './src/screens/ImportWallet/ImportWalletScreen';
import ConfirmImportScreen from './src/screens/ConfirmImport/ConfirmImportScreen';
import BackupMnemonicScreen from './src/screens/BackupMnemonic/BackupMnemonicScreen';
import SetupPinScreen from './src/screens/SetupPin/SetupPinScreen';
import ChangePinScreen from './src/screens/ChangePin/ChangePinScreen';
import UnlockScreen from './src/screens/Unlock/UnlockScreen';
import WalletHomeScreen from './src/screens/WalletHome/WalletHomeScreen';
import SettingsScreen from './src/screens/Settings/SettingsScreen';
import NodesScreen from './src/screens/Nodes/NodesScreen';
import SendScreen from './src/screens/Tabs/SendScreen';
import ReceiveScreen from './src/screens/Tabs/ReceiveScreen';
import AddressBookScreen from './src/screens/Tabs/AddressBookScreen';
import StakingScreen from './src/screens/Staking/StakingScreen';
import TransactionDetailsScreen from './src/screens/TransactionDetails/TransactionDetailsScreen';
import AboutScreen from './src/screens/About/AboutScreen';

import { CustomTabBar } from './src/components/CustomTabBar';
import { ToastContainer } from './src/components/shared';
import { colors } from './src/theme/colors';
import { SecureStorage } from './src/services/secureStorage';
import LanguageProvider from './src/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={WalletHomeScreen} />
      <Tab.Screen name="Send" component={SendScreen} />
      <Tab.Screen name="Receive" component={ReceiveScreen} />
      <Tab.Screen name="Address Book" component={AddressBookScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [hasLanguage, setHasLanguage] = useState(false);

  useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    // Check if language is set
    const langSet = await AsyncStorage.getItem('@pastella_language');
    setHasLanguage(!!langSet);

    // Check if wallet exists
    const walletExists = await SecureStorage.hasWallet();
    setHasWallet(walletExists);

    setIsReady(true);
  };

  const getInitialRouteName = () => {
    if (!hasLanguage) return 'Language';
    if (hasWallet) return 'Unlock';
    return 'Welcome';
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <LanguageProvider>
        <ToastContainer>
          <NavigationContainer>
          <Stack.Navigator
            initialRouteName={getInitialRouteName()}
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              ...Platform.select({
                web: {
                  animation: 'fade',
                  animationDuration: 300,
                },
                default: {
                  animation: 'default',
                  animationDuration: 100,
                  gestureEnabled: true,
                },
              }),
            }}
          >
            <Stack.Screen name="Language" component={LanguageScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="CreateOrImport" component={CreateOrImportScreen} />
            <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
            <Stack.Screen name="ImportWallet" component={ImportWalletScreen} />
            <Stack.Screen name="ConfirmImport" component={ConfirmImportScreen} />
            <Stack.Screen name="BackupMnemonic" component={BackupMnemonicScreen} />
            <Stack.Screen name="SetupPin" component={SetupPinScreen} />
            <Stack.Screen name="ChangePin" component={ChangePinScreen} />
            <Stack.Screen name="Unlock" component={UnlockScreen} />

            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen name="Nodes" component={NodesScreen} />
            <Stack.Screen
              name="TransactionDetails"
              component={TransactionDetailsScreen}
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="Staking"
              component={StakingScreen}
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen
              name="About"
              component={AboutScreen}
              options={{
                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
                headerShown: false,
                ...Platform.select({
                  ios: {
                    contentStyle: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
                  },
                  android: {
                    contentStyle: { backgroundColor: colors.background },
                  },
                }),
              }}
            />
          </Stack.Navigator>
          <StatusBar style="light" />
        </NavigationContainer>
        </ToastContainer>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});