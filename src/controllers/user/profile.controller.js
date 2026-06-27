import { UserModel } from "../../models/user.model.js"
import { buildTree } from "../../utils/build-tree.js";
import { errorResponse, successResponse } from "../../utils/api-response.js"
import mongoose from "mongoose";



const profileController = {
  getLoggedinUserProfile: async (req, res) => {
    const user = await UserModel.findById(req.currentUser._id).select("-password");
    if (!user) return errorResponse(res, "User not found", 404);
    successResponse(res, "User data fetched successfully", user);
  },
  // 
  getReferralTree: async (req, res) => {
    const user = await UserModel.findById(req.currentUser._id).select("-password");
    if (!user) return errorResponse(res, "User not found", 404);

    const tree = await buildTree(user._id);
    successResponse(res, "Referral Tree fetched successfully", tree); 
  },

  getLeftRightChild: async (req, res) => {
    try {
      const { userId } = req.params;

      const query = mongoose.Types.ObjectId.isValid(userId) ? { _id: userId } : { userId };
      
      // First find the user
      const user = await UserModel.findOne(query).select("-password");

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Populate leftChild and rightChild
      const leftChild = user.leftChild
        ? await UserModel.findById(user.leftChild).select("_id userId name isActivated totalInvested walletBalance leftTeamSp rightTeamSp placementSide leftChild rightChild createdAt")
        : null;

      const rightChild = user.rightChild
        ? await UserModel.findById(user.rightChild).select("_id userId name isActivated totalInvested walletBalance leftTeamSp rightTeamSp placementSide leftChild rightChild createdAt")
        : null;

      const responseData = {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        isActivated: user.isActivated,
        totalInvested: user.totalInvested,
        walletBalance: user.walletBalance,
        leftTeamSp: user.leftTeamSp,
        rightTeamSp: user.rightTeamSp,
        placementSide: user.placementSide,
        createdAt: user.createdAt,
        leftChild,
        rightChild,
      };

      return res.json({ success: true, data: responseData });
    } catch (error) {
      console.error("Tree fetch error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch tree" });
    }
  },

  userdashboarddetails: async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch user with only needed fields
    const user = await UserModel.findOne(
      { userId },
      "_id name email createdAt isActivated fundBalance rankRewardIncome walletBalance totalInvested stakingPrincipal roiPercent proBonusIncome roiIncome matchingIncome todayIncome referralBonus leftTeamSp rightTeamSp totalProfitEarned"
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Fetch direct referrals in parallel
    const [directReferrals, directActiveReferrals] = await Promise.all([
      UserModel.countDocuments({ referrer: user._id }),
      UserModel.countDocuments({ referrer: user._id, isActivated: true }),
    ]);

    // Initialize
    let totalTeamBusiness = 0;
    let totalDownlineMembers = 0;
    let totalActiveDownlineMembers = 0;

    let currentLevelUserIds = [user._id];

    // Combine both business and downline logic into a single loop
    for (let level = 1; level <= 20; level++) {
      const downlineUsers = await UserModel.find(
        { referrer: { $in: currentLevelUserIds } },
        '_id totalInvested isActivated'
      ).lean();

      if (downlineUsers.length === 0) break;

      // Add business for this level
      totalTeamBusiness += downlineUsers.reduce(
        (sum, u) => sum + (u.totalInvested || 0),
        0
      );

      // For level > 1, calculate downline members
      if (level > 1) {
        totalDownlineMembers += downlineUsers.length;
        totalActiveDownlineMembers += downlineUsers.filter(u => u.isActivated).length;
      }

      currentLevelUserIds = downlineUsers.map(u => u._id);
    }

    const totalTeamMembers = directReferrals + totalDownlineMembers;
    const totalActiveTeamMembers = directActiveReferrals + totalActiveDownlineMembers;

    const stakingIncome = user.roiIncome || 0;
    const sponsorIncome = user.proBonusIncome || 0;
    const matchingIncome = user.matchingIncome || 0;
    const rankRewardIncome = user.rankRewardIncome || 0;
    const workingIncome = sponsorIncome + matchingIncome + rankRewardIncome;
    const nonWorkingIncome = stakingIncome;

    const dashboardData = {
      username: user.name,
      email: user.email,
      createdAt: user.createdAt,
      isActivated: user.isActivated,
      fundBalance: user.fundBalance,
      walletBalance: user.walletBalance,
      totalInvested: user.totalInvested,
      stakingPrincipal: user.stakingPrincipal || 0,
      roiPercent: user.roiPercent || 0.5,
      rankRewardIncome,
      totalTeamBusiness,
      leftTeamBusiness: user.leftTeamSp || 0,
      rightTeamBusiness: user.rightTeamSp || 0,
      directReferrals,
      directActiveReferrals,
      totalTeamMembers,
      workingIncome,
      nonWorkingIncome,
      totalActiveTeamMembers,
      sponsorIncome,
      proBonusIncome: sponsorIncome,
      stakingIncome,
      roiIncome: stakingIncome,
      matchingIncome,
      todayIncome: user.todayIncome,
      totalProfitEarned:
        user.totalProfitEarned ||
        sponsorIncome + stakingIncome + matchingIncome + rankRewardIncome
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
  },

  userDirectrefers: async (req, res) => {
  try {
    const {userId} = req.params;
    const user = await UserModel.findOne({userId}).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Correct variable name
    const directReferrals = await UserModel.find({ referrer: user._id }).select("-password");

    res.status(200).json({
      success: true,
      message: "Direct referrals fetched successfully",
      data: directReferrals,
    });

  } catch (error) {
    console.error("Error fetching direct referrals:", error);
    res.status(500).json({ success: false, error: error.message });
  }
},


// mainTofundtransfer: async (req, res) =>{
//   try {
//     const { userId } = req.params;
//     const { amount, txnpass } = req.body;

//     // Input validation
//     if (!amount || !txnpass) {
//       return res.status(400).json({ success: false, message: "Amount and txnpass are required." });
//     }

//     const user = await UserModel.findOne({userId});

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found." });
//     }

//     // Compare txnpass (no bcrypt)
//     if (user.txnpass !== txnpass) {
//       return res.status(401).json({ success: false, message: "Invalid transaction password." });
//     }

//     if (user.fundBalance < amount) {
//       return res.status(400).json({ success: false, message: "Insufficient main balance." });
//     }

//     // Transfer
//     user.fundBalance -= amount;
//     user.walletBalance += amount;

//     await user.save();

//     return res.status(200).json({
//       success: true,
//       message: "Fund transferred successfully from Main to Wallet.",
//       walletBalance: user.walletBalance,
//       fundBalance: user.fundBalance,
//     });

//   } catch (error) {
//     console.error("Transfer error:", error);
//     return res.status(500).json({ success: false, message: "Internal server error." });
//   }
// },



probonusIncomehistory: async (req, res) =>{
   try {
    // const userId = req.currentUser._id;  
    const {userId} = req.params

    const user = await UserModel.findOne({userId}).select("proBonusHistory");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Return exactly what you need: raw ObjectId + amounts + date
    const simplifiedHistory = user.proBonusHistory.map(entry => ({
      fromUser: entry.fromUser, 
      baseAmount: entry.baseAmount,
      amount: entry.amount,
      date: entry.date,
    }));

    res.status(200).json({
      success: true,
      message: "Pro Bonus Income fetched successfully",
      data: simplifiedHistory,
    });

  } catch (error) {
    console.error("Error in fetching probonusIncome:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
},

// getDownlineLevels: async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const rootUser = await UserModel.findOne({ userId }); // Find by userId
//     if (!rootUser) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const levelStats = [];
//     let currentLevelUserIds = [rootUser._id];

//     // Thresholds per level
//     const thresholds = {
//       1: 3000,
//       2: 8000,
//       3: 20000,
//       4: 40000,
//       5: 80000,
//       6: 120000,
//     };

//     for (let level = 1; level <= 20; level++) {
//       let downlineUsers = [];

//       if (currentLevelUserIds.length > 0) {
//         downlineUsers = await UserModel.find(
//           { referrer: { $in: currentLevelUserIds } },
//           '_id totalInvested'
//         );
//       }

//       const totalMembers = downlineUsers.length;
//       const totalInvestment = downlineUsers.reduce(
//         (sum, user) => sum + (user.totalInvested || 0),
//         0
//       );

//       const requiredInvestment = thresholds[level] || 0;

//       const isQualified =
//         (level <= 6 && totalInvestment >= requiredInvestment) ||
//         (level > 6 && rootUser.domesticUnlockedLevel >= level);

//       const status = isQualified ? "qualified" : "not qualified";

//       levelStats.push({
//         level,
//         totalMembers,
//         totalInvestment,
//         status,
//       });

//       // Always continue to next level (show all 20 levels)
//       currentLevelUserIds = downlineUsers.map(user => user._id);
//     }

//     return res.json({ success: true, levels: levelStats });
//   } catch (error) {
//     console.error("Error in getDownlineLevels:", error);
//     return res.status(500).json({ success: false, error: "Server error" });
//   }
// },

getDownlineLevels: async (req, res) => {
  try {
    const { userId } = req.params;

    const rootUser = await UserModel.findOne({ userId });
    if (!rootUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const levelStats = [];
    let currentLevelUserIds = [rootUser._id];

    // Store total investments at each level
    const levelInvestments = {};

    for (let level = 1; level <= 20; level++) {
      let downlineUsers = [];

      if (currentLevelUserIds.length > 0) {
        downlineUsers = await UserModel.find(
          { referrer: { $in: currentLevelUserIds } },
          '_id totalInvested'
        );
      }

      const totalMembers = downlineUsers.length;
      const totalInvestment = downlineUsers.reduce(
        (sum, user) => sum + (user.totalInvested || 0),
        0
      );

      levelInvestments[level] = totalInvestment;

      let isQualified = false;

      if (level === 1) {
        isQualified = true; // Always qualified
      } else if (level === 2 && levelInvestments[1] >= 3000) {
        isQualified = true;
      } else if (level === 3 && levelInvestments[2] >= 8000) {
        isQualified = true;
      } else if (level === 4 && levelInvestments[3] >= 20000) {
        isQualified = true;
      } else if (level === 5 && levelInvestments[4] >= 40000) {
        isQualified = true;
      } else if (level >= 6 && level <= 10 && levelInvestments[5] >= 80000) {
        isQualified = true;
      } else if (level >= 11 && level <= 20 && levelInvestments[6] >= 120000) {
        isQualified = true;
      }

      levelStats.push({
        level,
        totalMembers,
        totalInvestment,
        status: isQualified ? "qualified" : "not qualified",
      });

      currentLevelUserIds = downlineUsers.map(user => user._id);
    }

    return res.json({ success: true, levels: levelStats });

  } catch (error) {
    console.error("Error in getDownlineLevels:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
},


getLevelMembers: async (req, res) => {
  try {
    const { userId } = req.params;
    const { level } = req.query;
    const levelNum = parseInt(level);

    if (!userId || isNaN(levelNum)) {
      return res.status(400).json({ success: false, message: "userId and level (number) are required" });
    }

    const rootUser = await UserModel.findOne({ userId });
    if (!rootUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let currentLevelUserIds = [rootUser._id];
    let targetUsers = [];

    for (let i = 1; i <= levelNum; i++) {
      const nextLevelUsers = await UserModel.find({ referrer: { $in: currentLevelUserIds } });

      if (i === levelNum) {
        targetUsers = nextLevelUsers.map(user => ({
          name: user.name,
          userId: user.userId,
          totalInvested: user.totalInvested,
          createdAt: user.createdAt
        }));
        break;
      }

      currentLevelUserIds = nextLevelUsers.map(user => user._id);
      if (currentLevelUserIds.length === 0) break;
    }

    res.json({
      success: true,
      level: levelNum,
      totalUsers: targetUsers.length,
      users: targetUsers
    });
  } catch (error) {
    console.error("Error fetching level members:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
},

}

export { profileController };

