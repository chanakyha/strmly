'use client';

import { http, createStorage, cookieStorage } from 'wagmi';
import { sepolia, bscTestnet, blastSepolia, hardhat } from 'wagmi/chains';
import { Chain, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { iExec } from './chains/iExec';

const projectId = '96ecf792e3cb4b95a3b20ba5fa4b9e57';

const supportedChains: Chain[] = [sepolia, bscTestnet, blastSepolia, iExec, hardhat];

export const config = getDefaultConfig({
	appName: 'WalletConnection',
	projectId,
	chains: supportedChains as any,
	ssr: true,
	storage: createStorage({
		storage: cookieStorage
	}),
	transports: supportedChains.reduce((obj, chain) => ({ ...obj, [chain.id]: http() }), {})
});
