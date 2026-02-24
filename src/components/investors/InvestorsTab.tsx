import { Linkedin } from "lucide-react";

const investors = [
  {
    name: "Lasse-Mathias Nyberg",
    title: "Co-Founder & CEO",
    bio: "Stanford GSB MBA, B.Sc. and LL.B., Prev. Boston Consulting Group.",
    linkedin: "https://www.linkedin.com/in/nyberglm/",
    gradient: "from-blue-600 to-indigo-700",
    initials: "LN",
  },
  {
    name: "TJ Casner",
    title: "Co-Founder & CTO",
    bio: "B.Sc., Computer Science & Mechanical Eng., Prev. Uber, Owner.com, and Michelin.",
    linkedin: "https://www.linkedin.com/in/tj-casner/",
    gradient: "from-teal-500 to-cyan-600",
    initials: "TC",
  },
];

const InvestorsTab = () => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Investors</h2>
        <p className="text-sm text-muted-foreground mt-1">Meet the founders behind StartupSphere</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {investors.map((inv) => (
          <div key={inv.name} className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${inv.gradient} flex items-center justify-center text-primary-foreground font-bold text-xl`}>
                {inv.initials}
              </div>
              <div>
                <a
                  href={inv.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  {inv.name}
                  <Linkedin className="w-4 h-4" />
                </a>
                <p className="text-sm font-medium text-muted-foreground">{inv.title}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{inv.bio}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={inv.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
              >
                <Linkedin className="w-4 h-4" /> Connect
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvestorsTab;
