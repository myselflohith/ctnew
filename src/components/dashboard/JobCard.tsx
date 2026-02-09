import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Clock, Building2, DollarSign, Bookmark, ExternalLink } from "lucide-react";

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "remote" | "hybrid" | "onsite";
  salary?: string;
  postedAt: string;
  matchScore?: number;
  skills?: string[];
  onApply?: () => void;
  onSave?: () => void;
  onView?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
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
  skills = [],
  onApply,
  onSave,
  onView,
  onRemove,
  showRemove = false,
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
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id={`remove-${id}`}
                onCheckedChange={(checked) => {
                  if (checked && onRemove) {
                    onRemove();
                  }
                }}
              />
              <label
                htmlFor={`remove-${id}`}
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Remove
              </label>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              {matchScore && (
                <Badge variant={getMatchVariant(matchScore)}>
                  {matchScore}% Match
                </Badge>
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
              <Badge variant={type}>{type}</Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onSave}>
          <Bookmark className="w-5 h-5" />
        </Button>
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
          <Button variant="outline" size="sm" onClick={onView}>
            View Details
            <ExternalLink className="w-4 h-4 ml-1" />
          </Button>
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
