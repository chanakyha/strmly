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

export const contractAddress = "0x00374b6ae6703703bbb0cb404d2d06f0dfe7d618";
export const ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "donor",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "streamer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "message",
				"type": "string"
			}
		],
		"name": "DonationReceived",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "streamer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "PayoutProcessed",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "streamer",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "message",
				"type": "string"
			}
		],
		"name": "donateToStreamer",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdrawDonations",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "checkBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "streamerBalances",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]