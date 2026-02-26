"use client";

import { useWallet } from "@solana/wallet-adapter-react";

export default function Home() {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">
          English Auction with Referrals
        </h1>
        <p className="text-lg text-gray-400">
          A Solana-based English auction platform with an integrated referral
          system. Connect your wallet to create auctions, place bids, and earn
          commissions.
        </p>

        {connected && publicKey ? (
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-400">Connected Wallet</p>
            <p className="text-purple-400 font-mono text-sm truncate">
              {publicKey.toBase58()}
            </p>
          </div>
        ) : (
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <p className="text-gray-400">Connect your wallet to get started</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2">
              Create Auction
            </h3>
            <p className="text-sm text-gray-400">List your NFTs for auction</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2">
              Place Bids
            </h3>
            <p className="text-sm text-gray-400">Participate in auctions</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2">
              Earn Referrals
            </h3>
            <p className="text-sm text-gray-400">Share and earn commissions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
