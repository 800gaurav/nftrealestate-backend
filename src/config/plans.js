const SERVICE_PLANS = [
  {
    "code": "S1",
    "rank": "Starter",
    "title": "Starter Package",
    "price": 12,
    "dailyPercent": 0.5,
    "dailyROI": "0.5%",
    "referral": "10%",
    "features": [
      "Staking Income (0.5% daily)",
      "40% staking amount withdrawable",
      "Binary pair matching",
      "Basic Dashboard Access"
    ],
    "badge": null
  },
  {
    "code": "S2",
    "rank": "Silver",
    "title": "Silver Package",
    "price": 25,
    "dailyPercent": 0.5,
    "dailyROI": "0.5%",
    "referral": "10%",
    "features": [
      "All Starter Benefits",
      "Higher Staking Rate",
      "Binary pair matching",
      "Priority Support 24/7"
    ],
    "badge": null
  },
  {
    "code": "S3",
    "rank": "Gold",
    "title": "Gold Package",
    "price": 50,
    "dailyPercent": 0.5,
    "dailyROI": "0.5%",
    "referral": "10%",
    "features": [
      "All Silver Benefits",
      "10% Matching Income",
      "Full Rank Eligibility",
      "No signup bonus"
    ],
    "badge": "MOST POPULAR"
  },
  {
    "code": "S4",
    "rank": "Platinum",
    "title": "Platinum Package",
    "price": 100,
    "dailyPercent": 0.5,
    "dailyROI": "1%",
    "referral": "10%",
    "features": [
      "All Benefits Unlocked",
      "Higher binary pair cap",
      "Rank reward eligibility",
      "VIP Investor Benefits"
    ],
    "badge": "BEST VALUE"
  }
];

const INCOME_PLAN = {
  "staking": {
    "name": "Staking Income",
    "note": "Daily staking income comes from each package dailyPercent."
  },
  "joining": {
    "name": "Joining Staking Income",
    "percentOfJoiningAmount": 40
  },
  "sponsor": {
    "name": "Sponsor / Referral Income",
    "percent": 10
  },
  "teamGrowth": {
    "name": "Team Growth Bonus",
    "percent": 1,
    "requiredDirects": 10
  },
  "matching": {
    "name": "Matching Income",
    "percent": 10,
    "firstRatio": "2:1",
    "nextRatio": "1:1",
    "dailyCap": 50,
    "hundredDollarIdDailyCap": 100
  },
  "withdrawal": {
    "minAmount": 5,
    "adminCharge": 10,
    "onePendingAtATime": true
  }
};

const REWARD_RANKS = [
  {
    "level": "1st",
    "rank": "Bronze",
    "business": 1000,
    "reward": "Welcome Kit"
  },
  {
    "level": "2nd",
    "rank": "Silver",
    "business": 5000,
    "reward": "Android Mobile"
  },
  {
    "level": "3rd",
    "rank": "Gold",
    "business": 20000,
    "reward": "Bangkok Tour"
  },
  {
    "level": "4th",
    "rank": "Diamond",
    "business": 50000,
    "reward": "Thailand 3N/4 Day + Car + Foreign D/P"
  },
  {
    "level": "5th",
    "rank": "Crown",
    "business": 100000,
    "reward": "Fortuner"
  },
  {
    "level": "6th",
    "rank": "Ambassador",
    "business": 500000,
    "reward": "2% Royalty T/C"
  }
];

const SERVICES = [
  "Real Estate Services", "Property Investment", "Property Management",
  "NFT Real Estate", "Digital Asset Services", "E-Commerce",
  "Tour & Travel", "Banking Services", "Education Services",
  "Insurance Services", "Job Services", "Trading Services",
  "Agriculture Services", "Health Services", "Business Consulting",
];

const PLANS = { servicePlans: SERVICE_PLANS, services: SERVICES, incomePlan: INCOME_PLAN, rewardRanks: REWARD_RANKS };

export default PLANS;
export { SERVICE_PLANS, SERVICES, INCOME_PLAN, REWARD_RANKS };
