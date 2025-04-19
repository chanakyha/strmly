import { createClient } from "@/lib/supabase/server";
import ProfilePage from "./ProfilePage";

interface User {
  walletAddress: string;
  name: string;
  bio: string;
  tags: string[];
  created_at: string;
  subscribers?: string[];
  subscribed?: string[];
}

interface ProfileData {
  userData: User;
  subscribedProfiles: {
    walletAddress: string;
    name: string;
  }[];
}

export default async function StreamerProfile({
  params,
}: {
  params: Promise<{ walletAddress: string }>;
}) {
  const { walletAddress } = await params;

  // Initialize Supabase client
  const supabase = await createClient();

  // Fetch user data
  const { data: userData, error } = await supabase
    .from("users")
    .select("*")
    .eq("walletAddress", walletAddress)
    .single<User>();

  if (error) {
    console.error("Error fetching user data:", error);
    return <div>Error loading streamer profile</div>;
  }

  if (!userData) {
    return <div>Streamer not found</div>;
  }

  // Prepare the complete profile data object
  const profileData: ProfileData = {
    userData,
    subscribedProfiles: [],
  };

  // If user has subscribed to profiles, fetch their details
  if (userData.subscribed && userData.subscribed.length > 0) {
    try {
      const { data: subscribedProfiles, error: subscribedError } =
        await supabase
          .from("users")
          .select("walletAddress, name")
          .in("walletAddress", userData.subscribed);

      if (!subscribedError && subscribedProfiles) {
        profileData.subscribedProfiles = subscribedProfiles;
      } else if (subscribedError) {
        console.error("Error fetching subscribed profiles:", subscribedError);
      }
    } catch (err) {
      console.error("Exception fetching subscribed profiles:", err);
    }
  }

  return <ProfilePage profileData={profileData} />;
}
