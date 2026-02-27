"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

export function Navbar() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      connection.getBalance(publicKey).then((lamports) => {
        setBalance(lamports / 1000000000);
      });
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, connection]);

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
      <div className="flex items-center gap-3">
        {connected && balance !== null && (
          <span className="text-sm text-gray-400 font-mono">
            {balance.toFixed(4)} SOL
          </span>
        )}
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !transition-colors" />
      </div>
    </nav>
  );
}
