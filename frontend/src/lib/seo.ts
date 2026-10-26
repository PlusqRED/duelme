import { SITE_NAME } from './constants';

export const SEO_TITLE_EN = `${SITE_NAME} — 1v1 USDT Duels • 0% Fee • On-Chain PvP`;
export const SEO_TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

// Google truncates meta descriptions around 155–160 chars in SERP. Kept under
// that budget so the value prop ("0% fee, no KYC, on-chain") isn't cut off.
export const SEO_DESCRIPTION_EN =
  'Stake USDT in 1v1 crypto duels and win the full pot. Smart-contract escrow on Arbitrum — 0% platform fee, no KYC, no admin override.';
