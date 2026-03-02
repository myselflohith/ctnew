import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Mail, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import interviewsAPI from "@/lib/api/interviews";

interface Candidate {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

interface CandidateInviteProps {
  interviewId: number;
  interviewTitle: string;
  onBack: () => void;
  onSuccess?: () => void;
}

const CandidateInvite = ({ interviewId, interviewTitle, onBack, onSuccess }: CandidateInviteProps) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidate, setNewCandidate] = useState<Candidate>({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [invitingSingle, setInvitingSingle] = useState<string | null>(null);

  const addCandidate = () => {
    if (!newCandidate.name || !newCandidate.email) {
      toast.error("Please enter name and email");
      return;
    }

    const candidate: Candidate = {
      id: `candidate-${Date.now()}`,
      ...newCandidate,
    };

    setCandidates([...candidates, candidate]);
    setNewCandidate({ name: "", email: "", phone: "" });
    toast.success("Candidate added");
  };

  const removeCandidate = (id: string | undefined) => {
    setCandidates(candidates.filter((c) => c.id !== id));
  };

  const inviteCandidate = async (candidate: Candidate) => {
    try {
      setInvitingSingle(candidate.id || null);
      const response = await interviewsAPI.inviteCandidate(interviewId, candidate.name, candidate.email, candidate.phone);

      if (response.success) {
        toast.success(`Invitation sent to ${candidate.email}`);
        removeCandidate(candidate.id);
      } else {
        toast.error("Failed to send invitation");
      }
    } catch (error: any) {
      console.error("Error inviting candidate:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInvitingSingle(null);
    }
  };

  const inviteAll = async () => {
    if (candidates.length === 0) {
      toast.error("Please add at least one candidate");
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      for (const candidate of candidates) {
        try {
          const response = await interviewsAPI.inviteCandidate(
            interviewId,
            candidate.name,
            candidate.email,
            candidate.phone
          );
          if (response.success) {
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to invite ${candidate.email}:`, error);
        }
      }

      toast.success(`Invited ${successCount} out of ${candidates.length} candidates`);
      setCandidates([]);

      if (successCount > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error inviting candidates:", error);
      toast.error("Failed to invite candidates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Invite Candidates
          </h1>
          <p className="text-slate-400">
            For Interview: <span className="font-medium text-cardinal">{interviewTitle}</span>
          </p>
        </div>

        {/* Add Candidate Form */}
        <Card className="glass mb-4 p-4 border-0">
          <h2 className="text-xl font-semibold text-white mb-4">Add Candidate</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <Input
                placeholder="Enter candidate name"
                value={newCandidate.name}
                onChange={(e) =>
                  setNewCandidate({ ...newCandidate, name: e.target.value })
                }
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="Enter candidate email"
                value={newCandidate.email}
                onChange={(e) =>
                  setNewCandidate({ ...newCandidate, email: e.target.value })
                }
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone (Optional)
              </label>
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={newCandidate.phone}
                onChange={(e) =>
                  setNewCandidate({ ...newCandidate, phone: e.target.value })
                }
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <Button
              onClick={addCandidate}
              className="w-full bg-cardinal hover:bg-cardinal/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        </Card>

        {/* Candidates List */}
        {candidates.length > 0 && (
          <Card className="glass mb-4 p-4 border-0">
            <h2 className="text-xl font-semibold text-white mb-4">
              Candidates ({candidates.length})
            </h2>

            <div className="space-y-2 max-h-[35vh] overflow-auto pr-1">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{candidate.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {candidate.email}
                      </span>
                      {candidate.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {candidate.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30"
                      onClick={() => inviteCandidate(candidate)}
                      disabled={invitingSingle === candidate.id}
                    >
                      {invitingSingle === candidate.id ? "Sending..." : "Invite"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCandidate(candidate.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={inviteAll}
                disabled={loading || candidates.length === 0}
                className="flex-1 bg-cardinal hover:bg-cardinal/90"
              >
                {loading ? "Inviting..." : `Invite All ${candidates.length} Candidates`}
              </Button>
              <Button
                onClick={onBack}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Done
              </Button>
            </div>
          </Card>
        )}

        {/* No Candidates */}
        {candidates.length === 0 && (
          <div className="text-center py-6">
            <p className="text-slate-400 mb-4">No candidates added yet</p>
            <Button
              onClick={onBack}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Go Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateInvite;
