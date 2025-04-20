"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/ui/tag-input";
import { useAccount } from "wagmi";
import { createClient } from "@/lib/supabase/client";
import { emojiAvatarForAddress } from "@/lib/emojiAvatarForAddress";
import { createStream, getPlaybackSource } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";

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

  // Helper function to switch tabs programmatically
  const switchToCreateTab = () => {
    const createTabTrigger = document.querySelector(
      '[value="create"]'
    ) as HTMLElement;
    if (createTabTrigger) {
      createTabTrigger.click();
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="browse" className="w-full">
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="browse">Browse Streams</TabsTrigger>
            <TabsTrigger value="create">Create Stream</TabsTrigger>
          </TabsList>

          {!address && (
            <div className="text-sm text-muted-foreground">
              Connect your wallet to create a stream
            </div>
          )}
        </div>

        <TabsContent value="browse" className="mt-0">
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
                <Button onClick={switchToCreateTab}>Create Stream</Button>
              </div>
            ) : (
              allLiveStreams.map((stream) => (
                <Link
                  href={`/live/${stream.playback_id}`}
                  key={stream.playback_id}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
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
                            background: emojiAvatarForAddress(
                              stream.walletAddress
                            ).color,
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
                            background: emojiAvatarForAddress(
                              stream.walletAddress
                            ).color,
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
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="create" className="mt-0">
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
                            Upload a thumbnail image for your stream.
                            Recommended size: 1280x720px.
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
                        Stream created successfully! You&apos;re ready to go
                        live.
                      </p>
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
                      <Button className="w-full">View Stream</Button>
                      <Button
                        variant="outline"
                        onClick={() => setStreamCreated(false)}
                        className="w-full"
                      >
                        Edit Stream
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveStreamPage;
