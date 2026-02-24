import { ThumbsUp, MessageSquare, MoreHorizontal, Share, Bookmark, Rocket } from "lucide-react";

const FeedTab = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-6">
      {/* Left Sidebar */}
      <aside className="space-y-6 hidden lg:block">
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">Filter Startups</h3>
          <div className="space-y-3">
            {["Stanford", "Seed / Series A", "AI / SaaS / Health"].map((filter) => (
              <select key={filter} className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card text-foreground">
                <option>{filter}</option>
              </select>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">Trending Startups</h3>
          <div className="space-y-4">
            {[
              { name: "Neuronix AI", desc: "Stanford Startup · Raised $2M", color: "from-blue-500 to-purple-600" },
              { name: "EcoCharge", desc: "YC Startup · Hiring Now", color: "from-green-500 to-teal-500" },
              { name: "MediSync Health", desc: "Series A · Growing Fast", color: "from-rose-500 to-pink-500" },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.color} flex-shrink-0`} />
                <div>
                  <p className="text-sm font-medium text-primary hover:underline cursor-pointer">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Feed */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Top Startups & Investor Updates</h2>
          <MoreHorizontal className="w-5 h-5 text-muted-foreground cursor-pointer" />
        </div>

        {/* Post 1 */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600" />
              <div>
                <p className="text-sm">
                  <a href="https://www.linkedin.com/in/nyberglm/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Lasse-Mathias Nyberg</a>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-primary font-medium hover:underline cursor-pointer">Arcadia Robotics 🤖</span>
                </p>
                <p className="text-xs text-muted-foreground">Co-Founder & CEO · Stanford GSB MBA</p>
              </div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-foreground mb-1">
            Excited to announce we've closed our <strong>$4M Seed Round!</strong> 🚀
          </p>
          <p className="text-sm text-foreground mb-3">Looking for top AI engineers to join our team.</p>
          <div className="flex gap-2 mb-4">
            {["Seed Round Closed", "$4M Raised", "Hiring AI Talent >"].map((tag) => (
              <span key={tag} className="text-xs border border-border rounded-full px-3 py-1 text-muted-foreground">{tag}</span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> 87</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> 24</span>
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-3">
              <Share className="w-4 h-4 text-muted-foreground" />
              <Bookmark className="w-4 h-4 text-muted-foreground" />
              <button className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-md">
                Request Intro
              </button>
            </div>
          </div>
        </div>

        {/* Post 2 */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-gray-700" />
              <div>
                <p className="text-sm">
                  <a href="https://www.linkedin.com/in/tj-casner/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">TJ Casner</a>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-primary font-medium hover:underline cursor-pointer">VentureEdge Capital</span>
                </p>
                <p className="text-xs text-muted-foreground">Co-Founder & CTO · Prev. Uber, Owner.com</p>
              </div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-foreground mb-1">
            Actively looking for Stanford-founded startups in HealthTech and AI. Let's connect!
          </p>
          <p className="text-sm text-primary hover:underline cursor-pointer mb-4">#LookingToInvest</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1"><Rocket className="w-4 h-4" /> 36</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> 12</span>
              <MessageSquare className="w-4 h-4" />
            </div>
            <button className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-md">
              Connect
            </button>
          </div>
        </div>

        {/* Startup Card */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Neuronix AI</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Stanford Startup | AI for Healthcare</p>
              <ul className="text-sm text-foreground space-y-1">
                <li>• Funding: <strong>$2.2M Seed</strong> / Growing Team</li>
                <li>• San Francisco, CA</li>
              </ul>
            </div>
            <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <span>📊 15K Users</span>
            <span>💼 Hiring Engineers</span>
            <span>🚀 Early Traction</span>
            <div className="ml-auto flex gap-2">
              <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium">View Profile</button>
              <button className="border border-border text-foreground px-3 py-1.5 rounded-md text-sm font-medium">Request Intro</button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="space-y-6 hidden lg:block">
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">Suggested Investors</h3>
          <div className="space-y-4">
            {[
              { name: "Sarah Patel", role: "Partner - SkyRise Ventures", focus: "HealthTech & AI" },
              { name: "Mark Cooper", role: "Angel Investor", focus: "Former Google Exec" },
              { name: "Anna Kim", role: "VC - Innovate Capital", focus: "Seed & Series A" },
            ].map((inv) => (
              <div key={inv.name} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.name}</p>
                  <p className="text-xs text-muted-foreground">{inv.role} | {inv.focus}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Upcoming Events</h3>
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {[
              { name: "Stanford Startup Demo Night", date: "Apr 12" },
              { name: "AI & Investing Panel", date: "Apr 18" },
            ].map((ev) => (
              <div key={ev.name} className="flex items-center justify-between">
                <p className="text-sm text-primary hover:underline cursor-pointer">{ev.name}</p>
                <span className="text-xs border border-border rounded-full px-2 py-0.5 text-muted-foreground">{ev.date}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default FeedTab;
