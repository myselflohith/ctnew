import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { MapPin, Clock, Building2, DollarSign, Bookmark, Info } from "lucide-react";

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  type?: "remote" | "hybrid" | "onsite" | null;
  salary?: string;
  postedAt: string;
  matchScore?: number;
  /** Human-readable explanation of why this job was recommended. */
  matchSummary?: string;
  skills?: string[];
  description?: string;
  onApply?: () => void;
  onSave?: () => void;
  onUnsave?: () => void;
  onView?: () => void;
  onRemove?: () => void;
  onToggleSelect?: (checked: boolean) => void;
  showRemove?: boolean;
  isSelected?: boolean;
  /** When true, show "Saved Job" tag in red and allow unsave */
  isSaved?: boolean;
  /** Called when user clicks the match info icon to view detailed explanation. */
  onViewMatchDetails?: () => void;
}

const JobCard = ({
  id,
  title,
  company,
  location,
  type,
  salary,
  postedAt,
  matchScore,
  matchSummary,
  skills = [],
  description,
  onApply,
  onSave,
  onUnsave,
  onView,
  onToggleSelect,
  showRemove = false,
  isSelected = false,
  isSaved = false,
  onViewMatchDetails,
}: JobCardProps) => {
  const getMatchVariant = (score: number) => {
    if (score >= 85) return "excellent";
    if (score >= 70) return "good";
    return "fair";
  };

  return (
    <div className="job-card group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          {showRemove && (
            <div className="pt-1">
              <Checkbox
                id={`select-${id}`}
                checked={isSelected}
                onCheckedChange={(checked) => {
                  if (onToggleSelect) {
                    onToggleSelect(checked as boolean);
                  }
                }}
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 
                className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
                onClick={onView}
              >
                {title}
              </h3>
              {isSaved && (
                <Badge variant="destructive" className="text-xs">
                  Saved Job
                </Badge>
              )}
              {(matchScore || matchSummary) && (
                <TooltipProvider>
                  <div className="flex items-center gap-2">
                    {matchScore && (
                      <Badge variant={getMatchVariant(matchScore)}>
                        {matchScore}% Match
                      </Badge>
                    )}
                    {matchSummary && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                            aria-label="Why this job is recommended"
                            onClick={onViewMatchDetails}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs">
                          <p className="text-xs whitespace-pre-line">
                            {matchSummary}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {location}
              </span>
              {type && <Badge variant={type}>{type}</Badge>}
            </div>
          </div>
        </div>
        {(onSave || onUnsave) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={isSaved ? onUnsave : onSave}
            title={isSaved ? "Remove from saved jobs" : "Save job"}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        )}
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {skills.slice(0, 5).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {skills.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{skills.length - 5} more
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {salary && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {salary}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {postedAt}
          </span>
        </div>
        <div className="flex gap-2">
          {onApply && (
            <Button variant="default" size="sm" onClick={onApply}>
              Apply Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
