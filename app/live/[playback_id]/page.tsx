"use client";

import { useState, useEffect, useRef } from "react";
import { writeContract } from '@wagmi/core'
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { createClient } from "@/lib/supabase/client";
import { emojiAvatarForAddress } from "@/lib/emojiAvatarForAddress";
import { getPlaybackSource, deleteStream, contractAddress, ABI } from "@/lib/utils";
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
  AtSign,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaEthereum } from "react-icons/fa";
import { config } from "@/lib/config";
import { parseEther } from "viem";

// Convert timestamp to relative time format
const getRelativeTimeFormat = (timestamp: string) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInSeconds = Math.floor(
    (now.getTime() - messageTime.getTime()) / 1000
  );

  if (diffInSeconds < 10) {
    return "just now";
  } else if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
};

// Bot configuration
const LY_BOT = {
  name: "ly bot",
  walletAddress: "0xb0taddr355000000000000000000000000000000",
  emoji: "🤖",
  color: "#6366f1",
  description: "AI assistant bot",
};

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
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<LiveChatMessage | null>(null);
  const [chatParticipants, setChatParticipants] = useState<string[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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

          // Fetch initial chat messages
          const { data: chatData, error: chatError } = await supabase
            .from("live-chats")
            .select("*")
            .eq("playback_id", params.playback_id)
            .order("created_at", { ascending: true })
            .limit(50);

          if (chatError) {
            console.error("Error fetching chat messages:", chatError);
          } else if (chatData) {
            setChatMessages(chatData as LiveChatMessage[]);

            // Extract unique participant addresses
            const participants = Array.from(
              new Set(chatData.map((msg: LiveChatMessage) => msg.walletAddress))
            );
            setChatParticipants(participants);
          }
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

    // Set up real-time subscription for chat messages
    const chatSubscription = supabase
      .channel(`live-chat-${params.playback_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live-chats",
          filter: `playback_id=eq.${params.playback_id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Add new message to the chat
            const newMessage = payload.new as LiveChatMessage;
            setChatMessages((prevMessages) => [...prevMessages, newMessage]);

            // Add new participant if not already in list
            setChatParticipants((prev) => {
              if (!prev.includes(newMessage.walletAddress)) {
                return [...prev, newMessage.walletAddress];
              }
              return prev;
            });
          } else if (payload.eventType === "DELETE") {
            // Remove deleted message from chat
            const deletedMessage = payload.old as LiveChatMessage;
            setChatMessages((prevMessages) =>
              prevMessages.filter((msg) => msg.id !== deletedMessage.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      chatSubscription.unsubscribe();
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

  const handleShareClick = () => {
    // Copy current URL to clipboard
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");

    // Open dropdown for social media options
    setShareDropdownOpen(true);
  };

  const shareToSocialMedia = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(
      `Check out this live stream: ${liveData?.title || ""}`
    );

    let shareUrl = "";

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, "_blank", "width=600,height=400");
    setShareDropdownOpen(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !address || !params.playback_id) return;

    try {
      setSendingMessage(true);
      const supabase = createClient();

      const { error } = await supabase.from("live-chats").insert({
        message: newMessage.trim(),
        walletAddress: address,
        playback_id: params.playback_id,
        reply_to: replyingTo ? replyingTo.id : null,
      });

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        return;
      }

      // Check if message contains a mention of ly bot
      if (newMessage.includes("@ly bot")) {
        try {
          // Send request to partition chat bot donation endpoint
          const response = await fetch("/api/partitionChatBotDonation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chatMessage: newMessage.trim(),
              walletAddress: address,
              playback_id: params.playback_id,
              timestamp: new Date().toISOString(),
            }),
          });

          if (!response.ok) {
            alert("Failed to process bot request");
            console.error(
              "Failed to process bot request:",
              await response.text()
            );
          }
          
            
            const { result, status } = await response.json();
            const { data:streamerID , error } = await supabase.from("lives").select("walletAddress").eq("playback_id", params.playback_id).single();
            console.log("Streamer ID:", streamerID);
            console.log("ParseEther:", parseEther(result.amount));
            // writeContract(config, {
            //   address: contractAddress,
            //   abi: ABI,
            //   functionName: "donateToStreamer",
            //   args: [streamerID,result.message],
            //   value: parseEther(result.amount),
      
            // })
              // .then(result => {
              //   alert("Donation sent successfully");
              //   //setAiResponse(${data.amount} ETH is sent to the streamer);
              //   console.log("Donation sent successfully");
              //   toast.success("Donation sent successfully");
              // })
              // .catch(e => {
              //   console.error("Error sending donation:", e);
              // });
            
          
        } catch (botError) {
          console.error("Error sending request to bot API:", botError);
        }
      }

      // Clear input after sending
      setNewMessage("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Error in handleSendMessage:", err);
      toast.error("Something went wrong");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReplyToMessage = (message: LiveChatMessage) => {
    setReplyingTo(message);
    // Focus the input field after setting the reply
    setTimeout(() => {
      const inputElement = document.getElementById("chat-input");
      if (inputElement) {
        inputElement.focus();
      }
    }, 0);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Function to find a message by ID
  const findMessageById = (id: number): LiveChatMessage | undefined => {
    return chatMessages.find((msg) => msg.id === id);
  };

  const handleTagUser = (walletAddress: string, isBot = false) => {
    // Insert the tagged user at the current cursor position
    const beforeTag = newMessage.substring(0, cursorPosition);
    const afterTag = newMessage.substring(cursorPosition);

    // Format tag differently for bot vs regular user
    let tagText;
    if (isBot) {
      tagText = `@ly bot `;
    } else {
      // Regular wallet address
      const shortWallet = `${walletAddress.substring(
        0,
        6
      )}...${walletAddress.substring(walletAddress.length - 4)}`;
      tagText = `@${shortWallet} `;
    }

    // Set the new message with the tag inserted
    setNewMessage(beforeTag + tagText + afterTag);

    // Hide the tag menu
    setShowTagMenu(false);

    // Focus the input and set cursor position after the tag
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPosition = beforeTag.length + tagText.length;
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Store current cursor position for tag insertion
    setCursorPosition(e.target.selectionStart || 0);

    // Check if we should show the tag menu
    // Show when typing @ and hide when deleting it
    const lastAtSymbol = value.lastIndexOf("@", cursorPosition - 1);
    if (lastAtSymbol !== -1) {
      const textAfterAt = value.substring(lastAtSymbol + 1, cursorPosition);
      // Only show if @ is followed directly by the cursor or there's text without spaces
      if (textAfterAt === "" || !/\s/.test(textAfterAt)) {
        setTagQuery(textAfterAt);
        setShowTagMenu(true);
        return;
      }
    }

    setShowTagMenu(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Close tag menu on escape
    if (e.key === "Escape" && showTagMenu) {
      setShowTagMenu(false);
      e.preventDefault();
    }
  };

  // Filter participants based on tag query
  const filteredParticipants = tagQuery
    ? chatParticipants.filter(
        (addr) =>
          addr.toLowerCase().includes(tagQuery.toLowerCase()) ||
          `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
            .toLowerCase()
            .includes(tagQuery.toLowerCase())
      )
    : chatParticipants;

  // Check if the bot should be included in the filtered results
  const shouldShowBot =
    !tagQuery ||
    LY_BOT.name.toLowerCase().includes(tagQuery.toLowerCase()) ||
    "bot".toLowerCase().includes(tagQuery.toLowerCase());

  // Parse message to highlight tagged users
  const renderMessageWithTags = (message: string) => {
    // Handle both regular wallet tags and the bot tag
    const parts = message.split(
      /(@[a-zA-Z0-9]{6}\.{3}[a-zA-Z0-9]{4}|@ly bot)/g
    );
    return parts.map((part, index) => {
      if (
        part.startsWith("@") &&
        (/^@[a-zA-Z0-9]{6}\.{3}[a-zA-Z0-9]{4}$/.test(part) ||
          part === "@ly bot")
      ) {
        return (
          <span
            key={index}
            className={`px-1 rounded flex items-center gap-1 ${
              part === "@ly bot"
                ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                : "bg-secondary/30 text-primary-foreground"
            }`}
          >
            {part === "@ly bot" && (
              <FaEthereum className="text-indigo-500" size={12} />
            )}
            {part}
          </span>
        );
      }
      return part;
    });
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
                    <DropdownMenu
                      open={shareDropdownOpen}
                      onOpenChange={setShareDropdownOpen}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex gap-1 items-center"
                          onClick={handleShareClick}
                        >
                          <Share2 size={18} />
                          <span>Share</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => shareToSocialMedia("twitter")}
                        >
                          Share to Twitter
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => shareToSocialMedia("facebook")}
                        >
                          Share to Facebook
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => shareToSocialMedia("linkedin")}
                        >
                          Share to LinkedIn
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
              <div className="p-3 border-b bg-secondary/5 flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageCircle size={16} className="text-primary/80" />
                  Live Chat
                </h3>
                <div className="text-xs text-muted-foreground">
                  {chatMessages.length}{" "}
                  {chatMessages.length === 1 ? "message" : "messages"}
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-background/50 space-y-4">
                {chatMessages.length > 0 ? (
                  <div className="space-y-5">
                    {chatMessages.map((msg) => {
                      const msgAvatar = emojiAvatarForAddress(
                        msg.walletAddress
                      );
                      const isCurrentUser = address === msg.walletAddress;
                      const replyToMessage = msg.reply_to
                        ? findMessageById(msg.reply_to)
                        : undefined;
                      const relativeTime = getRelativeTimeFormat(
                        msg.created_at
                      );

                      return (
                        <div key={msg.id} className="group">
                          {/* If this is a reply, show the original message */}
                          {replyToMessage && (
                            <div
                              className={`mb-1 ${
                                isCurrentUser
                                  ? "text-right mr-2"
                                  : "text-left ml-10"
                              }`}
                            >
                              <div className="bg-secondary/10 px-3 py-1.5 rounded-md inline-block max-w-[85%] border border-border/50">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                                    style={{
                                      backgroundColor: emojiAvatarForAddress(
                                        replyToMessage.walletAddress
                                      ).color,
                                    }}
                                  >
                                    {
                                      emojiAvatarForAddress(
                                        replyToMessage.walletAddress
                                      ).emoji
                                    }
                                  </div>
                                  <span className="text-xs font-medium">
                                    {replyToMessage.walletAddress.substring(
                                      0,
                                      6
                                    )}
                                    ...
                                    {replyToMessage.walletAddress.substring(
                                      replyToMessage.walletAddress.length - 4
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {getRelativeTimeFormat(
                                      replyToMessage.created_at
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {replyToMessage.message.length > 60
                                    ? `${replyToMessage.message.substring(
                                        0,
                                        60
                                      )}...`
                                    : replyToMessage.message}
                                </p>
                              </div>
                            </div>
                          )}

                          <div
                            className={`flex ${
                              isCurrentUser ? "justify-end" : "items-start"
                            }`}
                          >
                            {!isCurrentUser && (
                              <div className="mr-2 mt-1">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 shadow-sm border border-border/40"
                                  style={{ backgroundColor: msgAvatar.color }}
                                >
                                  {msgAvatar.emoji}
                                </div>
                              </div>
                            )}

                            <div className="relative max-w-[95%]">
                              <div
                                className={`px-4 py-3 rounded-lg shadow-sm ${
                                  isCurrentUser
                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                    : msg.message.includes("@ly bot")
                                    ? "bg-indigo-600/90 text-white rounded-tl-none"
                                    : "bg-card rounded-tl-none"
                                }`}
                              >
                                {/* Sender info with emoji */}
                                {!isCurrentUser && (
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <span className="text-xs font-medium">
                                      {msg.walletAddress.substring(0, 6)}...
                                      {msg.walletAddress.substring(
                                        msg.walletAddress.length - 4
                                      )}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      • {relativeTime}
                                    </span>
                                  </div>
                                )}

                                {/* Message content with tag highlighting */}
                                <p
                                  className={`text-sm break-words leading-relaxed ${
                                    msg.message.includes("@ly bot")
                                      ? "text-indigo-100"
                                      : ""
                                  }`}
                                >
                                  {renderMessageWithTags(msg.message)}
                                </p>

                                {/* Timestamp for current user */}
                                {isCurrentUser && (
                                  <div className="text-xs text-right mt-1.5 opacity-70">
                                    {relativeTime}
                                  </div>
                                )}
                              </div>

                              {/* Reply button - only visible on hover */}
                              {address && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="absolute -bottom-4 right-0 h-6 px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                  onClick={() => handleReplyToMessage(msg)}
                                >
                                  Reply
                                </Button>
                              )}
                            </div>

                            {isCurrentUser && (
                              <div className="ml-2 mt-1">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 shadow-sm border border-border/40"
                                  style={{ backgroundColor: msgAvatar.color }}
                                >
                                  {msgAvatar.emoji}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center p-6 bg-card rounded-lg border border-border/50 shadow-sm max-w-[80%]">
                      <MessageCircle
                        className="mx-auto mb-3 opacity-20"
                        size={32}
                      />
                      <p className="text-muted-foreground mb-2">
                        No messages yet. Be the first to chat!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        When messages arrive, they will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t bg-secondary/5">
                {replyingTo && (
                  <div className="bg-card p-3 mb-2 rounded-md border border-border/50 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-muted-foreground">
                            Replying to:
                          </span>
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                            style={{
                              backgroundColor: emojiAvatarForAddress(
                                replyingTo.walletAddress
                              ).color,
                            }}
                          >
                            {
                              emojiAvatarForAddress(replyingTo.walletAddress)
                                .emoji
                            }
                          </div>
                          <span className="font-medium">
                            {replyingTo.walletAddress.substring(0, 6)}...
                            {replyingTo.walletAddress.substring(
                              replyingTo.walletAddress.length - 4
                            )}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground pl-6 border-l-2 border-primary/20 ml-2 py-1">
                          {replyingTo.message.length > 80
                            ? `${replyingTo.message.substring(0, 80)}...`
                            : replyingTo.message}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelReply}
                        className="h-6 w-6 p-0 rounded-full hover:bg-secondary/20"
                      >
                        <XIcon size={14} />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                  >
                    <div className="relative rounded-md border border-border/50 bg-card shadow-sm focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/50">
                      <input
                        id="chat-input"
                        ref={inputRef}
                        type="text"
                        className="w-full rounded-md bg-transparent px-4 py-2.5 pr-24 pl-10 focus:outline-none placeholder:text-muted-foreground/70"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleInputKeyDown}
                        disabled={!address || sendingMessage}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!address}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 rounded-full hover:bg-primary/10"
                        onClick={() => setShowTagMenu(true)}
                      >
                        <AtSign size={16} className="text-muted-foreground" />
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="absolute right-1.5 top-1/2 transform -translate-y-1/2 rounded-md px-3 py-1 h-8"
                        disabled={
                          !address || !newMessage.trim() || sendingMessage
                        }
                      >
                        {sendingMessage ? (
                          <span className="flex items-center gap-1">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            <span>Sending</span>
                          </span>
                        ) : (
                          "Send"
                        )}
                      </Button>
                    </div>
                  </form>

                  {showTagMenu && (
                    <div className="absolute bottom-full left-0 mb-1 w-full bg-card border rounded-lg shadow-md max-h-60 overflow-y-auto z-10">
                      <div className="p-2 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-card">
                        Tag a user
                      </div>

                      {/* Bot option - always visible at the top */}
                      {shouldShowBot && (
                        <div className="p-1 border-b">
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-indigo-500/10 rounded-md flex items-center gap-2 transition-colors"
                            onClick={() =>
                              handleTagUser(LY_BOT.walletAddress, true)
                            }
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-indigo-300"
                              style={{ backgroundColor: LY_BOT.color }}
                            >
                              {LY_BOT.emoji}
                            </div>
                            <div>
                              <span className="font-medium">{LY_BOT.name}</span>
                              <span className="text-xs block text-muted-foreground">
                                {LY_BOT.description}
                              </span>
                            </div>
                            <div className="ml-auto text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full">
                              BOT
                            </div>
                          </button>
                        </div>
                      )}

                      {filteredParticipants.length > 0 ? (
                        <div className="p-1">
                          {filteredParticipants.map((participant) => {
                            const avatar = emojiAvatarForAddress(participant);
                            return (
                              <button
                                key={participant}
                                className="w-full text-left px-3 py-2 hover:bg-secondary/20 rounded-md flex items-center gap-2 transition-colors"
                                onClick={() => handleTagUser(participant)}
                              >
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-border/40"
                                  style={{ backgroundColor: avatar.color }}
                                >
                                  {avatar.emoji}
                                </div>
                                <span>
                                  {participant.substring(0, 6)}...
                                  {participant.substring(
                                    participant.length - 4
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : !shouldShowBot ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No matching users
                        </div>
                      ) : null}
                    </div>
                  )}

                  {!address && (
                    <div className="mt-2 text-center bg-secondary/10 rounded-md p-2 border border-border/40">
                      <p className="text-xs text-muted-foreground">
                        Connect your wallet to join the conversation
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
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
