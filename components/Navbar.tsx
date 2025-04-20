"use client";

import Link from "next/link";
import { ConnectBtn } from "./wallet/connect-button";
import { useAccount } from "wagmi";
import { UploadCloud, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const Navbar = () => {
  const { isConnected, address } = useAccount();
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUploadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-neutral-800 bg-black/55 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between px-8">
        {/* Project Title */}
        <Link href="/" className="group relative mr-4 flex-shrink-0">
          {/* <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-teal-500 bg-clip-text text-transparent transition-all duration-300">
            strmly
          </span> */}
          <Image
          src={'/logo.png'}
          alt='logo'
          width={80}
          height={80}
          />
          <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-teal-500 transition-all duration-300 group-hover:w-full"></span>
        </Link>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-[600px] mx-4 hidden sm:block"
        >
          <div
            className={`flex rounded-full overflow-hidden border ${
              searchFocused
                ? "border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]"
                : "border-neutral-600"
            } transition-all duration-200`}
          >
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full px-4 py-[10px] bg-neutral-800 focus:outline-none text-white placeholder-neutral-400 text-sm"
            />
            <button
              type="submit"
              className="px-5 bg-neutral-700 hover:bg-neutral-600 transition-colors flex items-center justify-center"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-neutral-300" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-4 ml-2">
          {/* Upload Dropdown - Only show when connected */}
          {isConnected && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUploadMenu(!showUploadMenu)}
                className="flex items-center justify-center h-9 w-9 rounded-full bg-neutral-800/60 text-neutral-300 hover:text-white hover:bg-neutral-700/60 transition-all duration-200"
                aria-label="Upload content"
              >
                <UploadCloud className="h-5 w-5" />
              </button>

              {showUploadMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-neutral-900/95 backdrop-blur-md rounded-lg shadow-xl py-1 z-10 border border-neutral-700 transform origin-top-right transition-all duration-200 animate-in fade-in slide-in-from-top-2">
                  <Link
                    href="/upload"
                    className="flex px-4 py-3 text-sm text-neutral-200 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 transition-colors duration-200"
                    onClick={() => setShowUploadMenu(false)}
                  >
                    <span className="font-medium">Upload Video</span>
                  </Link>
                  <div className="h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent mx-2"></div>
                  <Link
                    href="/live"
                    className="flex px-4 py-3 text-sm text-neutral-200 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 transition-colors duration-200"
                    onClick={() => setShowUploadMenu(false)}
                  >
                    <span className="font-medium">Start Live Stream</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Profile Link - Only show when connected */}
          {isConnected && (
            <Link
              href={`/streamer/${address}`}
              className="relative group px-3 py-2 text-neutral-300 hover:text-white transition-colors duration-200"
            >
              Profile
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
          )}

          {/* Connect Wallet Button */}
          <ConnectBtn />
        </div>
      </div>

      {/* Mobile Search - Shown only on small screens */}
      <div className="mt-2 px-4 sm:hidden">
        <form onSubmit={handleSearch} className="flex w-full">
          <div
            className={`flex rounded-full overflow-hidden w-full border ${
              searchFocused
                ? "border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]"
                : "border-neutral-600"
            } transition-all duration-200`}
          >
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full px-4 py-[10px] bg-neutral-800 focus:outline-none text-white placeholder-neutral-400 text-sm"
            />
            <button
              type="submit"
              className="px-5 bg-neutral-700 hover:bg-neutral-600 transition-colors flex items-center justify-center"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-neutral-300" />
            </button>
          </div>
        </form>
      </div>
    </nav>
  );
};

export default Navbar;
