"use client";

import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { fetchUserNFTs, NFTInfo } from "@/utils/nftFetcher";
import { createTestNft } from "@/utils/nftCreator";
import {
  getProgram,
  getAuctionPda,
  getVaultPda,
  getUserAta,
  getVaultAta,
} from "@/utils/program";
import { web3, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

interface CreateAuctionModalProps {
  nft: NFTInfo;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAuctionModal({
  nft,
  isOpen,
  onClose,
  onSuccess,
}: CreateAuctionModalProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [seed, setSeed] = useState(generateRandomSeed());
  const [startTimeMinutes, setStartTimeMinutes] = useState("1");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [minPrice, setMinPrice] = useState("0");
  const [minIncrement, setMinIncrement] = useState("0");
  const [discountBps, setDiscountBps] = useState("0");
  const [feeBps, setFeeBps] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function generateRandomSeed(): string {
    return Math.floor(Math.random() * 2 ** 64).toString();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) return;

    setSubmitting(true);
    setError("");

    try {
      const program = getProgram(connection, wallet as any);
      const mint = new PublicKey(nft.mint);

      const seedBN = new BN(seed);
      const now = Math.floor(Date.now() / 1000);
      const startTime = new BN(now + parseInt(startTimeMinutes) * 60);
      const deadline = new BN(now + parseInt(durationMinutes) * 60);
      const minPriceLamports = new BN(
        parseFloat(minPrice) * web3.LAMPORTS_PER_SOL
      );
      const minIncrementLamports = new BN(
        parseFloat(minIncrement) * web3.LAMPORTS_PER_SOL
      );

      let referralStructure = null;
      const discountBpsNum = parseInt(discountBps);
      const feeBpsNum = parseInt(feeBps);

      if (discountBpsNum > 0 || feeBpsNum > 0) {
        referralStructure = {
          baseFeeBps: feeBpsNum * 100,
          buyerDiscountBps: discountBpsNum * 100,
        };
      }

      const auction = await getAuctionPda(seedBN);
      const vault = await getVaultPda(seedBN);
      const userAta = await getUserAta(mint, wallet.publicKey);
      const vaultAta = await getVaultAta(mint, auction);

      await program.methods
        .createAuction(
          seedBN,
          startTime,
          deadline,
          minPriceLamports,
          minIncrementLamports,
          referralStructure
        )
        .accountsStrict({
          user: wallet.publicKey,
          mint,
          userAta,
          vaultAta,
          auction,
          vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating auction:", err);
      setError(err instanceof Error ? err.message : "Failed to create auction");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Create Auction</h2>

        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-gray-400 text-sm">Listing</p>
          <p className="text-white font-semibold">{nft.name}</p>
          <p className="text-gray-500 text-xs font-mono">
            {nft.mint.slice(0, 8)}...{nft.mint.slice(-4)}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Seed</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono">
                  {seed}
                </div>
                <button
                  type="button"
                  onClick={() => setSeed(generateRandomSeed())}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  ↻
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Start In (minutes)
                </label>
                <input
                  type="number"
                  value={startTimeMinutes}
                  onChange={(e) => setStartTimeMinutes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Min Increment (SOL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={minIncrement}
                  onChange={(e) => setMinIncrement(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Fee (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={feeBps}
                  onChange={(e) => setFeeBps(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountBps}
                  onChange={(e) => setDiscountBps(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? "Creating..." : "List NFT"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateAuctionPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [nfts, setNfts] = useState<NFTInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFTInfo | null>(null);
  const [creatingNft, setCreatingNft] = useState(false);
  const metadataProgramId = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  useEffect(() => {
    if (connected && publicKey) {
      setLoading(true);
      fetchUserNFTs(publicKey.toBase58())
        .then(setNfts)
        .finally(() => setLoading(false));
    }
  }, [connected, publicKey]);

  const handleCreateNft = async () => {
    if (!publicKey || !signTransaction) return;

    setCreatingNft(true);
    try {
      await createTestNft(metadataProgramId, publicKey, signTransaction);
      // Refresh NFTs
      if (publicKey) {
        fetchUserNFTs(publicKey.toBase58()).then(setNfts);
      }
    } catch (err) {
      console.error("Error creating NFT:", err);
    } finally {
      setCreatingNft(false);
    }
  };

  const handleSuccess = () => {
    setSelectedNft(null);
    if (publicKey) {
      fetchUserNFTs(publicKey.toBase58()).then(setNfts);
    }
  };

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
          <p className="text-gray-400 mb-4">No NFTs found in your wallet</p>
          <button
            onClick={handleCreateNft}
            disabled={creatingNft}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {creatingNft ? "Creating..." : "Create Test NFT"}
          </button>
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
                className="p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-purple-500 transition-colors"
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
                <button
                  className="mt-3 w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                  onClick={() => setSelectedNft(nft)}
                >
                  List NFT
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedNft && (
        <CreateAuctionModal
          nft={selectedNft}
          isOpen={!!selectedNft}
          onClose={() => setSelectedNft(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
