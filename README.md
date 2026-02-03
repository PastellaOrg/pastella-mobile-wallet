# Pastella Wallet

A secure, modern mobile wallet for the Pastella (PAS) cryptocurrency, built with React Native and Expo.

## Screenshot

<img src="./screenshot.png" alt="Pastella Wallet Screenshot" width="400">

## Features

- **Wallet Creation**: Generate new 25-word mnemonic wallets or import existing ones
- **Secure Storage**: Mnemonic phrases and private keys stored locally with PIN protection
- **Send & Receive**: Send transactions with address validation, QR scanning, and fee tier selection
- **Transaction History**: View all incoming, outgoing, staking, and coinbase transactions
- **Staking**: Stake PAS coins with duration selection, track active stakes, and claim rewards
- **Wallet Sync**: Automatic blockchain scanning and balance tracking
- **Address Book**: Save and manage frequently used addresses
- **Node Management**: Select and switch between multiple daemon nodes
- **Multi-language**: English, Dutch, and German support

## Tech Stack

- React Native with TypeScript
- Expo for development and building
- React Navigation for navigation
- Ed25519 for cryptographic operations
- AsyncStorage for secure local storage

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android development)

### Installation

1. Navigate to the wallet directory:
   ```bash
   cd pastella-mobile-wallet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

#### Android Emulator

1. Start Android Studio and create an Android Virtual Device (AVD)

2. Run the app:
   ```bash
   npm run android
   ```

#### Physical Android Device

1. Enable USB Debugging on your phone
2. Connect via USB
3. Run:
   ```bash
   npm run android
   ```

### Building for Production

#### Android APK

```bash
expo build:android
```

This will create an APK file that can be installed on any Android device.

## Contributing

This wallet is part of the Pastella ecosystem. Contributions welcome!

## License

MIT License - See LICENSE file for details
