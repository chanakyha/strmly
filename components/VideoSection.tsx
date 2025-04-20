// VideoSection.tsx

"use client"; // This marks this component as a client-side component

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; // Import the supabase client directly

type Video = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  url: string;
  nsfw: boolean;
  approved: boolean;
  created_at: string;
};

export default function VideoSection({ title }: { title: string }) {
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      // Query Supabase to get videos
      const { data, error } = await createClient
        .from("videos") // Your table name
        .select("id, title, url") // Select specific columns (adjust as needed)
        .eq("approved", "true"); // Filter for approved videos (if needed)

      if (error) {
        console.error("Error fetching videos:", error);
      } else {
        setVideos(
          (data || []).map((video) => ({
            ...video,
            description: "", // Empty description if you want to fill it later
            tags: [], // Empty tags array
            nsfw: false, // Default value for nsfw
            approved: true, // Ensuring video is approved
            created_at: new Date().toISOString(), // Default timestamp
          }))
        ); // Set videos to state
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="px-4 py-6">
      <h2 className="text-lg font-medium mb-3">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {videos.map((v) => (
          <div key={v.id} className="bg-zinc-800 rounded-md p-2">
            <img
              src={v.url} // Assuming 'url' is the video thumbnail or URL
              alt={v.title}
              className="rounded"
              style={{ width: "100%", height: "auto" }}
            />
            <p className="text-sm mt-2">{v.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
