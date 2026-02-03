/**
 * Supported languages in the app
 */
export type SupportedLanguage = 'en' | 'nl' | 'de';

/**
 * Language information for display
 */
export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Translation keys structure
 * This ensures all translation keys are type-safe
 */
export interface Translations {
  // Language selection
  language: {
    selectTitle: string;
    selectSubtitle: string;
    continue: string;
  };

  // Welcome screens
  welcome: {
    title: string;
    subtitle: string;
    createWallet: string;
    importWallet: string;
  };

  createOrImport: {
    title: string;
    subtitle: string;
    createNew: string;
    createDesc: string;
    import: string;
    importDesc: string;
    securityTitle: string;
    securityDesc: string;
  };

  // Wallet creation
  createWallet: {
    title: string;
    warning: string;
    walletAddress: string;
    generating: string;
    continue: string;
    generateNew: string;
  };

  importWallet: {
    title: string;
    subtitle: string;
    mnemonicTab: string;
    privateKeyTab: string;
    mnemonicLabel: string;
    mnemonicPlaceholder: string;
    mnemonicHint: string;
    pasteClipboard: string;
    validating: string;
    enterMnemonic: string;
    validMnemonic: string;
    wordCountError: string;
    invalidMnemonic: string;
    privateKeyLabel: string;
    privateKeyPlaceholder: string;
    privateKeyHint: string;
    invalidPrivateKey: string;
    validPrivateKey: string;
    warning: string;
    importBtn: string;
    cancel: string;
  };

  confirmImport: {
    title: string;
    subtitle: string;
    walletInfo: string;
    importMethod: string;
    mnemonicPhrase: string;
    privateKey: string;
    walletAddress: string;
    syncConfig: string;
    scanHeight: string;
    scanHeightHint: string;
    fullSync: string;
    warning: string;
    importing: string;
    confirmBtn: string;
    goBack: string;
    copied: string;
    copyMessage: string;
    invalidHeight: string;
    invalidHeightMsg: string;
    importFailed: string;
    importFailedMsg: string;
  };

  // Security screens
  setupPin: {
    createPin: string;
    confirmPin: string;
    createSubtitle: string;
    confirmSubtitle: string;
    enterPin: string;
    reenterPin: string;
    createHint: string;
    confirmHint: string;
    back: string;
    securing: string;
    pinError: string;
    mismatchError: string;
    saveError: string;
  };

  changePin: {
    verifyTitle: string;
    newTitle: string;
    confirmTitle: string;
    verifySubtitle: string;
    newSubtitle: string;
    confirmSubtitle: string;
    verifyHint: string;
    newHint: string;
    confirmHint: string;
    verifyInfo: string;
    newInfo: string;
    confirmInfo: string;
    verifying: string;
    back: string;
    incorrectError: string;
    updateError: string;
  };

  unlock: {
    title: string;
    subtitle: string;
    error: string;
    hint: string;
  };

  backupMnemonic: {
    verifyPin: string;
    pinSubtitle: string;
    title: string;
    subtitleDisplay: string;
    subtitleView: string;
    warning: string;
    recoveryPhrase: string;
    checklistTitle: string;
    checklistWritten: string;
    checklistStored: string;
    checklistScreenshots: string;
    checklistShared: string;
    checklistCloud: string;
    backedUpBtn: string;
    doneBtn: string;
    back: string;
    hint: string;
    error: string;
  };

  // Wallet home
  walletHome: {
    syncing: string;
    synced: string;
    starting: string;
    balance: string;
    locked: string;
    stakingLocked: string;
    buy: string;
    noTransactions: string;
    noTransactionsSub: string;
    incoming: string;
    outgoing: string;
    staking: string;
    coinbase: string;
    confirmed: string;
    pending: string;
    pendingCount: string;
    block: string;
    timeAgo: string;
  },

  // Navigation
  nav: {
    home: string;
    send: string;
    receive: string;
    history: string;
    settings: string;
    addressBook: string;
  };

  // Send screen
  send: {
    title: string;
    subtitle: string;
    availableBalance: string;
    maxSpendable: string;
    recipientAddress: string;
    addressPlaceholder: string;
    invalidAddress: string;
    amount: string;
    max: string;
    placeholder: string;
    networkFee: string;
    low: string;
    medium: string;
    high: string;
    slow: string;
    standard: string;
    fast: string;
    sendBtn: string;
    confirmTitle: string;
    sendLabel: string;
    toLabel: string;
    feeLabel: string;
    sentAlert: string;
    failedAlert: string;
    noAddress: string;
    noAmount: string;
    invalidAmount: string;
    insufficientFunds: string;
    cameraPermission: string;
    cameraPermissionDenied: string;
    scanQr: string;
    scanInstructions: string;
    clipboardEmpty: string;
    noAddressClipboard: string;
    error: string;
    clipboardError: string;
  };

  // Receive screen
  receive: {
    title: string;
    subtitle: string;
    yourAddress: string;
    copyAddress: string;
    share: string;
    copied: string;
    shareTitle: string;
    infoTitle: string;
    infoText: string;
  };

  // Address book
  addressBook: {
    title: string;
    subtitle: string;
    addNew: string;
    noContacts: string;
    noContactsSub: string;
    editContact: string;
    addContact: string;
    name: string;
    namePlaceholder: string;
    address: string;
    addressPlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    invalidAddress: string;
    update: string;
    save: string;
    delete: string;
    deleteTitle: string;
    deleteMessage: string;
    noName: string;
    noAddress: string;
    scanQr: string;
    scanInstructions: string;
    permissionRequired: string;
    cameraPermission: string;
    loadingError: string;
    saveError: string;
    deleteError: string;
    copied: string;
    copyMessage: string;
    clipboardEmpty: string;
    noAddressClipboard: string;
    error: string;
    clipboardError: string;
  };

  // History screen
  history: {
    title: string;
    subtitle: string;
  };

  // Nodes screen
  nodes: {
    title: string;
    checking: string;
    https: string;
    nonSsl: string;
    synced: string;
    syncing: string;
    ping: string;
    offline: string;
    offlineWarning: string;
    switched: string;
  };

  // About screen
  about: {
    title: string;
    appName: string;
    general: string;
    version: string;
    support: string;
    website: string;
    github: string;
    community: string;
    discord: string;
    twitter: string;
    footer: string;
  };

  // Transaction details
  transactionDetails: {
    title: string;
    received: string;
    sent: string;
    stakingDeposit: string;
    miningReward: string;
    transaction: string;
    confirmed: string;
    pending: string;
    confirmation: string;
    confirmations: string;
    txInfo: string;
    txHash: string;
    blockHeight: string;
    timestamp: string;
    timeAgo: string;
    status: string;
    type: string;
    amount: string;
    addresses: string;
    sender: string;
    recipient: string;
    you: string;
    copyHash: string;
    viewExplorer: string;
    explorerAlertTitle: string;
    explorerAlertMsg: string;
    cancel: string;
    open: string;
    explorerUrl: string;
    copied: string;
  };

  // Staking (already exists, keeping it)
  staking: {
    title: string;
    subtitle: string;
    earnRewards: string;
    availableBalance: string;
    newStake: string;
    pendingStakes: string;
    networkStakes: string;
    completedStakes: string;
    noActiveStakes: string;
    startStaking: string;
    active: string;
    done: string;
    preparing: string;
    readyToFinalize: string;
    pending: string;
    waitingForOutputs: string;
    outputsReady: string;
    waitingForConfirmation: string;
    finalizeStake: string;
    rewards: string;
    daily: string;
    dailyROI: string;
    totalAtMaturity: string;
    blocks: string;
    blocksLeft: string;
    unlocksAt: string;
    unlocked: string;
    unlocking: string;
    createNewStake: string;
    processingStake: string;
    amountLabel: string;
    feeLabel: string;
    maxStake: string;
    lockDuration: string;
    days: string;
    apy: string;
    cancel: string;
    stake: string;
    max: string;
    durationInfo: string;
    howStakingWorks: string;
    whatIsStaking: string;
    whatIsStakingDesc: string;
    howRewardsWork: string;
    rewardsBased: string;
    stakeAmount: string;
    lockDurationLonger: string;
    annualRate: string;
    rewardsAccumulate: string;
    lockPeriods: string;
    lockPeriodsDesc: string;
    importantNotes: string;
    noEarlyUnstake: string;
    rewardsCompound: string;
    stakingFee: string;
    gotIt: string;
    errorLoadingStakes: string;
    loadingStakingData: string;
    stakingInfoText: string;
    insufficientBalance: string;
    includingFee: string;
    enterValidAmount: string;
    selectDuration: string;
    preparingOutputs: string;
    creatingStakingTx: string;
    stakingTxSent: string;
  };

  // Settings
  settings: {
    title: string;
    wallet: string;
    changePin: string;
    changePinDesc: string;
    hideBalance: string;
    hideBalanceDesc: string;
    backupMnemonic: string;
    backupMnemonicDesc: string;
    preferences: string;
    language: string;
    changeLanguage: string;
    notifications: string;
    pushNotifications: string;
    nodes: string;
    selectNode: string;
    information: string;
    about: string;
    version: string;
    advanced: string;
    resyncFromGenesis: string;
    resyncFromGenesisDesc: string;
    resyncFromHeight: string;
    resyncFromHeightDesc: string;
    dangerZone: string;
    lockWallet: string;
    lockWalletDesc: string;
    deleteWallet: string;
    deleteWalletDesc: string;
    resyncMessage: string;
    resyncMessageGenesis: string;
    resync: string;
    deleteWalletTitle: string;
    deleteWalletMessage: string;
    delete: string;
  };

  // Common
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    close: string;
    done: string;
    yes: string;
    no: string;
    ok: string;
    fee: string;
    available: string;
    back: string;
    continue: string;
    copied: string;
  };

  // Time formats
  time: {
    secondsAgo: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    monthsAgo: string;
    justNow: string;
  };
}

/**
 * Get all available languages
 */
export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: 'us.svg' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: 'nl.svg' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: 'de.svg' },
];
