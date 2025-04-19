"use client";

import Link from "next/link";
import { ConnectBtn } from "./wallet/connect-button";
import { useAccount } from "wagmi";

const Navbar = () => {
  const { isConnected, address } = useAccount();

  return (
    <nav className="w-full border-b border-neutral-800 bg-black py-4">
      <div className="container mx-auto flex items-center justify-between px-4">
        {/* Project Title */}
        <Link href="/" className="text-2xl font-bold text-white">
          strmly
        </Link>

        <div className="flex items-center gap-6">
          {/* Profile Link - Only show when connected */}
          {isConnected && (
            <Link
              href={`/streamer/${address}`}
              className="text-neutral-300 hover:text-white transition-colors"
            >
              Profile
            </Link>
          )}

          {/* Connect Wallet Button */}
          <ConnectBtn />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
