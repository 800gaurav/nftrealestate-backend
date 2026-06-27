const SERVICE_PLANS = [
  {
    code: "S1",
    rank: "Starter",
    title: "Starter Package",
    price: 12,
    dailyROI: "0.5%",
    referral: "10%",
    teamBonus: "1%",
    features: ["Staking Income (0.5%–1% daily)", "10% Referral Income", "Team Growth Bonus 1%", "Basic Dashboard Access"],
    badge: null,
  },
  {
    code: "S2",
    rank: "Silver",
    title: "Silver Package",
    price: 25,
    dailyROI: "0.5%–1%",
    referral: "10%",
    teamBonus: "2%",
    features: ["All Starter Benefits", "Higher Staking Rate", "Team Growth Bonus 2%", "Priority Support 24/7"],
    badge: null,
  },
  {
    code: "S3",
    rank: "Gold",
    title: "Gold Package",
    price: 50,
    dailyROI: "0.5%–1%",
    referral: "10%",
    teamBonus: "2%",
    features: ["All Silver Benefits", "10% Matching Income", "Full Rank Eligibility", "Dedicated Account Manager"],
    badge: "MOST POPULAR",
  },
  {
    code: "S4",
    rank: "Platinum",
    title: "Platinum Package",
    price: 100,
    dailyROI: "0.5%–1%",
    referral: "10%",
    teamBonus: "3%",
    features: ["All Benefits Unlocked", "3% Max Team Bonus", "All 4 Income Streams", "VIP Investor Benefits"],
    badge: "BEST VALUE",
  },
];

const INCOME_PLAN = {
  staking: {
    name: "Staking Income",
    minPercent: 0.5,
    maxPercent: 1,
    note: "0.5%–1% daily on staking principal. Compounding.",
  },
  joining: {
    name: "Joining Staking Income",
    percentOfJoiningAmount: 40, // 40% of package price goes to staking principal
  },
  sponsor: {
    name: "Sponsor / Referral Income",
    percent: 10, // 10% of direct referral package
  },
  teamGrowth: {
    name: "Team Growth Bonus",
    minPercent: 1,
    maxPercent: 3,
    requiredDirects: 10,       // min 10 direct referrals needed
    minimumIdAmount: 100,       // $100 package unlocks 3% max bonus
  },
  matching: {
    name: "Matching Income",
    percent: 10,                // 10% matching
    firstRatio: "2:1",          // first phase: 2:1 binary
    nextRatio: "1:1",           // after isBinaryStarted: 1:1
    dailyCap: 50,               // daily cap for <$100 package
    hundredDollarIdDailyCap: 100, // daily cap for $100 package
  },
  withdrawal: {
    minAmount: 5,               // minimum $5 withdrawal
    adminCharge: 10,            // 10% admin deduction
    onePendingAtATime: true,    // only 1 pending withdrawal allowed
  },
};

const REWARD_RANKS = [
  { rank: "Bronze",     business: 1000,    reward: "Welcome Kit",       icon: "🥉" },
  { rank: "Silver",     business: 5000,    reward: "Android Mobile",    icon: "🥈" },
  { rank: "Gold",       business: 20000,   reward: "Bangkok Tour",      icon: "🥇" },
  { rank: "Diamond",    business: 50000,   reward: "Car Down Payment",  icon: "💎" },
  { rank: "Crown",      business: 100000,  reward: "Fortuner Car",      icon: "👑" },
  { rank: "Ambassador", business: 500000,  reward: "2% Royalty Income", icon: "🌟" },
];

const SERVICES = [
  "Real Estate Services",
  "Property Investment",
  "Property Management",
  "NFT Real Estate",
  "Digital Asset Services",
  "E-Commerce",
  "Tour & Travel",
  "Banking Services",
  "Education Services",
  "Insurance Services",
  "Job Services",
  "Trading Services",
  "Agriculture Services",
  "Health Services",
  "Business Consulting",
];

const PLANS = {
  servicePlans: SERVICE_PLANS,
  services: SERVICES,
  incomePlan: INCOME_PLAN,
  rewardRanks: REWARD_RANKS,
};

export default PLANS;
export { SERVICE_PLANS, SERVICES, INCOME_PLAN, REWARD_RANKS };
