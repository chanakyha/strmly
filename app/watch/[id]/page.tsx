// app/watch/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at: string;
  tags: string[];
};

export default function WatchPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setError("Video not found");
      } else {
        setVideo(data);
      }
    };

    if (id) fetchVideo();
  }, [id]);

  if (error) return <div className="text-red-500 p-6 text-center">{error}</div>;
  if (!video) return <div className="text-center p-6">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="relative pb-[56.25%] mb-2">
        <video
          src={video.url}
          controls
          autoPlay
          className="absolute inset-0 w-full h-full rounded-lg shadow-lg border-white/20 border-2"
        />
      </div>
      <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
      <p className="text-gray-300 mb-4">{video.description}</p>
      <div className="flex gap-2 flex-wrap text-sm text-gray-400">
        {/* {video.tags?.map((tag, i) => (
          <span key={i} className="bg-zinc-700 px-2 py-1 rounded">
            #{tag}
          </span>
        ))} */}
      </div>
    </div>
  );
}
