/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HORIZON_URL: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_NETWORK_PASSPHRASE: string;
  readonly VITE_FRIENDBOT_URL: string;
  readonly VITE_AD_SPACE_CONTRACT: string;
  readonly VITE_ANTI_FRAUD_CONTRACT: string;
  readonly VITE_NATIVE_SAC: string;
  readonly VITE_ESCROW_ACCOUNT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
