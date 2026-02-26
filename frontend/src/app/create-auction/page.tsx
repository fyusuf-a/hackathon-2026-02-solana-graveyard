"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { fetchUserNFTs, NFTInfo } from "@/utils/nftFetcher";

export default function CreateAuctionPage() {
  const { connected, publicKey } = useWallet();
  const [nfts, setNfts] = useState<NFTInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      setLoading(true);
      fetchUserNFTs(publicKey.toBase58())
        .then(setNfts)
        .finally(() => setLoading(false));
    }
  }, [connected, publicKey]);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Create Auction</h1>

      {!connected ? (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
          <p className="text-gray-400">Connect your wallet to see your NFTs</p>
        </div>
      ) : loading ? (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
          <p className="text-gray-400">Loading your NFTs...</p>
        </div>
      ) : nfts.length === 0 ? (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
          <p className="text-gray-400">No NFTs found in your wallet</p>
        </div>
      ) : (
        <div>
          <p className="text-gray-400 mb-4">
            Select an NFT to create an auction:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nfts.map((nft) => (
              <div
                key={nft.mint}
                className="p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-purple-500 transition-colors cursor-pointer"
              >
                <div className="aspect-square bg-gray-800 rounded-lg mb-3 flex items-center justify-center">
                  {nft.uri ? (
                    <img
                      src={nft.uri}
                      alt={nft.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-4xl">🖼️</span>
                  )}
                </div>
                <h3 className="text-white font-semibold truncate">
                  {nft.name}
                </h3>
                {nft.symbol && (
                  <p className="text-purple-400 text-sm">{nft.symbol}</p>
                )}
                <p className="text-gray-500 text-xs font-mono truncate mt-2">
                  {nft.mint.slice(0, 8)}...{nft.mint.slice(-4)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
