import { createContext, useContext, type ReactNode } from "react";

export type AppWalletValue = {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sign: (xdr: string) => Promise<string>;
  error: string | null;
  balance: string | null;
  balanceLoading: boolean;
  refreshBalance: () => void;
};

const AppWalletContext = createContext<AppWalletValue | null>(null);

export function AppWalletProvider({
  value,
  children,
}: {
  value: AppWalletValue;
  children: ReactNode;
}) {
  return (
    <AppWalletContext.Provider value={value}>{children}</AppWalletContext.Provider>
  );
}

export function useAppWallet(): AppWalletValue {
  const ctx = useContext(AppWalletContext);
  if (!ctx) throw new Error("useAppWallet must be used within AppLayout");
  return ctx;
}
