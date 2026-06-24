

// Hardcoded mock data for the SuperRouter dashboard.
// This file is only consulted when HARDCODED_MODE is true.

const now = Date.now();
const fiveMinAgo = now - 5 * 60 * 1000;
const oneHourAgo = now - 60 * 60 * 1000;

const MOCK_MINTS = {
  bonk: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  pepe: "3hA8TvwNkl9x2pb3hafS9W3wjBGV1n2zX3ZPzXnWz7m4",
  pengu: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd3gnNGjFcz",
  fwog: "9jaZhJM6nMHTo4gY9LcjCqNn6LpXUPHmHvNAr6mH6bTj",
};

export const HARDCODED_TOKENS: any[] = [
  {
    mint: MOCK_MINTS.bonk,
    symbol: "BONK",
    name: "Bonk",
    description: "The first Solana dog coin sent as an airdrop to the community.",
    metadata_uri: "",
    twitter_url: "https://twitter.com/bonk_inu",
    telegram_url: "",
    website_url: "https://bonkcoin.com",
    discord_url: "",
    image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.bonk}.png`,
    detected_at: new Date(oneHourAgo).toISOString(),
    created_at: new Date(oneHourAgo).toISOString(),
    updated_at: new Date(now).toISOString(),
    platform: "raydium",
    source: "twitter",
    twitter_link_type: "mention",
    transaction_signature: "mock-sig-bonk",
    creator: "mock-creator-1",
    sol_amount: 12.5,
    market_cap: 420000000,
    price_usd: 0.00000621,
    liquidity: 2800000,
    volume_24h: 18500000,
    author_followers: 152000,
    author_verified: true,
    tweet_author_username: "bonk_inu",
  },
  {
    mint: MOCK_MINTS.pepe,
    symbol: "PEPE",
    name: "Pepe",
    description: "The most memeable memecoin in existence.",
    metadata_uri: "",
    twitter_url: "https://twitter.com/pepecoineth",
    telegram_url: "",
    website_url: "https://pepe.vip",
    discord_url: "",
    image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.pepe}.png`,
    detected_at: new Date(oneHourAgo - 10 * 60 * 1000).toISOString(),
    created_at: new Date(oneHourAgo - 10 * 60 * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
    platform: "pump",
    source: "twitter",
    twitter_link_type: "direct",
    transaction_signature: "mock-sig-pepe",
    creator: "mock-creator-2",
    sol_amount: 7.2,
    market_cap: 890000000,
    price_usd: 0.0000212,
    liquidity: 5600000,
    volume_24h: 42000000,
    author_followers: 310000,
    author_verified: true,
    tweet_author_username: "pepecoineth",
  },
  {
    mint: MOCK_MINTS.pengu,
    symbol: "PENGU",
    name: "Pudgy Penguins",
    description: "The official token of the Pudgy Penguins ecosystem.",
    metadata_uri: "",
    twitter_url: "https://twitter.com/pudgypenguins",
    telegram_url: "",
    website_url: "https://pudgypenguins.com",
    discord_url: "",
    image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.pengu}.png`,
    detected_at: new Date(fiveMinAgo).toISOString(),
    created_at: new Date(fiveMinAgo).toISOString(),
    updated_at: new Date(now).toISOString(),
    platform: "raydium",
    source: "twitter",
    twitter_link_type: "cashtag",
    transaction_signature: "mock-sig-pengu",
    creator: "mock-creator-3",
    sol_amount: 4.8,
    market_cap: 210000000,
    price_usd: 0.034,
    liquidity: 12000000,
    volume_24h: 28000000,
    author_followers: 89000,
    author_verified: true,
    tweet_author_username: "pudgypenguins",
  },
  {
    mint: MOCK_MINTS.fwog,
    symbol: "FWOG",
    name: "Fwog",
    description: "A community-driven memecoin hopping across Solana.",
    metadata_uri: "",
    twitter_url: "https://twitter.com/fwogsol",
    telegram_url: "",
    website_url: "",
    discord_url: "",
    image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.fwog}.png`,
    detected_at: new Date(fiveMinAgo - 2 * 60 * 1000).toISOString(),
    created_at: new Date(fiveMinAgo - 2 * 60 * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
    platform: "pump",
    source: "twitter",
    twitter_link_type: "mention",
    transaction_signature: "mock-sig-fwog",
    creator: "mock-creator-4",
    sol_amount: 2.1,
    market_cap: 54000000,
    price_usd: 0.000054,
    liquidity: 890000,
    volume_24h: 3200000,
    author_followers: 12400,
    author_verified: false,
    tweet_author_username: "fwogsol",
  },
];

export const HARDCODED_WALLETS: any = {
  wallets: [
    {
      id: "wallet-1",
      address: "MockWhale111111111111111111111111111111111111",
      chain: "solana",
      label: "Mock Whale",
      trust_score: 0.88,
      total_trades: 142,
      winning_trades: 98,
      losing_trades: 44,
      avg_return_pct: 34.5,
      avg_hold_time_minutes: 180,
      best_trade_pct: 412,
      worst_trade_pct: -28,
      min_buy_size_usd: 500,
      is_active: true,
      notes: "Hardcoded demo whale",
      source: "manual",
      added_at: new Date(oneHourAgo).toISOString(),
      last_trade_at: new Date(fiveMinAgo).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    {
      id: "wallet-2",
      address: "MockAlpha222222222222222222222222222222222222",
      chain: "solana",
      label: "Mock Alpha",
      trust_score: 0.76,
      total_trades: 89,
      winning_trades: 58,
      losing_trades: 31,
      avg_return_pct: 22.1,
      avg_hold_time_minutes: 95,
      best_trade_pct: 210,
      worst_trade_pct: -15,
      min_buy_size_usd: 250,
      is_active: true,
      notes: "Hardcoded demo wallet",
      source: "manual",
      added_at: new Date(oneHourAgo - 20 * 60 * 1000).toISOString(),
      last_trade_at: new Date(fiveMinAgo - 3 * 60 * 1000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
  ],
};

export const HARDCODED_TRADING_CONFIG: any = {
  min_confidence: 0.72,
  min_market_cap: 50000,
  max_holder_concentration: 0.25,
  max_dev_risk_score: 0.6,
  buy_amount_sol: 1.5,
  max_positions: 10,
  take_profit_targets: [1.5, 2.5, 5.0],
  price_poll_interval_secs: 15,
  enabled: true,
  auto_buy: true,
  wallet_address: "MockWallet000000000000000000000000000000000000",
  sol_balance: 42.5,
  trading_mode: "ai_auto",
};

const baseHoldings = [
  {
    id: "holding-bonk",
    mint: MOCK_MINTS.bonk,
    symbol: "BONK",
    name: "Bonk",
    image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.bonk}.png`,
    status: "open",
    entry_price_usd: 0.00000580,
    current_price_usd: 0.00000621,
    entry_sol_value: 12.5,
    current_sol_value: 13.38,
    quantity: 2016129,
    current_quantity: 2016129,
    unrealized_pnl_sol: 0.88,
    unrealized_pnl_usd: 126.5,
    unrealized_pnl_pct: 7.04,
    realized_pnl_sol: 0,
    realized_pnl_usd: 0,
    take_profit_targets: [1.5, 2.5, 5.0],
    stop_loss_pct: 0.2,
    opened_at: new Date(oneHourAgo).toISOString(),
    updated_at: new Date(now).toISOString(),
    age_minutes: 60,
    platform: "raydium",
    buy_criteria: {
      summary: "High social momentum, whale accumulation detected.",
      confidence: 0.82,
      risk_score: 0.35,
    },
    all_targets: [1.5, 2.5, 5.0],
  },
  {
    id: "holding-pengu",
    mint: MOCK_MINTS.pengu,
    symbol: "PENGU",
    name: "Pudgy Penguins",
    image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.pengu}.png`,
    status: "open",
    entry_price_usd: 0.031,
    current_price_usd: 0.034,
    entry_sol_value: 4.8,
    current_sol_value: 5.26,
    quantity: 154838,
    current_quantity: 154838,
    unrealized_pnl_sol: 0.46,
    unrealized_pnl_usd: 66.2,
    unrealized_pnl_pct: 9.58,
    realized_pnl_sol: 0,
    realized_pnl_usd: 0,
    take_profit_targets: [1.5, 2.5, 5.0],
    stop_loss_pct: 0.18,
    opened_at: new Date(fiveMinAgo).toISOString(),
    updated_at: new Date(now).toISOString(),
    age_minutes: 5,
    platform: "raydium",
    buy_criteria: {
      summary: "Verified creator, strong holder distribution.",
      confidence: 0.79,
      risk_score: 0.28,
    },
    all_targets: [1.5, 2.5, 5.0],
  },
  {
    id: "holding-pepe",
    mint: MOCK_MINTS.pepe,
    symbol: "PEPE",
    name: "Pepe",
    image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.pepe}.png`,
    status: "partially_closed",
    entry_price_usd: 0.0000195,
    current_price_usd: 0.0000212,
    entry_sol_value: 7.2,
    current_sol_value: 7.83,
    quantity: 339622,
    current_quantity: 169811,
    unrealized_pnl_sol: 0.31,
    unrealized_pnl_usd: 44.6,
    unrealized_pnl_pct: 4.31,
    realized_pnl_sol: 0.31,
    realized_pnl_usd: 44.6,
    take_profit_targets: [1.5, 2.5],
    stop_loss_pct: 0.22,
    opened_at: new Date(oneHourAgo - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
    age_minutes: 30,
    platform: "pump",
    buy_criteria: {
      summary: "Meme momentum + breakout volume.",
      confidence: 0.74,
      risk_score: 0.45,
    },
    all_targets: [1.5, 2.5, 5.0],
  },
];

export const HARDCODED_HOLDINGS: any[] = baseHoldings;

export const HARDCODED_HISTORY: any[] = [
  {
    id: "hist-1",
    mint: MOCK_MINTS.fwog,
    symbol: "FWOG",
    name: "Fwog",
    status: "closed",
    entry_price_usd: 0.000048,
    exit_price_usd: 0.000054,
    entry_sol_value: 2.1,
    exit_sol_value: 2.36,
    quantity: 43750000,
    realized_pnl_sol: 0.26,
    realized_pnl_usd: 37.4,
    pnl_pct: 12.4,
    opened_at: new Date(oneHourAgo - 120 * 60 * 1000).toISOString(),
    closed_at: new Date(oneHourAgo - 90 * 60 * 1000).toISOString(),
    close_reason: "take_profit_1",
    platform: "pump",
    duration_minutes: 30,
  },
  {
    id: "hist-2",
    mint: MOCK_MINTS.pepe,
    symbol: "PEPE",
    name: "Pepe",
    status: "closed",
    entry_price_usd: 0.000020,
    exit_price_usd: 0.0000212,
    entry_sol_value: 3.6,
    exit_sol_value: 3.82,
    quantity: 180000000,
    realized_pnl_sol: 0.22,
    realized_pnl_usd: 31.7,
    pnl_pct: 6.0,
    opened_at: new Date(oneHourAgo - 80 * 60 * 1000).toISOString(),
    closed_at: new Date(oneHourAgo - 50 * 60 * 1000).toISOString(),
    close_reason: "manual",
    platform: "pump",
    duration_minutes: 30,
  },
];

export const HARDCODED_STATS: any = {
  open_positions: 3,
  closed_positions: 2,
  total_unrealized_pnl: 1.65,
  total_realized_pnl: 0.48,
  total_pnl: 2.13,
  winning_trades: 4,
  losing_trades: 1,
  win_rate: 0.8,
  avg_hold_time_minutes: 55,
  best_trade_pct: 12.4,
  worst_trade_pct: -3.2,
  daily_pnl: [0.12, 0.45, -0.08, 0.32, 0.88, 0.44, 1.65],
};

export const HARDCODED_WATCHLIST: any = {
  tokens: [
    {
      mint: MOCK_MINTS.fwog,
      symbol: "FWOG",
      name: "Fwog",
      image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.fwog}.png`,
      price_usd: 0.000054,
      market_cap: 54000000,
      volume_24h: 3200000,
      liquidity: 890000,
      price_change_1h: 8.4,
      price_change_24h: 22.1,
      check_count: 7,
      detected_at: new Date(fiveMinAgo).toISOString(),
      ai_reasoning: "Small-cap breakout with increasing social mentions and volume.",
      conviction: 0.71,
      will_trade: true,
    },
    {
      mint: MOCK_MINTS.pepe,
      symbol: "PEPE",
      name: "Pepe",
      image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.pepe}.png`,
      price_usd: 0.0000212,
      market_cap: 890000000,
      volume_24h: 42000000,
      liquidity: 5600000,
      price_change_1h: 1.2,
      price_change_24h: -2.5,
      check_count: 12,
      detected_at: new Date(oneHourAgo).toISOString(),
      ai_reasoning: "Established meme, holding support despite market dip.",
      conviction: 0.65,
      will_trade: false,
    },
    {
      mint: MOCK_MINTS.bonk,
      symbol: "BONK",
      name: "Bonk",
      image_url: `https://dd.dexscreener.com/ds-data/tokens/solana/${MOCK_MINTS.bonk}.png`,
      price_usd: 0.00000621,
      market_cap: 420000000,
      volume_24h: 18500000,
      liquidity: 2800000,
      price_change_1h: 3.7,
      price_change_24h: 11.4,
      check_count: 9,
      detected_at: new Date(oneHourAgo - 15 * 60 * 1000).toISOString(),
      ai_reasoning: "Dog-coin rotation, whale wallet spotted accumulating.",
      conviction: 0.78,
      will_trade: true,
    },
  ],
  stats: {
    total_tokens: 3,
    high_confidence_count: 2,
    last_updated: new Date(now).toISOString(),
  },
};

export const HARDCODED_WATCHLIST_REASONING: any = {
  reasonings: {
    [MOCK_MINTS.fwog]: [
      {
        reasoning: "Volume spike + social growth suggests near-term momentum.",
        conviction: 0.71,
        will_trade: true,
        timestamp: now,
      },
    ],
    [MOCK_MINTS.bonk]: [
      {
        reasoning: "Whale accumulation on support, risk/reward favorable.",
        conviction: 0.78,
        will_trade: true,
        timestamp: now,
      },
    ],
    [MOCK_MINTS.pepe]: [
      {
        reasoning: "Large cap, lower upside; skip until clearer setup.",
        conviction: 0.65,
        will_trade: false,
        timestamp: now,
      },
    ],
  },
};

export const HARDCODED_TRANSACTIONS: any = {
  items: [
    {
      id: "tx-1",
      mint: MOCK_MINTS.bonk,
      symbol: "BONK",
      type: "buy",
      amount_sol: 12.5,
      amount_usd: 1862,
      price_usd: 0.00000580,
      quantity: 2016129,
      tx_hash: "mock-tx-buy-bonk",
      timestamp: new Date(oneHourAgo).toISOString(),
      platform: "raydium",
      status: "confirmed",
      wallet_address: "MockWallet000000000000000000000000000000000000",
    },
    {
      id: "tx-2",
      mint: MOCK_MINTS.pepe,
      symbol: "PEPE",
      type: "sell",
      amount_sol: 3.82,
      amount_usd: 570,
      price_usd: 0.0000212,
      quantity: 180000000,
      tx_hash: "mock-tx-sell-pepe",
      timestamp: new Date(oneHourAgo - 50 * 60 * 1000).toISOString(),
      platform: "pump",
      status: "confirmed",
      wallet_address: "MockWallet000000000000000000000000000000000000",
    },
    {
      id: "tx-3",
      mint: MOCK_MINTS.fwog,
      symbol: "FWOG",
      type: "buy",
      amount_sol: 2.1,
      amount_usd: 313,
      price_usd: 0.000048,
      quantity: 43750000,
      tx_hash: "mock-tx-buy-fwog",
      timestamp: new Date(oneHourAgo - 120 * 60 * 1000).toISOString(),
      platform: "pump",
      status: "confirmed",
      wallet_address: "MockWallet000000000000000000000000000000000000",
    },
  ],
  has_more: false,
  total: 3,
};

// Wallet tracker mocks
const mockTrackerWallet = {
  id: "wallet-1",
  address: "MockWhale111111111111111111111111111111111111",
  label: "Mock Whale",
  pfp_url: null,
  twitter_handle: "@mockwhale",
  trust_score: 0.88,
  is_god_wallet: true,
  is_active: true,
};

const mockTrackerWallet2 = {
  id: "wallet-2",
  address: "MockAlpha222222222222222222222222222222222222",
  label: "Mock Alpha",
  pfp_url: null,
  twitter_handle: "@mockalpha",
  trust_score: 0.76,
  is_god_wallet: false,
  is_active: true,
};

export const HARDCODED_ACTIVE_WALLETS: any = {
  wallets: [mockTrackerWallet, mockTrackerWallet2],
  total: 2,
};

export const HARDCODED_GOD_WALLETS: any = {
  wallets: [mockTrackerWallet],
  total: 1,
};

export const HARDCODED_RECENT_BUYS: any = [
  {
    id: "buy-1",
    wallet_id: "wallet-1",
    mint: MOCK_MINTS.bonk,
    chain: "solana",
    token_symbol: "BONK",
    token_name: "Bonk",
    action: "buy",
    price_usd: 0.00000580,
    amount_tokens: 2016129,
    amount_native: 12.5,
    amount_usd: 1862,
    timestamp: new Date(oneHourAgo).toISOString(),
    tx_hash: "mock-tx-buy-bonk",
  },
  {
    id: "buy-2",
    wallet_id: "wallet-1",
    mint: MOCK_MINTS.pengu,
    chain: "solana",
    token_symbol: "PENGU",
    token_name: "Pudgy Penguins",
    action: "buy",
    price_usd: 0.031,
    amount_tokens: 154838,
    amount_native: 4.8,
    amount_usd: 691,
    timestamp: new Date(fiveMinAgo).toISOString(),
    tx_hash: "mock-tx-buy-pengu",
  },
];

export const HARDCODED_WALLET_ENTRIES: any = [
  {
    timestamp: oneHourAgo,
    price: 0.00000580,
    amount_sol: 12.5,
    amount_usd: 1862,
    wallet_label: "Mock Whale",
    is_god_wallet: true,
    tx_hash: "mock-tx-buy-bonk",
  },
  {
    timestamp: fiveMinAgo,
    price: 0.00000610,
    amount_sol: 6.2,
    amount_usd: 925,
    wallet_label: "Mock Alpha",
    is_god_wallet: false,
    tx_hash: "mock-tx-buy-bonk-2",
  },
];

export const HARDCODED_AGGREGATED_ENTRIES: any = {
  mint: MOCK_MINTS.bonk,
  wallets: [
    {
      wallet: mockTrackerWallet,
      avg_entry_mcap: 380000000,
      avg_entry_price: 0.00000580,
      total_bought_usd: 1862,
      total_bought_sol: 12.5,
      total_sold_usd: 0,
      total_sold_sol: 0,
      position_held_pct: 100,
      buy_count: 1,
      sell_count: 0,
      first_buy_at: new Date(oneHourAgo).toISOString(),
      last_activity_at: new Date(oneHourAgo).toISOString(),
      trades: [
        {
          timestamp: oneHourAgo,
          action: "buy",
          price_per_token: 0.00000580,
          mcap_at_trade: 380000000,
          amount_usd: 1862,
          amount_sol: 12.5,
          tx_hash: "mock-tx-buy-bonk",
        },
      ],
    },
  ],
  total_wallets: 1,
};

export const HARDCODED_WALLET_TRADES: any = [
  {
    timestamp: oneHourAgo,
    action: "buy",
    price_per_token: 0.00000580,
    mcap_at_trade: 380000000,
    amount_usd: 1862,
    amount_sol: 12.5,
    tx_hash: "mock-tx-buy-bonk",
  },
];

function buildPriceHistoryPoints(mint: string, durationMinutes: number) {
  const token = HARDCODED_TOKENS.find((t) => t.mint === mint) || HARDCODED_TOKENS[0];
  const price = token.price_usd || 0.00001;
  const points = [];
  const count = Math.min(durationMinutes, 60);
  const intervalMs = (durationMinutes * 60 * 1000) / count;
  for (let i = count; i >= 0; i--) {
    const time = now - i * intervalMs;
    const variance = 1 + (Math.random() - 0.5) * 0.1;
    points.push({
      recorded_at: new Date(time).toISOString(),
      price_usd: price * variance,
      market_cap: (token.market_cap || 1000000) * variance,
      liquidity: token.liquidity || 100000,
      volume_24h: token.volume_24h || 50000,
    });
  }
  return points;
}

export const HARDCODED_PRICE_HISTORY: any = (mint: string, durationMinutes: number) => {
  const token = HARDCODED_TOKENS.find((t) => t.mint === mint) || HARDCODED_TOKENS[0];
  const points = buildPriceHistoryPoints(mint, durationMinutes);
  return {
    mint,
    duration_minutes: durationMinutes,
    points,
    current_price: token.price_usd,
    price_change_pct: 7.5,
  };
};

/**
 * Return hardcoded data for a DevPrint API path.
 * Returns undefined if no mock is defined for the path.
 */
export function getHardcodedDevprintResponse(path: string): unknown {
  const normalized = path.split("?")[0];

  if (normalized === "/api/tokens") {
    // Migration endpoints may request a single token by mint
    const mintMatch = path.match(/\/api\/tokens\/([^/?]+)/);
    if (mintMatch) {
      return HARDCODED_TOKENS.find((t) => t.mint === mintMatch[1]) || HARDCODED_TOKENS[0];
    }
    return HARDCODED_TOKENS;
  }

  if (normalized === "/api/wallets") return HARDCODED_WALLETS;
  if (normalized === "/api/wallets/active") return HARDCODED_ACTIVE_WALLETS;
  if (normalized === "/api/wallets/god") return HARDCODED_GOD_WALLETS;
  if (normalized === "/api/wallets/recent-buys") return HARDCODED_RECENT_BUYS;

  if (normalized.startsWith("/api/wallets/token/") && normalized.endsWith("/entries")) {
    return HARDCODED_WALLET_ENTRIES;
  }

  if (normalized.startsWith("/api/wallets/token/") && normalized.endsWith("/aggregated")) {
    return HARDCODED_AGGREGATED_ENTRIES;
  }

  if (normalized.startsWith("/api/wallets/") && normalized.endsWith("/trades")) {
    return HARDCODED_WALLET_TRADES;
  }

  if (normalized === "/api/trading/config") return HARDCODED_TRADING_CONFIG;
  if (normalized === "/api/trading/holdings") return HARDCODED_HOLDINGS;
  if (normalized === "/api/analytics/history") return HARDCODED_HISTORY;
  if (normalized === "/api/analytics/stats") return HARDCODED_STATS;
  if (normalized === "/api/trading/watchlist") return HARDCODED_WATCHLIST;
  if (normalized === "/api/trading/watchlist/reasoning") return HARDCODED_WATCHLIST_REASONING;
  if (normalized === "/api/trading/transactions") return HARDCODED_TRANSACTIONS;
  if (normalized === "/api/trading/positions") return HARDCODED_HOLDINGS;

  if (normalized.startsWith("/api/tokens/") && normalized.endsWith("/price-history")) {
    const mintMatch = path.match(/\/api\/tokens\/([^/?]+)\/price-history/);
    const mint = mintMatch ? mintMatch[1] : MOCK_MINTS.bonk;
    const durationMatch = path.match(/[?&]duration=(\d+)/);
    const duration = durationMatch ? parseInt(durationMatch[1], 10) : 30;
    return HARDCODED_PRICE_HISTORY(mint, duration);
  }

  // Fallback: single-token lookup used by migration detail
  if (normalized.startsWith("/api/tokens/")) {
    const mintMatch = path.match(/\/api\/tokens\/([^/?]+)/);
    if (mintMatch) {
      return HARDCODED_TOKENS.find((t) => t.mint === mintMatch[1]) || HARDCODED_TOKENS[0];
    }
    return HARDCODED_TOKENS[0];
  }

  return undefined;
}
