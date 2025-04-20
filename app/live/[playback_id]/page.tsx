"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { createClient } from "@/lib/supabase/client";
import { emojiAvatarForAddress } from "@/lib/emojiAvatarForAddress";
import { getPlaybackSource, deleteStream } from "@/lib/utils";
import { PlayerWithControls } from "@/components/LivePlayer";
import {
  MessageCircle,
  ThumbsUp,
  Share2,
  Flag,
  PencilIcon,
  CheckIcon,
  XIcon,
  Trash2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Src } from "@livepeer/react";
import { useAccount } from "wagmi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LiveStream() {
  const router = useRouter();
  const params = useParams<{ playback_id: string }>();
  const { address } = useAccount();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [streamSrc, setStreamSrc] = useState<Src[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state for editing
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchLiveData = async () => {
      if (!params.playback_id) return;

      try {
        setLoading(true);
        const supabase = createClient();

        // Fetch live stream data
        const { data, error } = await supabase
          .from("lives")
          .select("*")
          .eq("playback_id", params.playback_id)
          .single();

        if (error) {
          console.error("Error fetching live data:", error);
          setError("Live stream not found");
          return;
        }

        if (data) {
          setLiveData(data);

          // Initialize edit form with current data
          setEditTitle(data.title);
          setEditDescription(data.description || "");
          setEditTags(data.tags || []);
          setThumbnailPreview(data.thumbnail_url || "");

          // Check if current user is the owner of the stream
          if (address && data.walletAddress === address) {
            setIsOwner(true);
          }

          // Fetch the playback source for the stream
          const src = await getPlaybackSource(data.playback_id);
          setStreamSrc(src);
        }
      } catch (err) {
        console.error("Error in fetchLiveData:", err);
        setError("Something went wrong while loading the stream");
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();

    // Set up real-time subscription for updates to this live stream
    const supabase = createClient();
    const subscription = supabase
      .channel(`live-${params.playback_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lives",
          filter: `playback_id=eq.${params.playback_id}`,
        },
        (payload) => {
          // Update the live data when changes are detected
          const newData = payload.new as LiveData;
          setLiveData(newData);

          // Update form fields if not currently editing
          if (!isEditing) {
            setEditTitle(newData.title);
            setEditDescription(newData.description || "");
            setEditTags(newData.tags || []);
            setThumbnailPreview(newData.thumbnail_url || "");
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [params.playback_id, address, isEditing]);

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!liveData || !isOwner) return;

    try {
      setIsSaving(true);
      const supabase = createClient();

      const updatedData = {
        title: editTitle,
        description: editDescription,
        tags: editTags,
        thumbnail_url: thumbnailPreview,
      };

      const { error } = await supabase
        .from("lives")
        .update(updatedData)
        .eq("playback_id", params.playback_id);

      if (error) {
        console.error("Error updating stream:", error);
        toast.error("Failed to update stream details");
        return;
      }

      toast.success("Stream details updated successfully");
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving changes:", err);
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEditing = () => {
    // Reset form to original values
    if (liveData) {
      setEditTitle(liveData.title);
      setEditDescription(liveData.description || "");
      setEditTags(liveData.tags || []);
      setThumbnailPreview(liveData.thumbnail_url || "");
    }
    setIsEditing(false);
  };

  const handleDeleteStream = async () => {
    if (!liveData || !isOwner || !params.playback_id) return;

    try {
      setIsDeleting(true);
      const supabase = createClient();

      const { data, error: streamError } = await supabase
        .from("lives")
        .select("stream_id")
        .eq("playback_id", params.playback_id)
        .single();

      if (streamError) {
        console.error("Error fetching stream data:", streamError);
        toast.error("Failed to fetch stream data");
        return;
      }

      // 1. Delete from Livepeer
      await deleteStream(data?.stream_id || "");
      // 2. Delete from Supabase
      const { error } = await supabase
        .from("lives")
        .delete()
        .eq("playback_id", params.playback_id);

      if (error) {
        console.error("Error deleting stream from database:", error);
        toast.error("Failed to delete stream from database");
        return;
      }

      toast.success("Stream deleted successfully");

      // Redirect to streams page
      router.push("/live");
    } catch (err) {
      console.error("Error deleting stream:", err);
      toast.error("Failed to delete stream");
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="aspect-video bg-muted rounded-md mb-6"></div>
          <div className="h-8 bg-muted rounded mb-4 w-3/4"></div>
          <div className="h-4 bg-muted rounded mb-6 w-1/2"></div>

          <div className="flex gap-4 items-center mb-8">
            <div className="rounded-full bg-muted h-12 w-12"></div>
            <div className="h-4 bg-muted rounded w-40"></div>
          </div>

          <div className="h-24 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !liveData) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          {error || "Stream not found"}
        </h2>
        <p className="text-muted-foreground mb-6">
          The live stream you are looking for doesn&apos;t exist or has ended.
        </p>
        <Button asChild>
          <Link href="/live">Go Back to Live Streams</Link>
        </Button>
      </div>
    );
  }

  // Get emoji avatar for the streamer's wallet address
  const avatar = emojiAvatarForAddress(liveData.walletAddress);

  return (
    <>
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Video Player */}
            <div className="mb-4">
              {streamSrc ? (
                <PlayerWithControls src={streamSrc} />
              ) : (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <p className="text-white">Loading stream...</p>
                </div>
              )}
            </div>

            {/* Stream Info - View Mode */}
            {!isEditing ? (
              <div className="mb-6">
                <div className="flex justify-between items-start mb-2">
                  <h1 className="text-2xl font-bold">{liveData.title}</h1>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex gap-1 items-center"
                    >
                      <PencilIcon size={16} />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>

                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-muted-foreground">
                    Started {formatDate(liveData.created_at)}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex gap-1 items-center"
                    >
                      <ThumbsUp size={18} />
                      <span>Like</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex gap-1 items-center"
                    >
                      <Share2 size={18} />
                      <span>Share</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex gap-1 items-center"
                    >
                      <Flag size={18} />
                      <span>Report</span>
                    </Button>
                  </div>
                </div>

                {/* Tags */}
                {liveData.tags && liveData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {liveData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-secondary px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Streamer Info */}
                <Link href={`/streamer/${liveData.walletAddress}`}>
                  <Card className="p-4 hover:bg-secondary/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: avatar.color }}
                      >
                        {avatar.emoji}
                      </div>
                      <div>
                        <div className="font-medium">
                          {liveData.walletAddress.substring(0, 6)}...
                          {liveData.walletAddress.substring(
                            liveData.walletAddress.length - 4
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          View channel
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="ml-auto">
                        Subscribe
                      </Button>
                    </div>
                  </Card>
                </Link>

                {/* Description */}
                {liveData.description && (
                  <Card className="p-4 mt-4">
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm whitespace-pre-line">
                      {liveData.description}
                    </p>
                  </Card>
                )}

                {/* Stream Settings (for owner only) */}
                {isOwner && (
                  <Card className="p-4 mt-4 border-dashed border-2 border-yellow-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-yellow-500/10 rounded-full">
                        <PencilIcon size={16} className="text-yellow-600" />
                      </div>
                      <h3 className="font-medium">Stream Settings</h3>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      This is your stream. You can edit details or manage your
                      stream settings.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Stream Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteAlert(true)}
                        className="flex items-center gap-1 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/10"
                      >
                        <Trash2Icon size={14} />
                        <span>Delete Stream</span>
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              /* Stream Info - Edit Mode */
              <div className="mb-6">
                <Card className="p-5 bg-secondary/10">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Edit Stream Details</h2>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                        className="flex gap-1 items-center"
                      >
                        <XIcon size={16} />
                        <span>Cancel</span>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="flex gap-1 items-center"
                      >
                        <CheckIcon size={16} />
                        <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Stream Title
                      </label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Enter a title for your stream"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Describe your stream (optional)"
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tags
                      </label>
                      <TagInput
                        placeholder="Add tags (press Enter)"
                        value={editTags}
                        onChange={setEditTags}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Add tags to help viewers find your stream
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Thumbnail
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-40 h-24 overflow-hidden rounded border border-border">
                          {thumbnailPreview ? (
                            <img
                              src={thumbnailPreview}
                              alt="Thumbnail preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                              No thumbnail
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="cursor-pointer">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              className="mb-1"
                            >
                              Change Thumbnail
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleThumbnailChange}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Recommended: 1280x720px
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between border-t pt-4 mt-2">
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Stream Keys
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toast.info("Stream key copied to clipboard")
                            }
                          >
                            Copy Stream Key
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toast.info("RTMP URL copied to clipboard")
                            }
                          >
                            Copy RTMP URL
                          </Button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-destructive mb-2">
                          Danger Zone
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteAlert(true)}
                          className="flex items-center gap-1 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/10"
                        >
                          <Trash2Icon size={14} />
                          <span>Delete Stream</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-medium">Live Chat</h3>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle
                      className="mx-auto mb-2 opacity-20"
                      size={40}
                    />
                    <p className="text-muted-foreground">
                      Chat is not available yet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full rounded-full bg-muted px-4 py-2 pr-24"
                    placeholder="Say something..."
                    disabled
                  />
                  <Button
                    size="sm"
                    className="absolute right-1 top-1 rounded-full px-4"
                    disabled
                  >
                    Chat
                  </Button>
                </div>
              </div>
            </Card>

            {/* Stream Statistics (for owner) */}
            {isOwner && (
              <Card className="mt-4 p-4">
                <h3 className="font-medium mb-3">Stream Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-3 rounded">
                    <div className="text-sm text-muted-foreground">Viewers</div>
                    <div className="text-lg font-semibold">0</div>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <div className="text-sm text-muted-foreground">
                      Duration
                    </div>
                    <div className="text-lg font-semibold">00:00:00</div>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <div className="text-sm text-muted-foreground">Likes</div>
                    <div className="text-lg font-semibold">0</div>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <div className="text-sm text-muted-foreground">
                      Chat Messages
                    </div>
                    <div className="text-lg font-semibold">0</div>
                  </div>
                </div>

                <div className="mt-3">
                  <Button variant="outline" size="sm" className="w-full">
                    View Detailed Analytics
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Stream Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangleIcon size={18} />
              Delete Stream
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              stream from Livepeer and remove all data.
              <div className="mt-4 p-3 bg-destructive/10 rounded-md border border-destructive/20 text-sm">
                <p className="font-medium">You are about to delete:</p>
                <p className="mt-1 text-muted-foreground">{liveData.title}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteStream()}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Stream"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
