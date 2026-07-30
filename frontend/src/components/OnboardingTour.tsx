import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

const steps: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Welcome to AdPulse",
    content:
      "Pay-per-impression micro-ads on Stellar Testnet. Advertisers escrow XLM; publishers earn on verified views.",
  },
  {
    target: '[data-tour="wallet"]',
    title: "Connect a wallet",
    content:
      "Use Freighter, xBull, LOBSTR, or another wallet via Stellar Wallets Kit. Switch Freighter to Testnet first.",
  },
  {
    target: '[data-tour="balance"]',
    title: "Check your XLM",
    content:
      "Your Testnet balance loads from Horizon. Use Friendbot if the account is empty.",
  },
  {
    target: '[data-tour="advertiser"]',
    title: "Fund a campaign",
    content:
      "Create a slot domain and escrow budget into the Ad Space contract. You'll get a tx hash on success.",
  },
  {
    target: '[data-tour="publisher"]',
    title: "Settle impressions",
    content:
      "Publishers settle view batches. Anti-fraud can reject/slash bots. Earnings update from on-chain events.",
  },
  {
    target: '[data-tour="cpm"]',
    title: "CPM calculator",
    content: "Model cost per thousand views before you commit escrow.",
  },
  {
    target: '[data-tour="preview"]',
    title: "Ad preview",
    content: "Preview the creative in a publisher banner frame.",
  },
];

type Props = {
  run: boolean;
  onDone: () => void;
};

export function OnboardingTour({ run, onDone }: Props) {
  const handle = (data: CallBackProps) => {
    const finished = data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;
    if (finished) onDone();
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      callback={handle}
      styles={{
        options: {
          primaryColor: "#e8a317",
          backgroundColor: "#161410",
          textColor: "#e8e0d0",
          arrowColor: "#161410",
          zIndex: 10000,
        },
      }}
    />
  );
}
