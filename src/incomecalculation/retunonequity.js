
import { getAvailableIncome } from "../helper/capping.js";
import { INCOME_PLAN } from "../config/plans.js";
import { UserModel } from "../models/user.model.js";

const getStakingPrincipal = (user) => {
    if (Number(user.stakingPrincipal || 0) > 0) return Number(user.stakingPrincipal || 0);
    return (Number(user.totalInvested || 0) * Number(INCOME_PLAN.joining?.percentOfJoiningAmount || 40)) / 100;
};

// 🆕 ROI based on investment amount slabs
function getStakingRate(user) {
    const staking = INCOME_PLAN.staking || {};
    const minRate = Number(staking.minPercent || 0.5) / 100;
    const maxRate = Number(staking.maxPercent || 1) / 100;
    const userRate = Number(user.roiPercent || staking.minPercent || 0.5) / 100;
    return Math.min(Math.max(userRate, minRate), maxRate);
}

export const calculateDailyIncome = async () => {
    const users = await UserModel.find({
        $or: [
            { stakingPrincipal: { $gt: 0 } },
            { totalInvested: { $gt: 0 } }
        ]
    });
 
    
    for (const user of users) {
        if (user.stopROIIncome) continue;
        const stakingPrincipal = getStakingPrincipal(user);
        if (stakingPrincipal <= 0) continue;
        const rate = getStakingRate(user);
        
        const todayIncome = stakingPrincipal * rate;

        // ✅ Cap check
        const available = await getAvailableIncome(user._id, "nonWorking");
        if (available <= 0) {
            user.stopROIIncome = true;
            await user.save();
            continue;
        }

        const addableIncome = Math.min(todayIncome, available);

        user.todayIncome += addableIncome;
        user.walletBalance += addableIncome;
        user.roiIncome += addableIncome;
        user.totalProfitEarned = (user.totalProfitEarned || 0) + addableIncome;

        user.roiIncomeHistory.push({
            date: new Date(),
            amount: addableIncome
        });

         await user.save();
    }
};
