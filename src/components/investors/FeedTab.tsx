import { useState, useEffect } from "react";
import { ThumbsUp, MessageSquare, MoreHorizontal, Share, Bookmark, Rocket, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";

export type LocalFeedComment = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type LocalFeedPost = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likeCount?: number;
  comments?: LocalFeedComment[];
};

const LIKED_POSTS_KEY = "investor_feed_liked_post_ids";

const loadPostsFromStorage = (key: string): LocalFeedPost[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return list.map((p: LocalFeedPost) => ({
      ...p,
      likeCount: typeof p.likeCount === "number" ? p.likeCount : 0,
      comments: Array.isArray(p.comments) ? p.comments : [],
    }));
  } catch {
    return [];
  }
};

const loadLikedPostIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(LIKED_POSTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const saveLikedPostIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify([...ids]));
  } catch (_) {}
};

const savePostsToStorage = (key: string, posts: LocalFeedPost[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(posts));
  } catch (_) {}
};

// Render post content with #hashtags as styled tags
const HASHTAG_SPLIT_REGEX = /(#\w+)/g;
function isHashtag(part: string) {
  return /^#\w+$/.test(part);
}
function PostContentWithTags({ content }: { content: string }) {
  const parts = content.split(HASHTAG_SPLIT_REGEX);
  return (
    <p className="text-sm text-foreground whitespace-pre-wrap">
      {parts.map((part, i) =>
        isHashtag(part) ? (
          <span
            key={i}
            className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium mx-0.5"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

interface FeedTabProps {
  openComposer?: boolean;
  onCloseComposer?: () => void;
  storageKey?: string;
}

const FeedTab = ({ openComposer = false, onCloseComposer, storageKey = "investor_feed_posts" }: FeedTabProps) => {
  const [localPosts, setLocalPosts] = useState<LocalFeedPost[]>(() => loadPostsFromStorage(storageKey));
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(() => loadLikedPostIds());
  const [composerContent, setComposerContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("You");
  const [commentByPostId, setCommentByPostId] = useState<Record<string, string>>({});
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getCurrentUser().then((res) => {
      const user = res.user;
      if (user?.first_name || user?.last_name) {
        setCurrentUserName([user.first_name, user.last_name].filter(Boolean).join(" ") || "You");
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    savePostsToStorage(storageKey, localPosts);
  }, [localPosts, storageKey]);

  useEffect(() => {
    saveLikedPostIds(likedPostIds);
  }, [likedPostIds]);

  const handleLike = (postId: string) => {
    const isLiked = likedPostIds.has(postId);
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setLocalPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likeCount: Math.max(0, (p.likeCount ?? 0) + (isLiked ? -1 : 1)) }
          : p
      )
    );
  };

  const handleAddComment = (postId: string) => {
    const text = (commentByPostId[postId] ?? "").trim();
    if (!text) return;
    const comment: LocalFeedComment = {
      id: `comment-${Date.now()}`,
      authorName: currentUserName,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setLocalPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...(p.comments ?? []), comment] }
          : p
      )
    );
    setCommentByPostId((prev) => ({ ...prev, [postId]: "" }));
  };

  const handlePost = () => {
    const text = composerContent.trim();
    if (!text || posting) return;
    setPosting(true);
    const post: LocalFeedPost = {
      id: `local-${Date.now()}`,
      content: text,
      authorName: currentUserName,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      comments: [],
    };
    setLocalPosts((prev) => [post, ...prev]);
    setComposerContent("");
    setPosting(false);
    onCloseComposer?.();
  };

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

        {/* Composer - when open */}
        {openComposer && (
          <div className="bg-card rounded-lg border border-border p-5">
            <p className="text-sm font-medium text-foreground mb-2">Post an update</p>
            <Textarea
              placeholder="Share an update with the community..."
              value={composerContent}
              onChange={(e) => setComposerContent(e.target.value)}
              className="min-h-[100px] resize-none mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onCloseComposer} disabled={posting}>
                Cancel
              </Button>
              <Button size="sm" onClick={handlePost} disabled={!composerContent.trim() || posting} className="gap-2">
                <Send className="w-4 h-4" />
                Post
              </Button>
            </div>
          </div>
        )}

        {/* Local posts (at top, newest first) */}
        {localPosts.map((post) => {
          const isLiked = likedPostIds.has(post.id);
          const comments = post.comments ?? [];
          const showComments = expandedCommentsPostId === post.id;
          return (
            <div key={post.id} className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                    {post.authorName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{post.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · Your update
                    </p>
                  </div>
                </div>
              </div>
              <PostContentWithTags content={post.content} />
              <div className="flex items-center gap-4 mt-4 text-muted-foreground text-sm">
                <button
                  type="button"
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1 transition-colors ${isLiked ? "text-primary" : "hover:text-foreground"}`}
                >
                  <ThumbsUp className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                  {post.likeCount ?? 0}
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedCommentsPostId(showComments ? null : post.id)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  {comments.length}
                </button>
              </div>
              {showComments && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs shrink-0">
                        {c.authorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{c.authorName}</p>
                        <p className="text-sm text-foreground">{c.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={commentByPostId[post.id] ?? ""}
                      onChange={(e) => setCommentByPostId((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddComment(post.id))}
                      className="flex-1 h-9 text-sm"
                    />
                    <Button size="sm" onClick={() => handleAddComment(post.id)} disabled={!(commentByPostId[post.id] ?? "").trim()}>
                      Post
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

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
