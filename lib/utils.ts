import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Livepeer } from "livepeer";
import { getSrc } from "@livepeer/react/external";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const livepeer = new Livepeer({
  apiKey: process.env.NEXT_PUBLIC_LIVEPEER_API_KEY,
});

export const createStream = async (title: string) => {
  const { stream } = await livepeer.stream.create({
    name: title,
  });

  return stream;
};

export const getPlaybackSource = async (playbackId: string) => {
  const playbackInfo = await livepeer.playback.get(playbackId);

  const src = getSrc(playbackInfo.playbackInfo);

  return src;
};

export const deleteStream = async (playbackId: string) => {
  await livepeer.stream.delete(playbackId);
};
