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
        'Authorization': `Bearer YOUR_LIVEPEER_API_KEY`,  // Replace with your actual API Key
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
    <div>
      <h1>Upload Video</h1>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="text"
        placeholder="Tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={isLoading}>
        {isLoading ? 'Uploading...' : 'Upload'}
      </button>
      {data && <p>Success! Video URL: https://lvpr.tv/?v={data.playbackId}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
};

export default UploadPage;
