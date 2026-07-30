type Props = {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  balance: string | null;
  balanceLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onFund?: () => void;
};

export function WalletBar({
  connected,
  connecting,
  address,
  balance,
  balanceLoading,
  onConnect,
  onDisconnect,
  onFund,
}: Props) {
  if (!connected || !address) {
    return (
      <div className="wallet-row" data-tour="wallet">
        <button
          className="btn"
          onClick={onConnect}
          disabled={connecting}
          data-tour="connect"
        >
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      </div>
    );
  }

  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;
  return (
    <div className="wallet-row" data-tour="wallet">
      <span className="addr" title={address}>
        {short}
      </span>
      <span className="balance-pill" data-tour="balance">
        {balanceLoading ? "…" : `${Number(balance ?? 0).toFixed(4)} XLM`}
      </span>
      {onFund ? (
        <button className="btn btn-ghost" onClick={onFund} type="button">
          Friendbot
        </button>
      ) : null}
      <button className="btn btn-danger" onClick={onDisconnect} type="button">
        Disconnect
      </button>
    </div>
  );
}
