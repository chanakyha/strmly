"use client";

import HorizontalScroller from "@/components/HorizontalScroller";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Using the LiveData interface from globalTypes.d.ts
interface LiveData {
  walletAddress: string;
  playback_id: string;
  created_at: string;
  stream_key: string;
  stream_url: string;
  stream_id: string;
  tags: string[];
  title: string;
  thumbnail_url: string;
  description: string;
}

interface UserInfo {
  name: string;
  walletAddress: string;
}

export default function LiveStreams() {
  const [streams, setStreams] = useState<LiveData[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchLiveStreams() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("lives")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching live streams:", error);
          return;
        }

        setStreams(data || []);

        // Fetch user info for each stream creator
        if (data && data.length > 0) {
          const walletAddresses = data.map((stream) => stream.walletAddress);
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("name, walletAddress")
            .in("walletAddress", walletAddresses);

          if (usersError) {
            console.error("Error fetching users:", usersError);
          } else if (usersData) {
            const usersMap: Record<string, UserInfo> = {};
            usersData.forEach((user) => {
              usersMap[user.walletAddress] = user;
            });
            setUsers(usersMap);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live streams:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLiveStreams();
  }, []);

  function handleWatchStream(playback_id: string) {
    router.push(`/live/${playback_id}`);
  }

  // Function to generate email avatar backgrounds based on wallet address
  function generateAvatarBackground(walletAddress: string) {
    // Simple hash function to generate a color
    let hash = 0;
    for (let i = 0; i < walletAddress.length; i++) {
      hash = walletAddress.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate HSL color with high saturation and medium lightness
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
  }

  // Function to shorten wallet address
  function shortenAddress(address: string) {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  }

  return (
    <div className="px-4 mx-4 rounded-lg py-6 bg-[#C4E4FF14]">
      <div className="flex w-full gap-1.5">
        <h1 className="text-lg font-medium text-red-600 font-mono mb-3">
          Live
        </h1>
        <h1 className="text-lg font-medium mb-3">Streams</h1>
      </div>
      <div className="flex gap-4 overflow-x-scroll scrollbar-hidden pb-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading live streams...</p>
        ) : streams.length === 0 ? (
          <p className="text-sm text-gray-400">No live streams available</p>
        ) : (
          streams.map((stream) => (
            <div
              key={stream.playback_id}
              className="min-w-[200px] bg-zinc-800 rounded-md p-2 hover:bg-zinc-700 transition-colors flex flex-col"
            >
              {stream.thumbnail_url ? (
                <img
                  src={stream.thumbnail_url}
                  alt={stream.title}
                  className="rounded w-full aspect-video object-cover"
                />
              ) : (
                <div
                  className="rounded w-full aspect-video flex items-center justify-center text-xl font-bold text-white"
                  style={{
                    backgroundColor: generateAvatarBackground(
                      stream.walletAddress
                    ),
                  }}
                >
                  {shortenAddress(stream.walletAddress)}
                </div>
              )}
              <p className="text-sm mt-2 truncate font-medium">
                {stream.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {users[stream.walletAddress]?.name ||
                  shortenAddress(stream.walletAddress)}
              </p>
              <button
                onClick={() => handleWatchStream(stream.playback_id)}
                className="mt-auto bg-red-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-red-700 transition-colors mt-2"
              >
                Watch Stream
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
