"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function Navbar() {
  const { connected } = useWallet();

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-white">Graveyard Auction</h1>
        <span className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded">
          Localnet
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/create-auction"
            className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            Create Auction
          </Link>
          <Link
            href="/auctions"
            className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            Auction List
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {connected && <span className="text-sm text-green-400">Connected</span>}
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !transition-colors" />
      </div>
    </nav>
  );
}
