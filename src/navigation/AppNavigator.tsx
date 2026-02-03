import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/Welcome/WelcomeScreen';
import CreateOrImportScreen from '../screens/Welcome/CreateOrImportScreen';
import CreateWalletScreen from '../screens/CreateWallet/CreateWalletScreen';
import ImportWalletScreen from '../screens/ImportWallet/ImportWalletScreen';
import BackupMnemonicScreen from '../screens/BackupMnemonic/BackupMnemonicScreen';
import SetupPinScreen from '../screens/SetupPin/SetupPinScreen';
import WalletHomeScreen from '../screens/WalletHome/WalletHomeScreen';
import SendScreen from '../screens/Tabs/SendScreen';
import ReceiveScreen from '../screens/Tabs/ReceiveScreen';
import AddressBookScreen from '../screens/Tabs/AddressBookScreen';
import StakingScreen from '../screens/Staking/StakingScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import { colors } from '../theme/colors';

const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTintColor: colors.text,
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 18,
  },
  cardStyle: {
    backgroundColor: colors.background,
  },
};

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={screenOptions}
      headerMode="none"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateOrImport" component={CreateOrImportScreen} />
      <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
      <Stack.Screen name="ImportWallet" component={ImportWalletScreen} />
      <Stack.Screen name="BackupMnemonic" component={BackupMnemonicScreen} />
      <Stack.Screen name="SetupPin" component={SetupPinScreen} />
      <Stack.Screen name="WalletHome" component={WalletHomeScreen} />
      <Stack.Screen name="Send" component={SendScreen} />
      <Stack.Screen name="Receive" component={ReceiveScreen} />
      <Stack.Screen name="Address Book" component={AddressBookScreen} />
      <Stack.Screen name="Staking" component={StakingScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
