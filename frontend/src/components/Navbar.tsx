"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

export function Navbar() {
  const pathname = usePathname();
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

  const navLinks = [
    { href: "/create-auction", label: "Create Auction" },
    { href: "/auctions", label: "Auction List" },
    { href: "/my-auctions", label: "My Auctions" },
  ];

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-6">
        <Link href="/">
          <h1 className="text-xl font-bold text-white hover:text-purple-400 transition-colors">
            Graveyard Auction
          </h1>
        </Link>
        <span className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded">
          Localnet
        </span>
        <div className="flex items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors relative ${
                pathname === link.href
                  ? "text-white bg-gray-800"
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
