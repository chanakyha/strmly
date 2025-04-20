"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/ui/tag-input";
import { useAccount } from "wagmi";
import { createClient } from "@/lib/supabase/client";
import { emojiAvatarForAddress } from "@/lib/emojiAvatarForAddress";
import { createStream, getPlaybackSource } from "@/lib/utils";

import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
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

interface User {
  walletAddress: string;
  name: string;
  bio: string;
  tags: string[];
  created_at: string;
  subscribed: string[];
  subscribers: string[];
  total_views?: number;
}

const LiveStreamPage = () => {
  const { address } = useAccount();
  const [streamTitle, setStreamTitle] = useState("");
  const [streamDescription, setStreamDescription] = useState("");
  const [streamTags, setStreamTags] = useState<string[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [streamCreated, setStreamCreated] = useState(false);
  const [allLiveStreams, setAllLiveStreams] = useState<LiveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streamData, setStreamData] = useState<{
    id: string;
    streamKey: string;
    playbackId: string;
    rtmpUrl: string;
  }>({
    id: "",
    streamKey: "",
    playbackId: "",
    rtmpUrl: "rtmp://rtmp.livepeer.com/live",
  });
  const [profileData, setProfileData] = useState<User>({
    walletAddress: "",
    name: "",
    bio: "",
    tags: [],
    created_at: "",
    subscribed: [],
    subscribers: [],
    total_views: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editingStream, setEditingStream] = useState<LiveData | null>(null);
  const [deleteStreamId, setDeleteStreamId] = useState<string | null>(null);
  const createSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPlaybackSource = async () => {
      if (!streamData.playbackId) return;

      // Just fetch the source but we don't need to store it here
      await getPlaybackSource(streamData.playbackId);
    };

    fetchPlaybackSource();
  }, [streamData.playbackId]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!address) return;

      try {
        setLoading(true);
        const supabase = createClient();

        // Fetch user profile data
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("walletAddress", address)
          .single();

        if (userError) {
          console.error("Error fetching user data:", userError);
          return;
        }

        if (userData) {
          setProfileData({
            walletAddress: userData.walletAddress || address,
            name: userData.name || `user_${address.slice(0, 6)}`,
            bio: userData.bio || "",
            tags: userData.tags || [],
            created_at: userData.created_at || new Date().toISOString(),
            subscribed: userData.subscribed || [],
            subscribers: userData.subscribers || [],
            total_views: userData.total_views || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [address]);

  // Fetch all live streams
  useEffect(() => {
    const fetchAllLiveStreams = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
          .from("lives")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching live streams:", error);
          return;
        }

        setAllLiveStreams(data || []);
      } catch (error) {
        console.error("Error fetching live streams:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllLiveStreams();

    // Set up real-time subscription for live streams
    const supabase = createClient();
    const subscription = supabase
      .channel("lives-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lives",
        },
        () => {
          fetchAllLiveStreams();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const handleCreateStream = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!streamTitle) {
      toast.error("Please enter a stream title");
      return;
    }

    try {
      const response = await createStream(streamTitle);

      if (response) {
        const newStreamData = {
          id: response.id || "",
          streamKey: response.streamKey || "",
          playbackId: response.playbackId || "",
          rtmpUrl: "rtmp://rtmp.livepeer.com/live",
          streamId: response.id || "",
        };

        setStreamData(newStreamData);
        setStreamCreated(true);

        // Save to Supabase
        const supabase = createClient();

        const liveData: LiveData = {
          walletAddress: address,
          playback_id: newStreamData.playbackId,
          created_at: new Date().toISOString(),
          stream_id: newStreamData.streamId,
          stream_key: newStreamData.streamKey,
          stream_url: newStreamData.rtmpUrl,
          tags: streamTags,
          title: streamTitle,
          thumbnail_url: thumbnailPreview || "",
          description: streamDescription,
        };

        const { error } = await supabase.from("lives").insert(liveData);

        if (error) {
          console.error("Error saving stream data:", error);
          toast.error("Failed to save stream data");
          return;
        }

        toast.success("Stream created successfully!");
      }
    } catch (error) {
      console.error("Error creating stream:", error);
      toast.error("Failed to create stream");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Get emoji avatar for the wallet address
  const avatar = address
    ? emojiAvatarForAddress(address)
    : { emoji: "👨‍💻", color: "#6A87C8" };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Updated to scroll to create section instead of tab switching
  const scrollToCreateSection = () => {
    if (createSectionRef.current) {
      createSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Function to handle opening the edit section
  const handleEditStream = (stream: LiveData) => {
    setEditingStream(stream);
    setStreamTitle(stream.title);
    setStreamDescription(stream.description || "");
    setStreamTags(stream.tags || []);
    setThumbnailPreview(stream.thumbnail_url || "");
    setStreamData({
      id: stream.stream_id,
      streamKey: stream.stream_key,
      playbackId: stream.playback_id,
      rtmpUrl: stream.stream_url,
    });
    setStreamCreated(true);

    // Scroll to create section
    scrollToCreateSection();
  };

  // Function to update stream
  const handleUpdateStream = async () => {
    if (!editingStream) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("lives")
        .update({
          title: streamTitle,
          description: streamDescription,
          tags: streamTags,
          thumbnail_url: thumbnailPreview,
        })
        .eq("stream_id", editingStream.stream_id);

      if (error) {
        throw error;
      }

      toast.success("Stream updated successfully");
      setEditingStream(null);
    } catch (error) {
      console.error("Error updating stream:", error);
      toast.error("Failed to update stream");
    }
  };

  // Add function to handle stream deletion
  const handleDeleteStream = async () => {
    if (!deleteStreamId) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("lives")
        .delete()
        .eq("stream_id", deleteStreamId);

      if (error) {
        throw error;
      }

      toast.success("Stream deleted successfully");
      setDeleteStreamId(null);
    } catch (error) {
      console.error("Error deleting stream:", error);
      toast.error("Failed to delete stream");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-12">
      {/* Browse Streams Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Browse Streams</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video bg-muted animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </Card>
              ))
          ) : allLiveStreams.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <h3 className="text-xl font-semibold mb-2">
                No live streams available
              </h3>
              <p className="text-muted-foreground mb-6">
                Be the first to start streaming!
              </p>
              <Button onClick={scrollToCreateSection}>Create Stream</Button>
            </div>
          ) : (
            allLiveStreams.map((stream) => (
              <Card
                key={stream.playback_id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-video relative">
                  {stream.thumbnail_url ? (
                    <img
                      src={stream.thumbnail_url}
                      alt={stream.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center bg-black/10"
                      style={{
                        background: emojiAvatarForAddress(stream.walletAddress)
                          .color,
                      }}
                    >
                      <span className="text-4xl">
                        {emojiAvatarForAddress(stream.walletAddress).emoji}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded">
                    LIVE
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium truncate">{stream.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: emojiAvatarForAddress(stream.walletAddress)
                          .color,
                      }}
                    >
                      <span className="text-sm">
                        {emojiAvatarForAddress(stream.walletAddress).emoji}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stream.walletAddress.substring(0, 6)}...
                      {stream.walletAddress.substring(
                        stream.walletAddress.length - 4
                      )}
                    </span>
                  </div>
                  {stream.tags && stream.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {stream.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-secondary px-1.5 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {stream.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{stream.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Stream Key
                      </label>
                      <div className="relative">
                        <Input
                          value={stream.stream_key}
                          readOnly
                          type="password"
                          className="text-xs"
                        />
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            copyToClipboard(stream.stream_key);
                          }}
                          className="absolute right-0 top-0 h-full"
                          size="sm"
                          variant="ghost"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Stream URL
                      </label>
                      <div className="relative">
                        <Input
                          value={stream.stream_url}
                          readOnly
                          className="text-xs"
                        />
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            copyToClipboard(stream.stream_url);
                          }}
                          className="absolute right-0 top-0 h-full"
                          size="sm"
                          variant="ghost"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Link
                        href={`/live/${stream.playback_id}`}
                        className="block"
                      >
                        <Button className="w-full" size="sm">
                          Watch
                        </Button>
                      </Link>

                      {/* Only show edit/delete buttons if the stream belongs to the current user */}
                      {address && stream.walletAddress === address && (
                        <div className="grid grid-cols-2 gap-1 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStream(stream)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteStreamId(stream.stream_id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Create Stream Section */}
      <section ref={createSectionRef}>
        <h2 className="text-2xl font-bold mb-6">
          {editingStream ? "Edit Stream" : "Create Stream"}
        </h2>

        {!address && (
          <div className="text-sm text-muted-foreground mb-6">
            Connect your wallet to create a stream
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Profile Card */}
          <div className="md:col-span-1">
            <Card className="p-6">
              <div className="flex flex-col items-center">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-4"
                  style={{ backgroundColor: avatar.color }}
                >
                  {avatar.emoji}
                </div>
                <h2 className="text-xl font-bold">
                  {loading ? "Loading..." : profileData.name}
                </h2>
                <p className="text-gray-500 mt-2">
                  {address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : "Not connected"}
                </p>

                {!loading && profileData.bio && (
                  <p className="text-sm text-center mt-3 text-gray-400">
                    {profileData.bio}
                  </p>
                )}

                {!loading &&
                  profileData.tags &&
                  profileData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 justify-center">
                      {profileData.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-secondary px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="mt-4 w-full">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Subscribers</span>
                    <span className="font-medium">
                      {loading
                        ? "..."
                        : profileData.subscribers.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Subscribed Streamers</span>
                    <span className="font-medium">
                      {loading
                        ? "..."
                        : profileData.subscribed.length.toLocaleString()}
                    </span>
                  </div>

                  {profileData.created_at && (
                    <div className="text-xs text-gray-500 mt-3 text-center">
                      Member since {formatDate(profileData.created_at)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Stream Setup */}
          <div className="md:col-span-2">
            <Card className="p-6">
              {!streamCreated ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Title *
                    </label>
                    <Input
                      placeholder="Enter your stream title"
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Description
                    </label>
                    <Textarea
                      placeholder="Enter stream description (optional)"
                      value={streamDescription}
                      onChange={(e) => setStreamDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Tags
                    </label>
                    <TagInput
                      placeholder="Add tags (press Enter)"
                      value={streamTags}
                      onChange={setStreamTags}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add tags to help viewers find your stream
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Thumbnail
                    </label>
                    <div className="flex items-center space-x-5">
                      <label className="cursor-pointer flex items-center justify-center border-2 border-dashed rounded-md border-gray-500/30 h-40 w-40 hover:border-gray-500/50 transition">
                        {thumbnailPreview ? (
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="h-full w-full object-cover rounded-md"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <div className="text-3xl mb-2">📷</div>
                            <div className="text-xs text-gray-500">
                              Select Image
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleThumbnailChange}
                        />
                      </label>

                      <div className="flex-1">
                        <p className="text-sm text-gray-500">
                          Upload a thumbnail image for your stream. Recommended
                          size: 1280x720px.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateStream}
                    className="w-full"
                    disabled={!streamTitle || !address}
                  >
                    {!address
                      ? "Connect Wallet to Create Stream"
                      : "Create Stream"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-md p-4 mb-6">
                    <p className="text-green-500 font-medium">
                      {editingStream
                        ? "Edit your stream details below"
                        : "Stream created successfully! You're ready to go live."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Title
                    </label>
                    <Input
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Description
                    </label>
                    <Textarea
                      value={streamDescription}
                      onChange={(e) => setStreamDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Tags
                    </label>
                    <TagInput
                      placeholder="Add tags (press Enter)"
                      value={streamTags}
                      onChange={setStreamTags}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Thumbnail
                    </label>
                    <div className="flex items-center space-x-5">
                      <label className="cursor-pointer flex items-center justify-center border-2 border-dashed rounded-md border-gray-500/30 h-40 w-40 hover:border-gray-500/50 transition">
                        {thumbnailPreview ? (
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="h-full w-full object-cover rounded-md"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <div className="text-3xl mb-2">📷</div>
                            <div className="text-xs text-gray-500">
                              Select Image
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleThumbnailChange}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream ID
                    </label>
                    <div className="relative">
                      <Input value={streamData.id} readOnly />
                      <Button
                        onClick={() => copyToClipboard(streamData.id)}
                        className="absolute right-0 top-0 h-full"
                        size="sm"
                        variant="ghost"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stream Key
                    </label>
                    <div className="relative">
                      <Input
                        value={streamData.streamKey}
                        readOnly
                        type="password"
                      />
                      <Button
                        onClick={() => copyToClipboard(streamData.streamKey)}
                        className="absolute right-0 top-0 h-full"
                        size="sm"
                        variant="ghost"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      RTMP URL
                    </label>
                    <div className="relative">
                      <Input value={streamData.rtmpUrl} readOnly />
                      <Button
                        onClick={() => copyToClipboard(streamData.rtmpUrl)}
                        className="absolute right-0 top-0 h-full"
                        size="sm"
                        variant="ghost"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Playback ID
                    </label>
                    <div className="relative">
                      <Input value={streamData.playbackId} readOnly />
                      <Button
                        onClick={() => copyToClipboard(streamData.playbackId)}
                        className="absolute right-0 top-0 h-full"
                        size="sm"
                        variant="ghost"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {editingStream ? (
                      <>
                        <Button className="w-full" onClick={handleUpdateStream}>
                          Update Stream
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingStream(null);
                            setStreamCreated(false);
                          }}
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button className="w-full">View Stream</Button>
                        <Button
                          variant="outline"
                          onClick={() => setStreamCreated(false)}
                          className="w-full"
                        >
                          Edit Stream
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* Delete Stream Confirmation Dialog */}
      <AlertDialog
        open={!!deleteStreamId}
        onOpenChange={() => setDeleteStreamId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              stream.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStream}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LiveStreamPage;
