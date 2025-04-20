"use client";

import React from "react";

type VideoPlayerProps = {
  url: string;
  title: string;
  description?: string;
  tags?: string[];
  nsfw?: boolean;
  approved?: boolean;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title,
  description,
  tags = [],
  nsfw = false,
  approved = true,
}) => {
  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Video Wrapper */}
      <div className="relative pb-[56.25%] mb-4">
        <video
          src={url}
          controls
          className="absolute inset-0 w-full h-full rounded-lg shadow-lg"
        />
        {/* NSFW/Pending badge */}
        <div className="absolute top-2 right-2 flex gap-2">
          {nsfw && (
            <span className="bg-red-600 text-white px-2 py-1 text-xs rounded">
              NSFW
            </span>
          )}
          {!approved && (
            <span className="bg-yellow-500 text-black px-2 py-1 text-xs rounded">
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Video Info */}
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      {description && <p className="text-gray-400 mb-2">{description}</p>}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="bg-zinc-700 text-white text-xs px-2 py-1 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
