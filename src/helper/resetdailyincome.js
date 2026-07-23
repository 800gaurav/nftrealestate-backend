import { UserModel } from "../models/user.model.js"

export const resetDailyIncomes = async () => {
await UserModel.updateMany({ isDemo: { $ne: true } }, {
    $set: {
      todayIncome: 0,
      todayMatchingIncome: 0,
      todaypair: 0,
    }
});
};
