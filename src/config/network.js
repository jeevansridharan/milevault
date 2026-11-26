export const BCH_NETWORK = import.meta.env.VITE_BCH_NETWORK === 'chipnet' ? 'chipnet' : 'mainnet'
export const IS_MAINNET = BCH_NETWORK === 'mainnet'
const requestedFundingCap = Number(import.meta.env.VITE_MAX_FUND_BCH || '0.002')
export const MAX_FUND_BCH = Number.isFinite(requestedFundingCap) && requestedFundingCap > 0 ? Math.min(requestedFundingCap, 0.002) : 0.002
export const GOV_TOKEN_CATEGORY_ID = import.meta.env.VITE_GOV_TOKEN_CATEGORY_ID || ''
export const EXPLORER_BASE_URL = IS_MAINNET
  ? 'https://blockchair.com/bitcoin-cash'
  : 'https://chipnet.imaginary.cash'
export const explorerTxUrl = (txid) => IS_MAINNET
  ? `https://blockchair.com/bitcoin-cash/transaction/${txid}`
  : `https://chipnet.imaginary.cash/tx/${txid}`
export const explorerAddressUrl = (address) => IS_MAINNET
  ? `https://blockchair.com/bitcoin-cash/address/${address}`
  : `https://chipnet.imaginary.cash/address/${address}`
