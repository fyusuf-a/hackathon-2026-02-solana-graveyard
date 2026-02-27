"use client";

import AuctionsList from "@/components/AuctionsList";

export default function AuctionsPage() {
  return <AuctionsList onlyMine={true} />;
}
