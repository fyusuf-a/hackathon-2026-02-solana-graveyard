"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAllAuctions } from "@/utils/program";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import idl from "../../../../target/idl/graveyard_hackathon.json";

interface AuctionData {
  address: PublicKey;
  mint: string;
  maker: string;
  currentBidder: string | null;
  currentBid: number | null;
  minPrice: number;
  startTime: number;
  deadline: number;
}

function decodeAuction(data: Buffer): any {
  const decoder = new BorshAccountsCoder(idl as any);
  try {
    return decoder.decode("Auction", data);
  } catch (e) {
    console.error("Decode error:", e);
    return {};
  }
}

export default function AuctionsPage() {
  const { connection } = useConnection();
  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const auctionAddresses = await getAllAuctions(connection);

        if (auctionAddresses.length === 0) {
          setAuctions([]);
          setLoading(false);
          return;
        }

        const accountInfos = await connection.getMultipleAccountsInfo(
          auctionAddresses
        );

        const auctionData: AuctionData[] = [];

        for (let i = 0; i < auctionAddresses.length; i++) {
          const address = auctionAddresses[i];
          const accountInfo = accountInfos[i];

          if (!accountInfo || !accountInfo.data) continue;

          try {
            const decoded = decodeAuction(Buffer.from(accountInfo.data));
            if (decoded.mint) {
              auctionData.push({
                address,
                mint: decoded.mint.toString(),
                maker: decoded.maker?.toString() || "",
                currentBidder: decoded.currentBidder
                  ? decoded.currentBidder.toString()
                  : null,
                currentBid: decoded.currentBid
                  ? Number(decoded.currentBid)
                  : null,
                minPrice: Number(decoded.minPrice) || 0,
                startTime: Number(decoded.startTime) || 0,
                deadline: Number(decoded.deadline) || 0,
              });
            }
          } catch (e) {
            console.error("Error decoding auction:", address.toString(), e);
          }
        }

        setAuctions(auctionData);
      } catch (e) {
        console.error("Error fetching auctions:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchAuctions();
  }, [connection]);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Auction List</h1>

      {loading ? (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
          <p className="text-gray-400">Loading auctions...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
          <p className="text-gray-400">No active auctions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {auctions.map((auction) => (
            <div
              key={auction.address.toString()}
              className="p-4 bg-gray-900 rounded-lg border border-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-semibold">
                    Mint: {auction.mint.slice(0, 8)}...{auction.mint.slice(-4)}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Maker: {auction.maker.slice(0, 8)}...
                    {auction.maker.slice(-4)}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Min Price: {(auction.minPrice / 1e9).toFixed(4)} SOL
                  </p>
                </div>
                <div className="text-right">
                  {auction.currentBid ? (
                    <>
                      <p className="text-purple-400 font-semibold">
                        {(auction.currentBid / 1e9).toFixed(4)} SOL
                      </p>
                      <p className="text-gray-400 text-sm">
                        by {auction.currentBidder?.slice(0, 4)}...
                        {auction.currentBidder?.slice(-4)}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">No bids yet</p>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-800 text-xs text-gray-500">
                Address: {auction.address.toString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
