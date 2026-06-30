import { UserModel } from "../models/user.model.js";
import { successResponse, errorResponse } from "../utils/api-response.js";

export const RANK_TIERS = [
  { level: "1st", rank: "Bronze", business: 1000, reward: "Welcome Kit" },
  { level: "2nd", rank: "Silver", business: 5000, reward: "Android Mobile" },
  { level: "3rd", rank: "Gold", business: 20000, reward: "Bangkok Tour" },
  { level: "4th", rank: "Diamond", business: 50000, reward: "Thailand 3N/4 Day + Car + Foreign D/P" },
  { level: "5th", rank: "Crown", business: 100000, reward: "Fortuner" },
  { level: "6th", rank: "Ambassador", business: 500000, reward: "2% Royalty T/C" },
];

const getTeamBusiness = async (userId) => {
  let total = 0;
  let currentLevelIds = [userId];

  for (let level = 1; level <= 20; level += 1) {
    const downline = await UserModel.find(
      { referrer: { $in: currentLevelIds } },
      "_id totalInvested"
    ).lean();

    if (downline.length === 0) break;
    total += downline.reduce((sum, user) => sum + Number(user.totalInvested || 0), 0);
    currentLevelIds = downline.map((user) => user._id);
  }

  return total;
};

export const getRankForBusiness = (teamBusiness) => {
  let currentRank = null;
  for (const tier of RANK_TIERS) {
    if (Number(teamBusiness || 0) >= tier.business) currentRank = tier;
  }
  return currentRank;
};

export const evaluateAndApplyRankReward = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) return null;

  const teamBusiness = await getTeamBusiness(user._id);
  const rank = getRankForBusiness(teamBusiness);

  user.currentRank = rank ? rank.rank : null;
  user.teamBusiness = teamBusiness;
  await user.save();

  return { userId: user.userId, rank: user.currentRank, teamBusiness };
};

export const evaluateAllUsersRankRewards = async () => {
  const users = await UserModel.find({}, "_id userId").lean();
  for (const user of users) {
    try {
      await evaluateAndApplyRankReward(user._id);
    } catch (err) {
      console.error(`Rank update error for ${user.userId}:`, err.message);
    }
  }
};

export const getAllUsersRank = async (req, res) => {
  try {
    const users = await UserModel.find({ isActivated: true })
      .select("userId name totalInvested teamBusiness currentRank createdAt")
      .sort({ teamBusiness: -1 })
      .lean();

    const result = users.map((user) => {
      const rankObj = RANK_TIERS.find((rank) => rank.rank === user.currentRank) || null;
      return {
        userId: user.userId,
        name: user.name,
        totalInvested: user.totalInvested || 0,
        teamBusiness: user.teamBusiness || 0,
        level: rankObj?.level || "-",
        rank: user.currentRank || "-",
        reward: rankObj?.reward || "-",
        createdAt: user.createdAt,
      };
    });

    return successResponse(res, "User ranks fetched", { ranks: result, rankPlan: RANK_TIERS });
  } catch (err) {
    return errorResponse(res, "Failed to fetch ranks");
  }
};

export const getUserRank = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findOne({ userId }).select("_id userId name totalInvested").lean();
    if (!user) return errorResponse(res, "User not found", 404);

    const teamBusiness = await getTeamBusiness(user._id);
    const currentRank = getRankForBusiness(teamBusiness);
    const nextRank = RANK_TIERS.find((rank) => rank.business > teamBusiness) || null;

    return successResponse(res, "Rank fetched", {
      userId: user.userId,
      name: user.name,
      totalInvested: user.totalInvested || 0,
      teamBusiness,
      currentRank,
      nextRank,
      allRanks: RANK_TIERS,
    });
  } catch (err) {
    return errorResponse(res, "Failed to fetch rank");
  }
};
