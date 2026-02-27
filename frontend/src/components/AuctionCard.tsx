"use client";

import { Auction, computeBid } from "@/utils/bidComputer";
import { getReferrerWhitelistAccount } from "@/utils/program";
import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { useMemo, useState } from "react";

interface AuctionCardProps {
  auction: Auction;
  currentWallet: PublicKey | null;
  onBid: (auction: Auction, bidAmount: number, referrer?: string) => void;
  onWhitelistReferrer: (auction: Auction, referrer: string) => void;
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
  onWhitelistReferrer,
}: AuctionCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [showReferrersModal, setShowReferrersModal] = useState(false);
  const [referrersList, setReferrersList] = useState<string[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [referrer, setReferrer] = useState("");
  const [whitelistReferrer, setWhitelistReferrer] = useState("");
  const [error, setError] = useState("");

  const { connection } = useConnection();
  const now = Math.floor(Date.now() / 1000);
  const isLive = auction.deadline > now;
  const isMaker = currentWallet && auction.maker === currentWallet.toString();

  const minBid = useMemo(() => {
    return computeBid(auction);
  }, [auction]);

  const handleOpenModal = () => {
    setBidAmount(minBid.toString());
    setReferrer("");
    setError("");
    setShowModal(true);
  };

  const handleConfirmBid = () => {
    const amount = parseInt(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      setError(`Bid must be at least ${formatLamports(minBid)}`);
      return;
    }

    let referrerKey: string | undefined;
    if (referrer.trim()) {
      try {
        new PublicKey(referrer.trim());
        referrerKey = referrer.trim();
      } catch {
        setError("Invalid referrer public key");
        return;
      }
    }

    setShowModal(false);
    onBid(auction, amount, referrerKey);
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex gap-4">
        <div className="w-24 h-24 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
          {auction.nft?.uri ? (
            <img
              src={auction.nft.uri}
              alt={auction.nft.name}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-3xl">🖼️</span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">
            {auction.nft?.name ||
              `Mint: ${auction.mint.slice(0, 8)}...${auction.mint.slice(-4)}`}
          </p>
          {auction.nft?.symbol && (
            <p className="text-purple-400 text-sm">{auction.nft.symbol}</p>
          )}
          <p className="text-gray-400 text-sm">
            Maker:{" "}
            {isMaker
              ? "You"
              : `${auction.maker.slice(0, 8)}...${auction.maker.slice(-4)}`}
          </p>
          <p className="text-gray-400 text-sm">
            Min Price: {formatLamports(auction.minPrice)}
          </p>
          <p className="text-gray-400 text-sm">
            Min Increment: {formatLamports(auction.minIncrement)}
          </p>
          {auction.referralStructure && (
            <>
              <p className="text-gray-400 text-sm">
                Discount: {auction.referralStructure.buyerDiscountBps / 100}%
              </p>
              <p className="text-gray-400 text-sm">
                Fee: {auction.referralStructure.baseFeeBps / 100}%
              </p>
            </>
          )}
          {isLive && (
            <p className="text-gray-400 text-sm">
              Ends{" "}
              {formatDistanceToNow(new Date(auction.deadline * 1000), {
                addSuffix: true,
              })}
            </p>
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
        <div className="flex flex-col items-end">
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
          <div className="flex gap-2">
            {isMaker && isLive && (
              <button
                onClick={() => {
                  setWhitelistReferrer("");
                  setError("");
                  setShowWhitelistModal(true);
                }}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm"
              >
                Whitelist Referrer
              </button>
            )}
            {isMaker && (
              <button
                onClick={async () => {
                  setLoadingReferrers(true);
                  setShowReferrersModal(true);
                  try {
                    const result = await getReferrerWhitelistAccount(
                      connection,
                      new BN(auction.seed.toString())
                    );
                    setReferrersList(result?.referrers || []);
                  } catch (e) {
                    console.error("Error fetching referrers:", e);
                    setReferrersList([]);
                  }
                  setLoadingReferrers(false);
                }}
                className="mt-2 px-4 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 rounded-lg font-semibold text-sm"
              >
                View Referrers
              </button>
            )}
            {isLive && (
              <button
                onClick={handleOpenModal}
                className={`mt-2 px-4 py-2 rounded-lg font-semibold text-sm ${
                  isMaker
                    ? "border border-purple-600 text-purple-400 hover:bg-purple-600/10"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                Bid {formatLamports(minBid)}
              </button>
            )}
          </div>
          {isMaker && auction.referrersCount > 0 && (
            <p className="text-gray-500 text-xs mt-2">
              {auction.referrersCount} referrer
              {auction.referrersCount !== 1 ? "s" : ""} whitelisted
            </p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Place Bid</h3>
            <p className="text-gray-400 mb-4">
              Minimum bid: {formatLamports(minBid)}
            </p>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Bid Amount (lamports)
              </label>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                min={minBid}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Referral Public Key (optional)
              </label>
              <input
                type="text"
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
                placeholder="Enter referrer wallet address"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBid}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Confirm Bid
              </button>
            </div>
          </div>
        </div>
      )}

      {showWhitelistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              Whitelist Referrer
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Add a referrer&apos;s public key to allow them to earn commissions
              on bids.
            </p>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Referrer Public Key
              </label>
              <input
                type="text"
                value={whitelistReferrer}
                onChange={(e) => setWhitelistReferrer(e.target.value)}
                placeholder="Enter referrer wallet address"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowWhitelistModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!whitelistReferrer.trim()) {
                    setError("Please enter a referrer public key");
                    return;
                  }
                  try {
                    new PublicKey(whitelistReferrer.trim());
                  } catch {
                    setError("Invalid public key");
                    return;
                  }
                  setShowWhitelistModal(false);
                  onWhitelistReferrer(auction, whitelistReferrer.trim());
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Whitelist
              </button>
            </div>
          </div>
        </div>
      )}

      {showReferrersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              Whitelisted Referrers
            </h3>
            {loadingReferrers ? (
              <p className="text-gray-400">Loading...</p>
            ) : referrersList.length === 0 ? (
              <p className="text-gray-400 text-sm">
                No referrers whitelisted yet.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {referrersList.map((referrer, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-900 rounded text-gray-300 text-sm font-mono break-all"
                  >
                    {referrer}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowReferrersModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
