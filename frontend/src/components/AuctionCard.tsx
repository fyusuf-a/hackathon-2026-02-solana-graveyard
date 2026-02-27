"use client";

import { Auction, computeBid } from "@/utils/bidComputer";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { useMemo } from "react";

interface AuctionCardProps {
  auction: Auction,
  currentWallet: PublicKey | null;
  onBid: (auction: Auction) => void;
}

function formatLamports(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol >= 1) {
    return `${sol.toFixed(4)} SOL`;
  }
  return `${lamports.toLocaleString()} lamports`;
}

function formatTimeStatus(startTime: number): string {
  const startDate = new Date(startTime * 1000);
  const now = new Date();

  if (startTime * 1000 > Date.now()) {
    return `Starts in ${formatDistance(startDate, now)}`;
  }

  return `Started ${formatDistanceToNow(startDate)} ago`;
}

export default function AuctionCard({
  auction,
  currentWallet,
  onBid,
}: AuctionCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isLive = auction.deadline > now;
  const isMaker = currentWallet && auction.maker === currentWallet.toString();

  const minBid = useMemo(() => {
    return computeBid(auction);
  }, [auction]);

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white font-semibold">
            Mint: {auction.mint.slice(0, 8)}...{auction.mint.slice(-4)}
          </p>
          <p className="text-gray-400 text-sm">
            Maker:{" "}
            {isMaker
              ? "you"
              : `${auction.maker.slice(0, 8)}...${auction.maker.slice(-4)}`}
          </p>
          <p className="text-gray-400 text-sm">
            Min Price: {formatLamports(auction.minPrice)}
          </p>
          <p className="text-gray-400 text-sm">
            Min Increment: {formatLamports(auction.minIncrement)}
          </p>
          {isLive && (
            <>
              <p className="text-gray-400 text-sm">
                {formatTimeStatus(auction.startTime)}
              </p>
              <p className="text-gray-400 text-sm">
                Ends{" "}
                {formatDistanceToNow(new Date(auction.deadline * 1000), {
                  addSuffix: true,
                })}
              </p>
            </>
          )}
          {!isLive && (
            <p className="text-gray-400 text-sm">
              Ended{" "}
              {formatDistanceToNow(new Date(auction.deadline * 1000), {
                addSuffix: true,
              })}
            </p>
          )}
        </div>
        <div className="text-right">
          {auction.currentBid ? (
            <>
              <p className="text-purple-400 font-semibold">
                Current bid: {formatLamports(auction.currentBid)}
              </p>
              <p className="text-gray-400 text-sm">
                by {auction.currentBidder?.slice(0, 4)}...
                {auction.currentBidder?.slice(-4)}
              </p>
            </>
          ) : (
            <p className="text-gray-500">No bids yet</p>
          )}
          {isLive && (
            <button
              onClick={() => {
                onBid(auction, minBid);
              }}
              className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm"
            >
              Bid {formatLamports(minBid)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
