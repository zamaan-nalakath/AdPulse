import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./components/LandingPage";
import { AppLayout } from "./components/AppLayout";
import { OverviewPage } from "./pages/OverviewPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { SlotsPage } from "./pages/SlotsPage";
import { ImpressionsPage } from "./pages/ImpressionsPage";
import { PublisherPage } from "./pages/PublisherPage";
import { CpmPage } from "./pages/CpmPage";
import { FraudPage } from "./pages/FraudPage";
import { ActivityPage } from "./pages/ActivityPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="advertiser" element={<CampaignsPage />} />
          <Route path="slots" element={<SlotsPage />} />
          <Route path="impressions" element={<ImpressionsPage />} />
          <Route path="publisher" element={<PublisherPage />} />
          <Route path="cpm" element={<CpmPage />} />
          <Route path="fraud" element={<FraudPage />} />
          <Route path="activity" element={<ActivityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
