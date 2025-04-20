import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface Cookie {
  name: string;
  value: string;
  options: {
    path?: string;
    expires?: Date;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
  };
}

export async function createClient() {
  const cookieStore = await cookies();

  try {
    // Create a server's Supabase client with newly configured cookie,
    // which could be used to maintain the user's session
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Cookie[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch (err) {
                console.error(`Error setting cookie ${name}:`, err);
              }
            });
          },
        },
      }
    );
  } catch (err) {
    console.error("Error creating Supabase client:", err);
    throw new Error("Failed to create Supabase client");
  }
}
