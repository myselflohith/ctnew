import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import InvestorsNavbar from "@/components/investors/Navbar";
import FeedTab from "@/components/investors/FeedTab";
import StartupsTab from "@/components/investors/StartupsTab";
import InvestorsTab from "@/components/investors/InvestorsTab";
import PitchRoomTab from "@/components/investors/PitchRoomTab";
import type { InvestorsTabKey } from "@/components/investors/Navbar";

const FEED_POSTS_STORAGE_KEY = "investor_feed_posts";

const InvestorsDashboard = () => {
  const location = useLocation();
  const tabFromState = (location.state as { tab?: InvestorsTabKey })?.tab;
  const [activeTab, setActiveTab] = useState<InvestorsTabKey>(tabFromState ?? "feed");
  const [openComposer, setOpenComposer] = useState(false);

  useEffect(() => {
    if (tabFromState) setActiveTab(tabFromState);
  }, [tabFromState]);

  return (
    <div className="min-h-screen bg-background">
      <InvestorsNavbar activeTab={activeTab} setActiveTab={setActiveTab} onPostUpdate={() => { setActiveTab("feed"); setOpenComposer(true); }} />
      <main className="max-w-7xl mx-auto px-4 pt-6 pb-12">
        {activeTab === "feed" && <FeedTab openComposer={openComposer} onCloseComposer={() => setOpenComposer(false)} storageKey={FEED_POSTS_STORAGE_KEY} />}
        {activeTab === "startups" && <StartupsTab />}
        {activeTab === "investors" && <InvestorsTab />}
        {activeTab === "pitchroom" && <PitchRoomTab />}
      </main>
    </div>
  );
};

export default InvestorsDashboard;
