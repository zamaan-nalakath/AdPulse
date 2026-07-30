import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

const steps: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Welcome to AdPulse",
    content:
      "Pay-per-impression micro-ads on Stellar Testnet. Advertisers escrow XLM; publishers earn on verified views. Use the Overview hub or the dual nav to move between roles.",
  },
  {
    target: '[data-tour="wallet"]',
    title: "Connect a wallet",
    content:
      "Use Freighter, xBull, LOBSTR, or another wallet via Stellar Wallets Kit. Switch Freighter to Testnet first.",
  },
  {
    target: '[data-tour="nav-hub"]',
    title: "Overview hub",
    content:
      "Start here for a dual-role map — campaigns, slots, impressions, earnings, fraud, and activity. Balance appears next to the wallet after you connect.",
  },
  {
    target: '[data-tour="advertiser"]',
    title: "Advertiser tools",
    content:
      "Campaigns escrow budget; Slots register domains; CPM models cost; Fraud shows slash paths.",
  },
  {
    target: '[data-tour="nav-publisher"]',
    title: "Publisher tools",
    content:
      "Earnings for withdraw, Impressions to settle batches, Activity for the live event feed.",
  },
  {
    target: '[data-tour="nav-cpm"]',
    title: "CPM lab",
    content:
      "Model cost per thousand views and preview creatives before you commit escrow.",
  },
  {
    target: '[data-tour="nav-fraud"]',
    title: "Anti-fraud",
    content:
      "See rejection codes and inter-contract slash visibility on Testnet.",
  },
];

type Props = {
  run: boolean;
  onDone: () => void;
};

export function OnboardingTour({ run, onDone }: Props) {
  const handle = (data: CallBackProps) => {
    const finished =
      data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;
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
