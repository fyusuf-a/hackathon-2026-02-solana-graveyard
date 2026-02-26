# Graveyard Hackathon -- Nectart's English Auction with Referral System

## Introduction

Nectart has developed an English auction platform for Exchange Art and Drip.
To dynamize the sale events, we implemented an optional referral system.

KOLs and community members can be whitelisted for a particular auction: they are thus more aligned with the project. They can share their public key with their audience, and receive a commission for each bid made using this key.

## Mechanism

Referrers are whitelisted by the maker.
They enable the bidder to input their public key during the bidding process.

2 cases are possible:
* The bidder bids an amount `x` without a referrer. The amount `x` is directly transfered to a vault.
* The bidder bids an amount `x` with a referrer. The bidder pays less than the amount `x` (to incentivize the use of referrals) and the referrer receives a commission. The discount can be parametered.

## Roadmap

### Contract

- Find a more bullet proof method that the public whitelisting of referrers. An informed player is incentivized to use any referrer public key, which would entice them to observe the calls to the contract to determine which public keys are whitelisted. Some part of the system should maybe be moved off-chain.
* Abstract the referral system to be used in other contexts.
* Implement a simpler instant-sale mechanism with referrals.
* The contract should offer the possibility to cancel an ongoing auction.
* Implement a more general payment. We should be feature-equivalent to Exchange Art. It should be possible to pay with any SPL token.
* When possible, the NFT should be frozen during the auction and not transferred to a vault.
* It should be possible to create an auction for multiple assets, maybe through a gacha system.

### Frontend
* Implement the referral system on the frontend.
* Implement a notification system to further dynamize the sale events.
