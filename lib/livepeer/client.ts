import { createClient, studioProvider } from '@livepeer/react';

// Check for the API key and handle the case if it's missing
const apiKey = process.env.NEXT_PUBLIC_LIVEPEER_API_KEY;

if (!apiKey) {
  throw new Error('Livepeer API Key is missing or not properly set in .env.local.');
}

// Create and export the Livepeer client
export const livepeerClient = createClient({
  provider: studioProvider({ apiKey }),
});
