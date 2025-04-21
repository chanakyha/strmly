// app/watch/[id]/page.tsx

import { createClient } from "@/lib/supabase/server";
import VideoClient from "./VideoClient";

type Video = {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at: string;
  tags: string[];
  wallet_address: string;
  views?: number;
  channel?: {
    name: string;
    avatar_url: string;
    subscribers?: number;
  };
};

export default async function WatchPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Create a server-side Supabase client
  const supabase = await createClient();

  // Fetch video data
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return <div className="text-red-500 p-6 text-center">Video not found</div>;
  }

  // Fetch related videos
  const { data: relatedData } = await supabase
    .from("videos")
    .select("*")
    .neq("id", id)
    .limit(8);

  // Add mock data for channel info
  const videoWithChannel = {
    ...data,
    views: Math.floor(Math.random() * 100000),
    channel: {
      name: "Stream.ly User",
      avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${data.id}`,
      subscribers: Math.floor(Math.random() * 10000),
    },
  };

  return (
    <VideoClient
      video={videoWithChannel}
      relatedVideos={relatedData || []}
      videoId={id}
    />
  );
}
