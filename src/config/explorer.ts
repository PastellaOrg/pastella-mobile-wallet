/**
 * Pastella Wallet Configuration
 */

export const config = {
  name: 'Pastella',
  ticker: 'PAS',
  decimals: 8,
  transactionExplorerUrl: 'https://explorer.pastella.com/transaction/',

  // Social links
  websiteUrl: 'https://pastella.org',
  githubUrl: 'https://github.com/PastellaOrg/pastella-mobile-wallet',
  discordUrl: 'https://discord.gg/pastella',
  twitterUrl: 'https://x.com/pastellaorg',

  // Staking configuration
  staking: {
    lockPeriods: [30, 90, 180, 365], // days
    annualRewardRates: [2, 8, 18, 50], // percentage
  },
};
