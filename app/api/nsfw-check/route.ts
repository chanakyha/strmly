// Import necessary modules
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';  // Supabase URL from .env
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';  // Supabase Key from .env

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is missing from the environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to download file from Supabase Storage
async function downloadFileFromSupabase(bucket: string, fileName: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).download(fileName);

  if (error) {
    console.error('Error downloading file:', error.message);
    return null;
  }

  const filePath = path.join(__dirname, fileName); // Define the path to save the file locally
  const arrayBuffer = await data.arrayBuffer(); // Convert Blob to ArrayBuffer
  const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Buffer

  return new Promise<string>((resolve, reject) => {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(err); // Reject on error
      } else {
        resolve(filePath); // Resolve with file path after saving
      }
    });
  });
}

// Function to extract frames from video
async function extractFrames(videoFilePath: string): Promise<void> {
  const outputDir = './frames'; // Directory to store frames
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir); // Create the directory if it doesn't exist
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoFilePath)
      .on('end', () => {
        console.log('Frames extraction finished.');
        resolve(); // Resolve when extraction is done
      })
      .on('error', (err) => {
        reject(`Error extracting frames: ${err.message}`); // Reject on error
      })
      .output(`${outputDir}/frame-%03d.png`) // Output frames as PNG files
      .run();
  });
}

// Route handler to process video and extract frames
export async function handleVideoProcessing(req: any, res: any): Promise<any> {
  const { bucket, videoFilePath } = req.body; // Assumes video file path is passed in the request body

  try {
    // Step 1: Download video from Supabase
    const filePath = await downloadFileFromSupabase(bucket, videoFilePath);
    if (!filePath) {
      return res.status(500).json({ message: 'Error downloading the video file from Supabase.' });
    }

    // Step 2: Extract frames from the downloaded video
    await extractFrames(filePath);
    
    // Return success response
    return res.status(200).json({ message: 'Frames extracted successfully' });
  } catch (error) {
    console.error('Error during video processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ message: 'Error processing video', error: errorMessage });
  }
}
