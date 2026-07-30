export const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL || "https://horizon-testnet.stellar.org";
export const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";
export const FRIENDBOT_URL =
  import.meta.env.VITE_FRIENDBOT_URL || "https://friendbot.stellar.org";
export const AD_SPACE_CONTRACT =
  import.meta.env.VITE_AD_SPACE_CONTRACT || "";
export const ANTI_FRAUD_CONTRACT =
  import.meta.env.VITE_ANTI_FRAUD_CONTRACT || "";
export const NATIVE_SAC = import.meta.env.VITE_NATIVE_SAC || "";
export const ESCROW_ACCOUNT = import.meta.env.VITE_ESCROW_ACCOUNT || "";

export const EXPERT_TX = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const EXPERT_CONTRACT = (id: string) =>
  `https://stellar.expert/explorer/testnet/contract/${id}`;
export const EXPERT_ACCOUNT = (id: string) =>
  `https://stellar.expert/explorer/testnet/account/${id}`;
