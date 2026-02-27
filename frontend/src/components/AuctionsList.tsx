"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAllAuctions, getProgram, getVaultPda } from "@/utils/program";
import { BorshAccountsCoder, BN, web3 } from "@coral-xyz/anchor";
import idl from "../../../target/idl/graveyard_hackathon.json";
import AuctionCard from "@/components/AuctionCard";
import { Auction, NFTInfo } from "@/utils/bidComputer";
import { fetchNFTByMint } from "@/utils/nftFetcher";

function decodeAuction(data: Buffer): any {
  const decoder = new BorshAccountsCoder(idl as any);
  try {
    const auction = decoder.decode("Auction", data);
    return auction;
  } catch (e) {
    console.error("Decode error:", e);
    return {};
  }
}

export default function AuctionsList({ onlyMine }: { onlyMine: boolean }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLive, setShowLive] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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

        const auctionData: Auction[] = [];

        for (let i = 0; i < auctionAddresses.length; i++) {
          const address = auctionAddresses[i];
          const accountInfo = accountInfos[i];

          if (!accountInfo || !accountInfo.data) continue;

          try {
            const decoded = decodeAuction(Buffer.from(accountInfo.data));
            if (decoded.mint) {
              if (
                onlyMine &&
                decoded.maker?.toString() !== wallet.publicKey?.toString()
              ) {
                continue;
              }

              const nft = await fetchNFTByMint(decoded.mint.toString());

              auctionData.push({
                address,
                seed: Number(decoded.seed) || 0,
                mint: decoded.mint.toString(),
                maker: decoded.maker?.toString() || "",
                currentBidder: decoded.current_bidder
                  ? decoded.current_bidder.toString()
                  : null,
                currentBid: decoded.current_bid
                  ? Number(decoded.current_bid)
                  : null,
                minPrice: Number(decoded.min_price) || 0,
                minIncrement: Number(decoded.min_increment) || 0,
                startTime: Number(decoded.start_time) || 0,
                deadline: Number(decoded.deadline) || 0,
                nft,
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
  }, [connection, wallet.publicKey, onlyMine]);

  const handleBid = async (auction: Auction) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Please connect your wallet");
      return;
    }

    const minBid = auction.currentBid
      ? Math.max(auction.currentBid + auction.minIncrement, auction.minPrice)
      : auction.minPrice;

    try {
      const program = getProgram(connection, wallet as any);
      const seed = new BN(auction.seed.toString());

      const vault = await getVaultPda(seed);

      await program.methods
        .bid(seed, new BN(bidAmount))
        .accountsStrict({
          bidder: wallet.publicKey,
          auction: auction.address,
          vault: vault,
          precedingBidder: auction.currentBidder
            ? new PublicKey(auction.currentBidder)
            : null,
          referrerWhitelist: null,
          referrer: null,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      const auctionAddresses = await getAllAuctions(connection);
      const accountInfos = await connection.getMultipleAccountsInfo(
        auctionAddresses
      );

      const auctionData: Auction[] = [];
      for (let i = 0; i < auctionAddresses.length; i++) {
        const address = auctionAddresses[i];
        const accountInfo = accountInfos[i];
        if (!accountInfo || !accountInfo.data) continue;
        try {
          const decoded = decodeAuction(Buffer.from(accountInfo.data));
          if (decoded.mint) {
            const nft = await fetchNFTByMint(decoded.mint.toString());
            auctionData.push({
              address,
              seed: Number(decoded.seed) || 0,
              mint: decoded.mint.toString(),
              maker: decoded.maker?.toString() || "",
              currentBidder: decoded.current_bidder
                ? decoded.current_bidder.toString()
                : null,
              currentBid: decoded.currentBid
                ? Number(decoded.currentBid)
                : null,
              minPrice: Number(decoded.min_price) || 0,
              minIncrement: Number(decoded.min_increment) || 0,
              startTime: Number(decoded.start_time) || 0,
              deadline: Number(decoded.deadline) || 0,
              nft,
            });
          }
        } catch (e) {
          console.error("Error decoding auction:", address.toString(), e);
        }
      }
      setAuctions(auctionData);
    } catch (e) {
      console.log("Error placing bid:", e);
      alert("Failed to place bid");
    }
  };

  const now = Math.floor(Date.now() / 1000);
  const filteredAuctions = auctions.filter((a) =>
    showLive ? a.deadline > now : a.deadline <= now
  );

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Auction List</h1>
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setShowLive(true)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              showLive
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setShowLive(false)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              !showLive
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
          <p className="text-gray-400">Loading auctions...</p>
        </div>
      ) : filteredAuctions.length === 0 ? (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
          <p className="text-gray-400">
            No {showLive ? "active" : "past"} auctions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAuctions.map((auction) => (
            <AuctionCard
              key={auction.address.toString()}
              auction={auction}
              currentWallet={wallet.publicKey}
              onBid={handleBid}
            />
          ))}
        </div>
      )}
    </div>
  );
}
