"use client";

import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { toast } from "sonner";
import { emojiAvatarForAddress } from "@/lib/emojiAvatarForAddress";

const VideoUploader = () => {
  const { address } = useAccount();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [nsfw, setNsfw] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [userData, setUserData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!address) return;
      
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("walletAddress", address)
          .single();
          
        if (error) {
          console.error("Error fetching user data:", error);
          return;
        }
        
        if (data) {
          setUserData(data);
        } else {
          console.log("No user found with this wallet address, but continuing");
          // We'll still allow upload even if we can't find user data
          // since you mentioned RLS is disabled and user should be logged in
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    };
    
    fetchUserData();
  }, [address, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Check file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      setError('File size exceeds 500MB limit');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      setError('Please drop a valid video file');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError('File size exceeds 500MB limit');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleNsfwChange = () => {
    setNsfw(!nsfw);
  };

  const uploadVideo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log(session);
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title for your video");
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Generate a unique ID for the video
      const videoId = uuidv4();
      const fileExtension = videoFile.name.split('.').pop();
      const fileName = `${videoId}.${fileExtension}`;
      
      // Setup fake progress updates while uploading
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 500);
      
      // Upload the video directly to Supabase storage
      // Skip the user verification since RLS is disabled
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false,
        });
        
      clearInterval(progressInterval);
      setUploadProgress(95);
      
      if (uploadError) {
        throw new Error(`Error uploading video: ${uploadError.message}`);
      }
      
      // Get the public URL for the uploaded video
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);
      
      // Create record in videos table with URL
      const { error: insertError } = await supabase
        .from('videos')
        .insert({
          id: videoId,
          tags: tags,
          url: publicUrl,
          wallet_address: address,
          nsfw: nsfw,
          approved: false,
          title: title,
          description: description
        });
        
      if (insertError) {
        // Try to clean up the uploaded file if insertion fails
        await supabase.storage.from('videos').remove([fileName]);
        throw new Error(`Error saving video information: ${insertError.message}`);
      }
      
      setUploadProgress(100);
      
      // Success!
      setUploadSuccess(true);
      toast.success("Video uploaded successfully! It will be available after approval.");
      
      // Reset form after a delay
      setTimeout(() => {
        setVideoFile(null);
        setVideoPreview(null);
        setTitle("");
        setDescription("");
        setTags([]);
        setNsfw(false);
        setUploadSuccess(false);
        setUploadProgress(0);
      }, 3000);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  // Get emoji avatar for the wallet address
  const avatar = address
    ? emojiAvatarForAddress(address)
    : { emoji: "👤", color: "#6A87C8" };

  return (
    <div className="container mx-auto py-6 px-8">
      <h2 className="text-2xl font-bold mb-6">Upload Video</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: User Profile Info */}
        <div className="md:col-span-1">
          <Card className="p-6">
            <div className="flex flex-col items-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-4"
                style={{ backgroundColor: avatar.color }}
              >
                {avatar.emoji}
              </div>
              <h3 className="text-xl font-bold">
                {userData?.name || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not Connected")}
              </h3>
              
              {!address && (
                <p className="text-center mt-4 text-sm text-muted-foreground">
                  Please connect your wallet to upload videos
                </p>
              )}
              
              {address && (
                <div className="mt-6 space-y-2 w-full">
                  <h4 className="text-sm font-medium">Upload Guidelines:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Videos must be appropriate for our community</li>
                    <li>• Mark any adult content as NSFW</li>
                    <li>• Add relevant tags to help discovery</li>
                    <li>• Videos may be reviewed before approval</li>
                    <li>• Maximum file size: 500MB</li>
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        {/* Right: Upload Form */}
        <div className="md:col-span-2">
          <Card className="p-6">
            {error && (
              <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {uploadSuccess && (
              <div className="mb-6 p-3 bg-green-100 text-green-700 rounded-md">
                Video uploaded successfully! Your video will be available after approval.
              </div>
            )}
            
            <div className="space-y-6">
              {/* Video Upload Area */}
              <div
                className={`border-2 ${videoFile ? 'border-solid' : 'border-dashed'} border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors`}
                onClick={() => !videoFile && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  accept="video/*" 
                  className="hidden" 
                />
                
                {!videoFile ? (
                  <div className="py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-4 text-sm text-gray-600">
                      Drag and drop your video here, or click to select
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      MP4, WebM, AVI, MOV files accepted
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <video 
                      src={videoPreview || ''} 
                      controls 
                      className="w-full rounded-md shadow-sm max-h-64 mx-auto"
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoFile(null);
                        setVideoPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      {videoFile?.name} ({(videoFile?.size / 1024 / 1024).toFixed(2)}MB)
                    </p>
                  </div>
                )}
              </div>
              
              {/* Video Details Form */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title *
                </label>
                <Input
                  placeholder="Enter video title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mb-4"
                />
                
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  placeholder="Enter video description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mb-4"
                />
                
                <label className="block text-sm font-medium mb-2">
                  Tags
                </label>
                <TagInput
                  placeholder="Add tags (press Enter)"
                  value={tags}
                  onChange={setTags}
                  className="mb-4"
                />
                <p className="text-xs text-gray-500 mb-4">
                  Add relevant tags to help users discover your video
                </p>
                
                <div className="flex items-center mb-6">
                  <input
                    id="nsfw"
                    type="checkbox"
                    checked={nsfw}
                    onChange={handleNsfwChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nsfw" className="ml-2 block text-sm text-gray-700">
                    This content is NSFW (Not Safe For Work)
                  </label>
                </div>
              </div>
              
              {/* Upload Progress */}
              {uploading && (
                <div className="my-4">
                  <div className="text-sm font-medium text-gray-700 flex justify-between">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Submit Button */}
              <Button
                onClick={uploadVideo}
                disabled={!videoFile || !title || uploading || !address}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload Video'}
              </Button>
              
              <p className="mt-4 text-xs text-center text-gray-500">
                By uploading, you agree to our Terms of Service and Community Guidelines
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VideoUploader;