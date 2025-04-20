import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';  
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; 

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Key is missing from the environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadFileFromSupabase(bucket: string, fileName: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).download(fileName);

  if (error) {
    console.error('Error downloading file:', error.message);
    return null;
  }

  const filePath = path.join(__dirname, fileName); 
  const arrayBuffer = await data.arrayBuffer(); 
  const buffer = Buffer.from(arrayBuffer); 

  return new Promise<string>((resolve, reject) => {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(err); 
      } else {
        resolve(filePath); 
      }
    });
  });
}

async function extractFrames(videoFilePath: string): Promise<void> {
  const outputDir = './frames';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir); 
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoFilePath)
      .on('end', () => {
        console.log('Frames extraction finished.');
        resolve(); 
      })
      .on('error', (err) => {
        reject(`Error extracting frames: ${err.message}`); 
      })
      .output(`${outputDir}/frame-%03d.png`)
      .run();
  });
}

async function detectNSFW(framePath: string): Promise<boolean> {
  return Math.random() > 0.5; 
}

export async function handleVideoProcessing(req: any, res: any): Promise<any> {
  const { bucket, videoFilePath } = req.body; 

  try {
    const filePath = await downloadFileFromSupabase(bucket, videoFilePath);
    if (!filePath) {
      return res.status(500).json({ message: 'Error downloading the video file from Supabase.' });
    }

    await extractFrames(filePath);

    const framesDir = './frames';
    const frameFiles = fs.readdirSync(framesDir);
    for (const frame of frameFiles) {
      const framePath = path.join(framesDir, frame);
      const isNSFW = await detectNSFW(framePath);
      
      if (isNSFW) {
        console.log(`NSFW content detected in frame: ${frame}`);
      }
    }
    
    return res.status(200).json({ message: 'Video processed and frames extracted successfully.' });
  } catch (error) {
    console.error('Error during video processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ message: 'Error processing video', error: errorMessage });
  }
}
