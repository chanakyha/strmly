"use client";

import { useAccount } from "wagmi";
import { useEffect, useState, useRef, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { emojiAvatarForAddress } from "@/lib/emojiAvatarForAddress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { readContract } from "@wagmi/core";
import { ABI } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { contractAddress } from "@/lib/utils";
import { config } from "@/lib/config";

// Define User interface to avoid type errors
interface User {
  walletAddress: string;
  name: string;
  bio: string;
  tags: string[];
  created_at: string;
  subscribers?: string[]; // Array of wallet addresses that subscribed
  subscribed?: string[]; // Array of wallet addresses this user subscribed to
}

interface ProfileData {
  userData: User;
  subscribedProfiles: {
    walletAddress: string;
    name: string;
  }[];
}

// Sample video/stream data interface
interface Content {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  timestamp: string;
  isLive: boolean;
}

// Sample NFT data interface
interface NFT {
  id: string;
  name: string;
  image: string;
  collection: string;
  tokenId: string;
}

export default function ProfilePage({
  profileData,
}: {
  profileData: ProfileData;
}) {
  const { address } = useAccount();
  const [userData, setUserData] = useState<User | null>(profileData.userData);
  const [isEditing, setIsEditing] = useState(false);
  const [payoutBalance, setPayoutBalance] = useState(0);
  const [editForm, setEditForm] = useState<{
    name: string;
    bio: string;
    tags: string[];
  }>({
    name: profileData.userData.name || "",
    bio: profileData.userData.bio || "",
    tags: profileData.userData.tags || [],
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [openNftDialog, setOpenNftDialog] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // State for subscribed profiles - initialized with server data
  const [subscribedProfiles, setSubscribedProfiles] = useState(
    profileData.subscribedProfiles
  );
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Calculate subscribers count from the subscribers array
  const subscribersCount = userData?.subscribers?.length || 0;

  // Mock data for videos and streams - would be replaced with actual API calls
  const content: Content[] = [
    {
      id: "1",
      title: "Exploring the Latest Blockchain Trends",
      thumbnail:
        "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1632&auto=format&fit=crop",
      views: 1240,
      timestamp: "2023-10-15T14:30:00Z",
      isLive: false,
    },
    {
      id: "2",
      title: "Live Coding Session: Building a Dapp",
      thumbnail:
        "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1470&auto=format&fit=crop",
      views: 856,
      timestamp: "2023-11-02T10:00:00Z",
      isLive: true,
    },
    {
      id: "3",
      title: "NFT Creation Workshop",
      thumbnail:
        "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1374&auto=format&fit=crop",
      views: 2560,
      timestamp: "2023-10-28T15:45:00Z",
      isLive: false,
    },
  ];

  // Mock data for NFTs
  const nfts: NFT[] = [
    {
      id: "nft1",
      name: "Crypto Punk #3491",
      image:
        "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?q=80&w=1374&auto=format&fit=crop",
      collection: "CryptoPunks",
      tokenId: "3491",
    },
    {
      id: "nft2",
      name: "Bored Ape #7821",
      image:
        "https://images.unsplash.com/photo-1643101807592-cee57fee2a0f?q=80&w=1374&auto=format&fit=crop",
      collection: "BAYC",
      tokenId: "7821",
    },
    {
      id: "nft3",
      name: "Azuki #5532",
      image:
        "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?q=80&w=1332&auto=format&fit=crop",
      collection: "Azuki",
      tokenId: "5532",
    },
    {
      id: "nft4",
      name: "Doodle #9921",
      image:
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1470&auto=format&fit=crop",
      collection: "Doodles",
      tokenId: "9921",
    },
  ];

  // Mock AI-generated bio - would be replaced with an actual AI generation API call
  const aiBioWriteup = {
    summary:
      "Dynamic blockchain content creator with engaging presentation style",
    analysis:
      "Based on your profile activity, content patterns, and audience engagement, you showcase a deep understanding of blockchain technologies with a talent for making complex topics accessible. Your live coding sessions have particularly high retention rates, and your explanatory style resonates well with both beginners and experienced developers. Your consistent posting schedule and responsive community engagement suggest you're building a loyal audience base. Consider expanding your NFT workshop series which shows strong growth potential based on view metrics and comment sentiment.",
    strengths: [
      "Clear technical explanations",
      "Engaging presentation style",
      "Growing community engagement",
      "Consistent posting schedule",
    ],
    suggestions: [
      "Expand NFT workshop series",
      "Consider more collaborative content",
      "Try shorter format explainers for broader reach",
    ],
  };

  // Check if current user is the profile owner
  const isProfileOwner = address === profileData.userData.walletAddress;

  // Get emoji avatar for the address
  const { emoji, color } = emojiAvatarForAddress(
    profileData.userData.walletAddress || ""
  );

  // Check subscription status on load and setup real-time updates
  useEffect(() => {
    if (!address) return;

    const checkSubscriptionStatus = async () => {
      try {
        const supabase = createClient();

        // Fetch current user data to check subscriptions
        const { data, error } = await supabase
          .from("users")
          .select("subscribed")
          .eq("walletAddress", address)
          .single();

        if (error) {
          console.error("Error checking subscription:", error);
          return;
        }

        // Check if user is subscribed to this profile
        if (data?.subscribed && Array.isArray(data.subscribed)) {
          setIsSubscribed(
            data.subscribed.includes(profileData.userData.walletAddress)
          );
        }
      } catch (err) {
        console.error("Error in subscription check:", err);
      }
    };

    checkSubscriptionStatus();
  }, [address, profileData.userData.walletAddress]);

  useEffect(() => {
    if (!address) return;

    const fetchPayoutBalance = async () => {
      try {
        const result = await readContract(config,{
          abi: ABI,
          address: contractAddress,
          functionName: "checkBalance",
        });
        console.log("Payout balance:", result);
        //covert bigint to number
        const balance = Number(result) / 1e18; // Convert from wei to ether
        setPayoutBalance(balance);
        

      } catch (err) {
        console.error("Error fetching payout balance:", err);
      }
    };

    fetchPayoutBalance();
  },[]);
  

  // Setup real-time subscription for the profile data
  useEffect(() => {
    const supabase = createClient();

    // Set up real-time subscription
    const subscription = supabase
      .channel("users-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `walletAddress=eq.${profileData.userData.walletAddress}`,
        },
        (payload) => {
          console.log("Change received!", payload);
          const newData = payload.new as User;
          setUserData(newData);

          // If subscribed profiles have changed and this is the user's profile,
          // fetch the updated profiles data
          if (
            isProfileOwner &&
            newData.subscribed &&
            (!userData?.subscribed ||
              JSON.stringify(newData.subscribed) !==
                JSON.stringify(userData.subscribed))
          ) {
            fetchSubscribedProfilesRealtime(newData.subscribed);
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [profileData.userData.walletAddress, isProfileOwner, userData]);

  // Helper function to fetch subscribed profiles when real-time update occurs
  const fetchSubscribedProfilesRealtime = async (
    subscribedAddresses: string[]
  ) => {
    if (!subscribedAddresses.length) {
      setSubscribedProfiles([]);
      return;
    }

    try {
      setLoadingSubscribers(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("users")
        .select("walletAddress, name")
        .in("walletAddress", subscribedAddresses);

      if (error) {
        console.error("Error fetching subscribed profiles:", error);
        return;
      }

      if (data) {
        setSubscribedProfiles(data);
      }
    } catch (err) {
      console.error("Error in subscribed profiles fetch:", err);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTagsChange = (newTags: string[]) => {
    setEditForm((prev) => ({
      ...prev,
      tags: newTags,
    }));
  };

  const handleSaveProfile = async () => {
    if (!address || !userData || !isProfileOwner) return;

    try {
      setUpdateLoading(true);

      const supabase = createClient();

      const { error } = await supabase
        .from("users")
        .update({
          name: editForm.name,
          bio: editForm.bio,
          tags: editForm.tags,
        })
        .eq("walletAddress", address);

      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile");
      } else {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Error in profile update:", err);
      toast.error("Failed to update profile");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (!userData) return;

    // Reset form data to current user data
    setEditForm({
      name: userData.name || "",
      bio: userData.bio || "",
      tags: userData.tags || [],
    });

    setIsEditing(false);
  };

  // Function to format relative time
  const getRelativeTimeString = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "moments ago";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${
        diffInMinutes === 1 ? "minute" : "minutes"
      } ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
  };

  // Handle subscription toggle
  const handleSubscriptionToggle = async () => {
    if (!address || isProfileOwner) return;

    try {
      setSubscribeLoading(true);

      // Save original subscription state for animation logic later
      const wasSubscribed = isSubscribed;

      const supabase = createClient();

      // First get current user data
      const { data: currentUserData, error: userError } = await supabase
        .from("users")
        .select("subscribed, walletAddress")
        .eq("walletAddress", address)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
        toast.error("Failed to update subscription");
        setSubscribeLoading(false);
        return;
      }

      // Get target profile data
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("subscribers, walletAddress")
        .eq("walletAddress", userData?.walletAddress)
        .single();

      if (profileError) {
        console.error("Error fetching profile data:", profileError);
        toast.error("Failed to update subscription");
        setSubscribeLoading(false);
        return;
      }

      // Initialize arrays if they don't exist
      let userSubscribed = currentUserData?.subscribed || [];
      let profileSubscribers = profileData?.subscribers || [];

      if (!Array.isArray(userSubscribed)) userSubscribed = [];
      if (!Array.isArray(profileSubscribers)) profileSubscribers = [];

      // Update the arrays based on subscription action
      if (isSubscribed) {
        // Remove subscription
        userSubscribed = userSubscribed.filter(
          (addr: string) => addr !== userData?.walletAddress
        );
        profileSubscribers = profileSubscribers.filter(
          (addr: string) => addr !== address
        );
      } else {
        // Add subscription
        userSubscribed = [...userSubscribed, userData?.walletAddress || ""];
        profileSubscribers = [...profileSubscribers, address];
      }

      // Update the current user's subscribed array
      const { error: updateUserError } = await supabase
        .from("users")
        .update({ subscribed: userSubscribed })
        .eq("walletAddress", address);

      if (updateUserError) {
        console.error("Error updating user subscriptions:", updateUserError);
        toast.error("Failed to update subscription");
        setSubscribeLoading(false);
        return;
      }

      // Update the profile's subscribers array
      const { error: updateProfileError } = await supabase
        .from("users")
        .update({ subscribers: profileSubscribers })
        .eq("walletAddress", userData?.walletAddress);

      if (updateProfileError) {
        console.error(
          "Error updating profile subscribers:",
          updateProfileError
        );
        toast.error("Failed to update subscription");
        setSubscribeLoading(false);
        return;
      }

      // Update the local user data to reflect changes
      setUserData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subscribers: profileSubscribers,
        };
      });

      // Toggle local subscription state
      setIsSubscribed(!isSubscribed);

      // Show confetti animation if subscribing (not unsubscribing)
      if (!wasSubscribed) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }

      toast.success(
        isSubscribed ? "Unsubscribed successfully" : "Subscribed successfully"
      );
    } catch (err) {
      console.error("Error toggling subscription:", err);
      toast.error("Failed to update subscription");
    } finally {
      setSubscribeLoading(false);
    }
  };

  // Function to generate random confetti
  const generateConfetti = () => {
    if (!buttonRef.current) return null;

    const confettiCount = 50;
    const colors = [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#ffff00",
      "#ff00ff",
      "#00ffff",
    ];

    return Array.from({ length: confettiCount }).map((_, index) => {
      const left = Math.random() * 100;
      const animationDuration = Math.random() * 1 + 1; // 1-2s
      const delay = Math.random() * 0.5;
      const initialRotation = Math.random() * 360;
      const color = colors[Math.floor(Math.random() * colors.length)];

      return (
        <motion.div
          key={index}
          className="absolute rounded-sm w-2 h-2 pointer-events-none"
          initial={{
            top: 0,
            left: `${left}%`,
            opacity: 1,
            rotate: initialRotation,
            scale: 0,
          }}
          animate={{
            top: "150px",
            opacity: 0,
            rotate: initialRotation + 360,
            scale: 1,
          }}
          transition={{
            duration: animationDuration,
            delay: delay,
            ease: "easeOut",
          }}
          style={{ backgroundColor: color }}
        />
      );
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Banner Area - Similar to YouTube/Twitch */}
      <div className="w-full h-48 bg-gradient-to-r from-secondary/50 to-primary/30 rounded-t-lg mb-16 relative">
        {/* Profile Avatar */}
        <div className="absolute -bottom-12 left-8 flex items-end">
          <div
            className="h-24 w-24 rounded-full flex items-center justify-center text-4xl border-4 border-background"
            style={{ backgroundColor: color }}
          >
            {emoji}
          </div>
          <div className="ml-4 mb-2">
            <h1 className="text-2xl font-bold text-foreground">
              {userData?.name || "Crypto User"}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {profileData.userData.walletAddress &&
                `${profileData.userData.walletAddress.substring(
                  0,
                  6
                )}...${profileData.userData.walletAddress.substring(
                  profileData.userData.walletAddress.length - 4
                )}`}
            </p>
            {/* Add subscriber count */}
            <p className="text-sm font-medium mt-1">
              <span className="text-primary font-bold">{subscribersCount}</span>{" "}
              subscribers
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          {!isProfileOwner && address && (
            <div className="relative">
              <motion.button
                ref={buttonRef}
                onClick={handleSubscriptionToggle}
                disabled={subscribeLoading}
                className={`relative overflow-hidden rounded-md px-4 py-2 font-medium inline-flex items-center justify-center transition-all duration-300 ${
                  isSubscribed
                    ? "bg-transparent text-foreground border border-input hover:bg-accent hover:text-accent-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
              >
                {subscribeLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <AnimatePresence mode="wait">
                    {isSubscribed ? (
                      <motion.span
                        className="flex items-center"
                        key="subscribed"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4 mr-1"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Subscribed
                      </motion.span>
                    ) : (
                      <motion.span
                        key="subscribe"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        Subscribe
                      </motion.span>
                    )}
                  </AnimatePresence>
                )}

                {/* Ripple effect on click */}
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-md bg-primary/10"
                  initial={{ scale: 0, opacity: 0.5 }}
                  whileTap={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              </motion.button>

              {/* Confetti Animation Container */}
              <AnimatePresence>
                {showConfetti && (
                  <div className="absolute inset-x-0 -top-4 h-40 overflow-hidden pointer-events-none">
                    {generateConfetti()}
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {userData && !isEditing && isProfileOwner && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="secondary"
              className="font-medium"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - About Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              // Edit Form
              <div className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-foreground"
                  >
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="bio"
                    className="block text-sm font-medium text-foreground"
                  >
                    Bio
                  </label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={editForm.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="tags"
                    className="block text-sm font-medium text-foreground"
                  >
                    Tags
                  </label>
                  <TagInput
                    value={editForm.tags}
                    onChange={handleTagsChange}
                    placeholder="Add skill or interest"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={updateLoading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={updateLoading}>
                    {updateLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : userData ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Bio</h3>
                  <p className="text-foreground whitespace-pre-wrap">
                    {userData.bio || "No bio provided"}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Profile Created</h3>
                  <p className="text-foreground">
                    {getRelativeTimeString(new Date(userData.created_at))}
                  </p>
                </div>

                {/* AI Profile Analysis */}
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 mr-2 text-primary"
                    >
                      <rect
                        x="2"
                        y="3"
                        width="20"
                        height="14"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                      <path d="M7 7h1"></path>
                      <path d="M7 11h1"></path>
                      <path d="M16 7h1"></path>
                      <path d="M16 11h1"></path>
                      <path d="M10 11h4"></path>
                    </svg>
                    AI Profile Analysis
                  </h3>

                  <div className="bg-muted/40 p-4 rounded-lg">
                    <div className="mb-3">
                      <div className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary mb-2">
                        {aiBioWriteup.summary}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">
                        {aiBioWriteup.analysis}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          STRENGTHS
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {aiBioWriteup.strengths.map((strength, index) => (
                            <span
                              key={index}
                              className="inline-block text-xs px-2 py-1 rounded-full bg-secondary/50 text-secondary-foreground"
                            >
                              {strength}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          SUGGESTIONS
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {aiBioWriteup.suggestions.map((suggestion, index) => (
                            <span
                              key={index}
                              className="inline-block text-xs px-2 py-1 rounded-full bg-accent/50 text-accent-foreground"
                            >
                              {suggestion}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end mt-4">
                      <p className="text-xs text-muted-foreground italic">
                        Generated by AI based on profile activity
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4">
                <p className="text-muted-foreground">No profile data found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Tags / Stats Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {userData && userData.tags && userData.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userData.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tags added</p>
              )}
            </CardContent>
          </Card>

          {/* NFT Collection Section - Displayed as card deck */}
          <Card>
            <CardHeader>
              <CardTitle>NFT Collection</CardTitle>
            </CardHeader>
            <CardContent>
              {nfts.length > 0 ? (
                <Dialog open={openNftDialog} onOpenChange={setOpenNftDialog}>
                  <DialogTrigger asChild>
                    <div className="relative h-16 cursor-pointer group">
                      {nfts
                        .slice(0, Math.min(5, nfts.length))
                        .map((nft, index) => (
                          <div
                            key={nft.id}
                            className="absolute rounded-md border overflow-hidden group-hover:brightness-110 transition-all"
                            style={{
                              width: "48px",
                              height: "48px",
                              left: `${index * 20}px`,
                              zIndex: index,
                              transform: `rotate(${(index - 2) * 3}deg)`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            }}
                          >
                            <img
                              src={nft.image}
                              alt={nft.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}

                      {nfts.length > 5 && (
                        <div
                          className="absolute flex items-center justify-center rounded-md border overflow-hidden bg-muted group-hover:brightness-110 transition-all"
                          style={{
                            width: "48px",
                            height: "48px",
                            left: `${5 * 20}px`,
                            zIndex: 5,
                            transform: `rotate(${(5 - 2) * 3}deg)`,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        >
                          <span className="text-xs font-medium">
                            +{nfts.length - 5}
                          </span>
                        </div>
                      )}

                      <div className="absolute left-0 right-0 mt-14 text-xs text-center text-muted-foreground group-hover:text-primary transition-colors">
                        Click to view all
                      </div>
                    </div>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>NFT Collection</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 max-h-[60vh] overflow-y-auto p-1">
                      {nfts.map((nft) => (
                        <Card
                          key={nft.id}
                          className="overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="relative h-40">
                            <img
                              src={nft.image}
                              alt={nft.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="p-3">
                            <h3 className="font-medium text-sm truncate">
                              {nft.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {nft.collection} #{nft.tokenId}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <p className="text-muted-foreground">No NFTs in collection</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-t border-border pt-4">
              <CardTitle>Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {profileData.userData.walletAddress}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscribed Profiles Section - only shown on user's own profile */}
      {isProfileOwner && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6">Profiles You Follow</h2>

          <div className="relative">
            {loadingSubscribers ? (
              <div className="flex items-center justify-center h-20">
                <div className="flex space-x-2 items-center">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                  <div
                    className="h-2 w-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="h-2 w-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                  <span className="ml-2 text-muted-foreground">
                    Loading profiles you follow...
                  </span>
                </div>
              </div>
            ) : subscribedProfiles.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-6">
                <TooltipProvider>
                  {subscribedProfiles.map((profile) => {
                    const { emoji, color } = emojiAvatarForAddress(
                      profile.walletAddress
                    );

                    return (
                      <Tooltip key={profile.walletAddress}>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/streamer/${profile.walletAddress}`}
                            className="block transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full"
                          >
                            <motion.div
                              className="h-12 w-12 rounded-full flex items-center justify-center text-xl border-2 border-background"
                              style={{ backgroundColor: color }}
                              whileHover={{ y: -5 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 15,
                              }}
                            >
                              {emoji}
                            </motion.div>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {profile.name ||
                              `User ${profile.walletAddress.substring(
                                0,
                                6
                              )}...`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg border-muted">
                <p className="text-muted-foreground">
                  You are not following any profiles yet
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Subscribe to profiles to see them here
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Section (Videos & Streams) with Tabs */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-6">Content</h2>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="streams">Live Streams</TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.filter((item) => !item.isLive).length > 0 ? (
                content
                  .filter((item) => !item.isLive)
                  .map((item) => (
                    <Card
                      key={item.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {item.views.toLocaleString()} views
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-2 h-12">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2">
                          {getRelativeTimeString(new Date(item.timestamp))}
                        </p>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-lg text-muted-foreground">
                    No videos uploaded yet
                  </p>
                  {isProfileOwner && (
                    <Button className="mt-4" variant="outline">
                      Upload Your First Video
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="streams">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.filter((item) => item.isLive).length > 0 ? (
                content
                  .filter((item) => item.isLive)
                  .map((item) => (
                    <Card
                      key={item.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          LIVE
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {item.views.toLocaleString()} viewers
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-2 h-12">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2">
                          Started{" "}
                          {getRelativeTimeString(new Date(item.timestamp))}
                        </p>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-lg text-muted-foreground">
                    No active streams
                  </p>
                  {isProfileOwner && (
                    <Button className="mt-4" variant="outline">
                      Start Streaming
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
