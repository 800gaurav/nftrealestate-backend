import { evaluateAndApplyRankReward } from "../incomecalculation/rewardIncome.js";
import { UserModel } from "../models/user.model.js";

export const getUplines = async (userId, maxDepth = 20) => {
  const uplines = [];
  let current = await UserModel.findById(userId).select("referrer").lean();
  let depth = 0;

  while (current && current.referrer && depth < maxDepth) {
    uplines.push(current.referrer);
    current = await UserModel.findById(current.referrer).select("referrer").lean();
    depth++;
  }
  return uplines;
};



export const testCalculateAllRewards = async (req, res) => {
  try {
    const allUsers = await UserModel.find({ isActivated: true, isDemo: { $ne: true } }).select("_id name");

    for (const u of allUsers) {
      console.log(`⚡ Checking rewards for: ${u.name || u._id}`);
      await evaluateAndApplyRankReward(u._id);
    }

    return res.json({
      success: true,
      message: `Reward evaluation triggered for ${allUsers.length} users`
    });
  } catch (err) {
    console.error("testCalculateAllRewards error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
