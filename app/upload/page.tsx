'use client';  // Client component directive

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';  // Supabase client
import { useMutation } from 'react-query';  // Handling API calls
import { useAccount } from 'wagmi';  // For wallet address

const UploadPage = () => {
  const { address } = useAccount();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Function to upload video to Livepeer
  const uploadVideoToLivepeer = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://livepeer.com/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_LIVEPEER_API_KEY}` // Replace with your actual API Key
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload video to Livepeer');
    }

    const data = await response.json();
    return data; // Assuming data contains a playbackId
  };

  const { mutate: uploadVideo, isLoading, error, data } = useMutation(uploadVideoToLivepeer, {
    onSuccess: async (asset) => {
      const playbackUrl = `https://lvpr.tv/?v=${asset.playbackId}`;

      // Insert the metadata into Supabase
      await supabase.from('videos').insert([
        {
          title,
          tags,
          url: playbackUrl,
          wallet_address: address,
          type: 'media',
          nsfw: false,
          approved: true,
        },
      ]);
    },
    onError: (err) => {
      console.error('Error uploading video:', err);
    },
  });

  const handleUpload = async () => {
    if (!file) return;
    uploadVideo(file);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 space-y-4 text-white">
  <h1 className="text-2xl font-bold">Upload Video</h1>

  <input
    className="w-full p-2 rounded bg-gray-800 border border-gray-700"
    type="text"
    placeholder="Title"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
  />

  <input
    className="w-full p-2 rounded bg-gray-800 border border-gray-700"
    type="text"
    placeholder="Tags"
    value={tags}
    onChange={(e) => setTags(e.target.value)}
  />

  <input
    className="w-full p-2 rounded bg-gray-800 border border-gray-700"
    type="file"
    accept="video/*"
    onChange={(e) => setFile(e.target.files?.[0] || null)}
  />

  <button
    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
    onClick={handleUpload}
    disabled={isLoading}
  >
    {isLoading ? 'Uploading...' : 'Upload'}
  </button>

  {data && <p className="text-green-500">✅ Video URL: https://lvpr.tv/?v={data.playbackId}</p>}
  {error && <p className="text-red-500">❌ Error: {error.message}</p>}
</div>

  );
};

export default UploadPage;
