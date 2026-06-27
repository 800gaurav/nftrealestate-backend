import { UserModel } from "../models/user.model.js"

export const resetDailyIncomes = async () => {
await UserModel.updateMany({}, {
    $set: {
      todayIncome: 0,
      todayMatchingIncome: 0,
      todaypair: 0,
    }
});
};
