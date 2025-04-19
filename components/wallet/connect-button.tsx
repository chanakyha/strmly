"use client";

import { useEffect, useRef, useState } from "react";
import {
  useConnectModal,
  useAccountModal,
  useChainModal,
} from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { emojiAvatarForAddress } from "@/lib/emojiAvatarForAddress";
import { Button } from "../ui/button";
import { createClient } from "@/lib/supabase/client";

export const ConnectBtn = () => {
  const { isConnecting, address, isConnected, chain } = useAccount();
  const { color: backgroundColor, emoji } = emojiAvatarForAddress(
    address ?? ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const { disconnect } = useDisconnect();

  const isMounted = useRef(false);

  // Shorten address for display
  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Check if user exists in database, if not create a new entry
  const checkAndCreateUser = async (walletAddress: string) => {
    if (!walletAddress) return;

    try {
      const supabase = createClient();

      // Check if user exists
      const { data, error } = await supabase
        .from("users")
        .select("walletAddress")
        .eq("walletAddress", walletAddress)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking user:", error);
        return;
      }

      // If user doesn't exist, create new entry
      if (!data) {
        const { error: insertError } = await supabase.from("users").insert({
          walletAddress,
          name: "",
          bio: "",
          tags: [],
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error("Error creating user:", insertError);
        }
      }
    } catch (err) {
      console.error("Error in checkAndCreateUser:", err);
    }
  };

  useEffect(() => {
    isMounted.current = true;
  }, []);

  // When address changes and user is connected, check/create user in database
  useEffect(() => {
    if (isConnected && address) {
      checkAndCreateUser(address);
    }
  }, [isConnected, address]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!isConnected) {
    return (
      <Button
        onClick={async () => {
          // Disconnecting wallet first because sometimes when is connected but the user is not connected
          if (isConnected) {
            disconnect();
          }
          openConnectModal?.();
        }}
        disabled={isConnecting}
        className="rounded-lg"
      >
        {isConnecting ? "Connecting..." : "Connect your wallet"}
      </Button>
    );
  }

  if (isConnected && !chain) {
    return (
      <Button className="rounded-lg" onClick={openChainModal}>
        Wrong network
      </Button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="flex items-center px-3 py-2 border border-neutral-700 bg-neutral-800/30 rounded-full font-mono text-sm font-medium gap-x-2 cursor-pointer hover:bg-neutral-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          role="Button"
          tabIndex={1}
          className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            backgroundColor,
            boxShadow: "0px 2px 2px 0px rgba(81, 98, 255, 0.20)",
          }}
        >
          {emoji}
        </div>
        <span className="text-neutral-200">
          {shortenAddress(address || "")}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-1 transition-transform ${
            isOpen ? "rotate-180" : ""
          } text-neutral-400`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-full min-w-[220px] bg-neutral-800 border border-neutral-700 rounded-xl shadow-lg z-10 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-700 flex items-center">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden mr-3"
              style={{ backgroundColor }}
            >
              {emoji}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {shortenAddress(address || "")}
              </span>
              <span className="text-xs text-neutral-400">Connected</span>
            </div>
          </div>
          <div
            className="px-4 py-3 cursor-pointer hover:bg-neutral-700/50 flex items-center"
            onClick={() => {
              openAccountModal?.();
              setIsOpen(false);
            }}
          >
            <span>View Account</span>
          </div>
          <div
            className="px-4 py-3 cursor-pointer hover:bg-neutral-700/50 flex items-center"
            onClick={() => {
              openChainModal?.();
              setIsOpen(false);
            }}
          >
            <span>Switch Networks</span>
          </div>
          <div
            className="px-4 py-3 cursor-pointer hover:bg-neutral-700/50 flex items-center text-red-400"
            onClick={() => {
              disconnect();
              setIsOpen(false);
            }}
          >
            <span>Disconnect</span>
          </div>
        </div>
      )}
    </div>
  );
};
