// Twitter/X sharing utilities

export interface ShareStats {
  wave: number;
  timeSurvived: number;
  kills: number;
  gold: number;
  rank?: number;
  totalPlayers?: number;
}

// Game URL - update this when deployed
const GAME_URL = "https://magic-baser.vercel.app";

// Format time as M:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Format number with commas
function formatNumber(n: number): string {
  return n.toLocaleString();
}

// Generate tweet text with game stats
export function generateTweetText(stats: ShareStats): string {
  const lines = [
    `⚔️ I just played Magic Baser on @MagicBlock — survived ${stats.wave} waves, slayed ${formatNumber(stats.kills)} enemies and earned ${formatNumber(stats.gold)} gold in ${formatTime(stats.timeSurvived)}!`,
  ];

  if (stats.rank && stats.totalPlayers) {
    lines.push("");
    lines.push(`🏆 Rank #${stats.rank} of ${stats.totalPlayers}`);
  }

  lines.push("");
  lines.push("Think you can beat me? 👇");
  lines.push(GAME_URL);
  lines.push("");
  lines.push("#MagicBaser #Solana #Web3Gaming");

  return lines.join("\n");
}

// Generate Twitter Web Intent URL
export function generateTwitterShareUrl(stats: ShareStats): string {
  const text = generateTweetText(stats);
  const encoded = encodeURIComponent(text);
  return `https://twitter.com/intent/tweet?text=${encoded}`;
}

// Open Twitter share popup
export function shareToTwitter(stats: ShareStats): void {
  const url = generateTwitterShareUrl(stats);
  const width = 550;
  const height = 420;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;

  window.open(
    url,
    "twitter-share",
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=no`
  );
}
