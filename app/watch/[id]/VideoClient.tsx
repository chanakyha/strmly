"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  BookmarkPlus,
  MoreHorizontal,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { emojiAvatarForAddress } from "@/lib/emojiAvatarForAddress";
import { useAccount } from "wagmi";
import { toast } from "sonner";

type Video = {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at: string;
  tags: string[];
  wallet_address: string;
  nsfw?: boolean;
  views?: number;
  channel?: {
    name: string;
    avatar_url: string;
    subscribers?: number;
  };
};

type VideoClientProps = {
  video: Video;
  relatedVideos: Video[];
  videoId: string;
};

export default function VideoClient({
  video,
  relatedVideos,
  videoId,
}: VideoClientProps) {
  const { address, isConnected } = useAccount();
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
    }).format(num);
  };

  // Get emoji avatar for the video owner's wallet address
  const videoOwnerAddress = video.wallet_address || "";
  const { emoji, color } = emojiAvatarForAddress(videoOwnerAddress);

  // Format wallet address for display
  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Fetch subscriber count and check if the current user is subscribed
  useEffect(() => {
    const fetchSubscriberData = async () => {
      try {
        const supabase = createClient();

        // Get the channel owner's data including subscribers array
        const { data: ownerData, error: ownerError } = await supabase
          .from("users")
          .select("subscribers")
          .eq("walletAddress", videoOwnerAddress)
          .single();

        if (ownerError) {
          console.error("Error fetching channel data:", ownerError);
          return;
        }

        // Set subscriber count
        const subscribers = ownerData?.subscribers || [];
        setSubscribersCount(subscribers.length);

        // Check if current user is subscribed to this channel
        if (address) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("subscribed")
            .eq("walletAddress", address)
            .single();

          if (userError) {
            console.error("Error checking subscription status:", userError);
            return;
          }

          const userSubscriptions = userData?.subscribed || [];
          setIsSubscribed(userSubscriptions.includes(videoOwnerAddress));
        }
      } catch (err) {
        console.error("Error fetching subscription data:", err);
      }
    };

    fetchSubscriberData();

    // Set up real-time subscription for subscriber count updates
    const supabase = createClient();
    const subscription = supabase
      .channel(`user-${videoOwnerAddress}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `walletAddress=eq.${videoOwnerAddress}`,
        },
        (payload: any) => {
          const newData = payload.new;
          if (newData && newData.subscribers) {
            setSubscribersCount(newData.subscribers.length);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [videoOwnerAddress, address]);

  // Handle subscribing/unsubscribing
  const handleSubscriptionToggle = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet to subscribe");
      return;
    }

    if (address === videoOwnerAddress) {
      toast.error("You cannot subscribe to your own channel");
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();

      // Get current user's subscribed list
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("subscribed")
        .eq("walletAddress", address)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
        toast.error("Failed to update subscription");
        return;
      }

      // Get channel owner's subscribers list
      const { data: channelData, error: channelError } = await supabase
        .from("users")
        .select("subscribers")
        .eq("walletAddress", videoOwnerAddress)
        .single();

      if (channelError) {
        console.error("Error fetching channel data:", channelError);
        toast.error("Failed to update subscription");
        return;
      }

      // Initialize arrays if they don't exist
      let userSubscribed = userData?.subscribed || [];
      let channelSubscribers = channelData?.subscribers || [];

      if (!Array.isArray(userSubscribed)) userSubscribed = [];
      if (!Array.isArray(channelSubscribers)) channelSubscribers = [];

      // Update subscription status
      if (isSubscribed) {
        // Unsubscribe
        userSubscribed = userSubscribed.filter(
          (addr: string) => addr !== videoOwnerAddress
        );
        channelSubscribers = channelSubscribers.filter(
          (addr: string) => addr !== address
        );
      } else {
        // Subscribe
        userSubscribed = [...userSubscribed, videoOwnerAddress];
        channelSubscribers = [...channelSubscribers, address as string];
      }

      // Update user's subscribed list
      const { error: updateUserError } = await supabase
        .from("users")
        .update({ subscribed: userSubscribed })
        .eq("walletAddress", address);

      if (updateUserError) {
        console.error("Error updating user subscriptions:", updateUserError);
        toast.error("Failed to update subscription");
        return;
      }

      // Update channel owner's subscribers list
      const { error: updateChannelError } = await supabase
        .from("users")
        .update({ subscribers: channelSubscribers })
        .eq("walletAddress", videoOwnerAddress);

      if (updateChannelError) {
        console.error(
          "Error updating channel subscribers:",
          updateChannelError
        );
        toast.error("Failed to update subscription");
        return;
      }

      // Update local state
      setIsSubscribed(!isSubscribed);
      setSubscribersCount(channelSubscribers.length);

      // Show success message
      toast.success(
        isSubscribed ? "Unsubscribed successfully" : "Subscribed successfully"
      );
    } catch (err) {
      console.error("Error toggling subscription:", err);
      toast.error("Failed to update subscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
      <div className="lg:w-8/12">
        {/* NSFW Content Verification Banner */}
        <div className="bg-green-500/20 text-green-400 mb-4 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          <p className="text-sm">
            This video content has been verified and is appropriate for all
            viewers.
          </p>
        </div>

        {/* Video Player */}
        <div className="relative pb-[56.25%] mb-4">
          <video
            src={video.url}
            controls
            autoPlay
            className="absolute inset-0 w-full h-full rounded-lg shadow-lg"
          />
        </div>

        {/* Video Title */}
        <h1 className="text-xl md:text-2xl font-bold mb-2">{video.title}</h1>

        {/* Video Stats */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-400 text-sm">
            {formatDate(video.created_at)}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 hover:bg-zinc-800 p-2 rounded-full">
              <ThumbsUp size={20} />
              <span className="hidden sm:inline">Like</span>
            </button>
            <button className="flex items-center gap-1 hover:bg-zinc-800 p-2 rounded-full">
              <ThumbsDown size={20} />
              <span className="hidden sm:inline">Dislike</span>
            </button>
            <button className="flex items-center gap-1 hover:bg-zinc-800 p-2 rounded-full">
              <Share2 size={20} />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button className="flex items-center gap-1 hover:bg-zinc-800 p-2 rounded-full">
              <BookmarkPlus size={20} />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-full">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Channel Info */}
        <div className="flex justify-between items-center p-3 bg-zinc-800/40 rounded-lg mb-4">
          <div className="flex gap-3 items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <span>{emoji}</span>
            </div>
            <div>
              <h3 className="font-semibold">
                {shortenAddress(videoOwnerAddress)}
              </h3>
              <p className="text-gray-400 text-sm">
                {formatNumber(subscribersCount)} subscribers
              </p>
            </div>
          </div>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isSubscribed
                ? "bg-zinc-700 text-white hover:bg-zinc-600"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            onClick={handleSubscriptionToggle}
            disabled={isLoading || address === videoOwnerAddress}
          >
            {isLoading
              ? "Loading..."
              : isSubscribed
              ? "Subscribed"
              : "Subscribe"}
          </button>
        </div>

        {/* Description */}
        <div className="bg-zinc-800/40 p-4 rounded-lg mb-6">
          <p className="text-gray-300 whitespace-pre-line">
            {video.description}
          </p>
          {video.tags && video.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap text-sm text-blue-400 mt-2">
              {/* {video.tags?.map((tag, i) => (
                <span key={i} className="hover:underline cursor-pointer">
                  #{tag}
                </span>
              ))} */}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Related Videos */}
      <div className="lg:w-4/12">
        <h3 className="text-lg font-semibold mb-4">Related Videos</h3>
        <div className="space-y-4">
          {relatedVideos.map((video) => {
            const relatedVideoOwner = video.wallet_address || "";
            const { emoji: relatedEmoji, color: relatedColor } =
              emojiAvatarForAddress(relatedVideoOwner);

            return (
              <div
                key={video.id}
                className="flex gap-2 cursor-pointer"
                onClick={() => (window.location.href = `/watch/${video.id}`)}
              >
                <div className="w-40 h-24 relative flex-shrink-0">
                  <div className="absolute inset-0 bg-zinc-800 rounded">
                    {/* Video thumbnail placeholder */}
                    <div className="flex items-center justify-center h-full text-zinc-600">
                      Video
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium line-clamp-2">
                    {video.title}
                  </h4>
                  <div className="flex items-center gap-1 mt-1">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                      style={{ backgroundColor: relatedColor }}
                    >
                      {relatedEmoji}
                    </div>
                    <p className="text-gray-400 text-xs">
                      {shortenAddress(relatedVideoOwner)}
                    </p>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {formatDate(video.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
