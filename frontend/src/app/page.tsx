"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

const DUMMY_PRIVATE_KEY =
  "[193,11,54,70,20,164,26,134,77,241,66,165,140,31,1,205,109,172,93,58,111,65,17,180,40,70,76,183,81,66,183,90,65,13,157,165,17,255,210,129,73,203,18,201,104,32,5,231,54,153,254,2,111,32,24,26,153,115,244,14,237,198,174,176]";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [copied, setCopied] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [airdropStatus, setAirdropStatus] = useState("");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(DUMMY_PRIVATE_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requestAirdrop = async () => {
    if (!publicKey) return;
    setAirdropping(true);
    setAirdropStatus("");
    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        1 * 1000000000 // 1 SOL in lamports
      );
      await connection.confirmTransaction(signature, "confirmed");
      setAirdropStatus("Success!");
    } catch (err) {
      setAirdropStatus(
        "Failed: " + (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setAirdropping(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">
          English Auction with Referrals
        </h1>
        <p className="text-lg text-gray-400">
          Use the following private key in your wallet that holds NFTs on the
          localnet:
        </p>


        <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
          <p className="text-sm text-gray-400 mb-2">Public Key</p>
          <code className="text-green-400 font-mono text-sm">
            5NwYT5xMTdRwV1hQ3LMi81q4jHeYxzVKjUY67ExWWiTH
          </code>
          {connected && publicKey && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button
                onClick={requestAirdrop}
                disabled={airdropping}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50"
              >
                {airdropping ? "Airdropping..." : "Request 1 SOL Airdrop"}
              </button>
              {airdropStatus && (
                <span
                  className={`ml-2 text-sm ${
                    airdropStatus.startsWith("Success")
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {airdropStatus}
                </span>
              )}
            </div>
          )}
        </div>

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
