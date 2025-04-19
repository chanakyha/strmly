import { Chain } from '@rainbow-me/rainbowkit';

export const iExec = {
	id: 134,
	iconBackground: '#000000',
	iconUrl: 'https://avatars.githubusercontent.com/u/24774404?s=200&v=4',
	name: 'iExec Sidechain',
	nativeCurrency: { name: 'xRLC', symbol: 'xRLC', decimals: 18 },
	rpcUrls: {
		default: { http: ['https://bellecour.iex.ec'] }
	},
	blockExplorers: {
		default: { name: 'blockscout', url: 'https://blockscout.bellecour.iex.ec' }
	}
} as const satisfies Chain;
