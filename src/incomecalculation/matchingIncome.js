import { INCOME_PLAN } from "../config/plans.js";
import { UserModel } from "../models/user.model.js";

const getDailyMatchingCap = (user) => {
  const matching = INCOME_PLAN.matching || {};
  return Number(user.totalInvested || 0) >= 100
    ? Number(matching.hundredDollarIdDailyCap || 100)
    : Number(matching.dailyCap || 50);
};

const creditMatchingIncome = async (user) => {
  if (!user.isActivated) return;

  let left = Number(user.leftCarry || 0);
  let right = Number(user.rightCarry || 0);
  const cap = getDailyMatchingCap(user);
  const remainingCap = Math.max(cap - Number(user.todayMatchingIncome || 0), 0);
  if (remainingCap <= 0 || left <= 0 || right <= 0) return;

  const percent = Number(INCOME_PLAN.matching?.percent || 10) / 100;
  let matchedBusiness = 0;

  if (!user.isBinaryStarted) {
    if (left >= right * 2) {
      matchedBusiness = right;
      left -= right * 2;
      right = 0;
    } else if (right >= left * 2) {
      matchedBusiness = left;
      right -= left * 2;
      left = 0;
    } else {
      user.leftCarry = left;
      user.rightCarry = right;
      await user.save();
      return;
    }
    user.isBinaryStarted = true;
  }

  const oneToOneBusiness = Math.min(left, right);
  matchedBusiness += oneToOneBusiness;
  left -= oneToOneBusiness;
  right -= oneToOneBusiness;

  const income = Math.min(matchedBusiness * percent, remainingCap);
  if (income > 0) {
    user.walletBalance += income;
    user.todayIncome += income;
    user.totalProfitEarned += income;
    user.matchingIncome += income;
    user.todayMatchingIncome += income;
    user.todaypair += 1;
  }

  user.leftCarry = left;
  user.rightCarry = right;
  await user.save();
};

export const updateBinaryBusinessAndMatching = async (buyerId, businessAmount) => {
  let current = await UserModel.findById(buyerId).select("placementParent");
  const amount = Number(businessAmount || 0);
  if (!current || amount <= 0) return;

  while (current?.placementParent) {
    const upliner = await UserModel.findById(current.placementParent).select(
      "leftChild rightChild leftTeamSp rightTeamSp leftCarry rightCarry isActivated isBinaryStarted todaypair todayIncome walletBalance totalProfitEarned totalInvested matchingIncome todayMatchingIncome placementParent"
    );
    if (!upliner) break;

    const currentId = String(current._id);
    if (String(upliner.leftChild || "") === currentId) {
      upliner.leftTeamSp += amount;
      upliner.leftCarry += amount;
    } else if (String(upliner.rightChild || "") === currentId) {
      upliner.rightTeamSp += amount;
      upliner.rightCarry += amount;
    }

    await creditMatchingIncome(upliner);
    current = upliner;
  }
};
