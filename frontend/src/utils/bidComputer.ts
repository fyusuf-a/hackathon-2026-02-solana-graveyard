import { PublicKey } from "@solana/web3.js";

export type Auction = {
    address: PublicKey;
    seed: number;
    mint: string;
    maker: string;
    currentBidder: string | null;
    currentBid: number | null;
    minPrice: number;
    minIncrement: number;
    startTime: number;
    deadline: number;
}

export function computeBid(auction: Auction): number {
    const basePrice = auction.currentBid ? auction.currentBid : auction.minPrice;
    const increment = auction.minIncrement > 0 ? auction.minIncrement : 1;
    return basePrice + increment;
}

