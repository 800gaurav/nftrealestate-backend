import { INCOME_PLAN, SERVICE_PLANS } from "../config/plans.js";
import { UserModel } from "../models/user.model.js";

const isStakingWorkingDay = (date = new Date()) => {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
  return day !== "Sat" && day !== "Sun";
};

const getStakingPrincipal = (user) => {
  if (Number(user.stakingPrincipal || 0) > 0) return Number(user.stakingPrincipal);
  return (Number(user.totalInvested || 0) * Number(INCOME_PLAN.joining?.percentOfJoiningAmount || 40)) / 100;
};

function getStakingRate(user) {
  const userRate = Number(user.roiPercent || 0);
  if (userRate > 0) return userRate / 100;

  if (user.nfts && user.nfts.length > 0) {
    const lastNft = user.nfts[user.nfts.length - 1];
    const matchedPlan = SERVICE_PLANS.find(p => Number(p.price) === Number(lastNft.price));
    if (matchedPlan && matchedPlan.dailyPercent > 0) {
      return Number(matchedPlan.dailyPercent) / 100;
    }
  }

  return 0.5 / 100;
}

export const calculateDailyIncome = async () => {
  if (!isStakingWorkingDay()) {
    console.log("Staking income skipped: Saturday/Sunday off.");
    return;
  }

  const users = await UserModel.find({
    $or: [{ stakingPrincipal: { $gt: 0 } }, { totalInvested: { $gt: 0 } }],
  });

  for (const user of users) {
    if (user.stopROIIncome) continue;

    const stakingPrincipal = getStakingPrincipal(user);
    if (stakingPrincipal <= 0) continue;

    // Staking cap: total roiIncome must not exceed stakingPrincipal (40% of package)
    const alreadyEarned = Number(user.roiIncome || 0);
    if (alreadyEarned >= stakingPrincipal) {
      user.stopROIIncome = true;
      await user.save();
      continue;
    }

    const rate = getStakingRate(user);
    const todayIncome = stakingPrincipal * rate;
    // Don't exceed the cap
    const addableIncome = Math.min(todayIncome, stakingPrincipal - alreadyEarned);

    user.todayIncome = (user.todayIncome || 0) + addableIncome;
    user.walletBalance = (user.walletBalance || 0) + addableIncome;
    user.roiIncome = alreadyEarned + addableIncome;
    user.totalProfitEarned = (user.totalProfitEarned || 0) + addableIncome;

    user.roiIncomeHistory.push({ date: new Date(), amount: addableIncome });

    await user.save();
  }
};
