"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Video = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  url: string;
  wallet_address: string;
  nsfw: boolean;
  approved: boolean;
  created_at: string;
};

export default function VideoSection({ title }: { title: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error } = await supabase
          .from("videos")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          setError(`Failed to fetch videos: ${error.message}`);
        } else {
          setVideos(data || []);
        }
      } catch (err) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return "Today";
    else if (diffDays === 1) return "Yesterday";
    else if (diffDays < 7) return `${diffDays} days ago`;
    else if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    else return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-pulse">Loading videos...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-8">
          No videos found.
          <button
            onClick={() => console.log("Current state:", { videos, loading, error })}
            className="ml-2 text-blue-500 underline"
          >
            Debug
          </button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {videos.map((video) => (
           <Link href={`/watch/${video.id}`} key={video.id}>
           <div className="bg-zinc-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer">
             <div className="relative pb-[56.25%]">
               <img
                 src={video.url}
                 alt={video.title}
                 className="absolute inset-0 w-full h-full object-cover"
               />
               <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 px-2 py-1 text-xs rounded">
                 {video.nsfw && <span className="text-red-500 mr-2">NSFW</span>}
                 {!video.approved && <span className="text-yellow-500">Pending</span>}
               </div>
             </div>
             <div className="p-3">
               <h3 className="font-medium text-base line-clamp-2 mb-1">
                 {video.title || "Untitled"}
               </h3>
             </div>
           </div>
         </Link>
          ))}
        </div>
      )}
    </div>
  );
}
