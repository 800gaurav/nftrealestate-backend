import nodemailer from "nodemailer";
import { UserModel } from "../../models/user.model.js";
import { NftModel } from "../../models/nftstock.model.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";
import { sendbuynftEmailOtp } from "../../utils/nodemailer.js";
import dayjs from "dayjs";
import { INCOME_PLAN, SERVICE_PLANS } from "../../config/plans.js";
import { updateBinaryBusinessAndMatching } from "../../incomecalculation/matchingIncome.js";

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;



const sendPurchaseOtp = async (req, res) =>{
    const {userId} = req.params;
    const {nftId} = req.body

try {
    const user = await UserModel.findOne({userId});
    const nft = await NftModel.findById(nftId);
    if(!user) return res.status(404).json({ success: false, message: "User not found" });
    if(!nft) return res.status(404).json({ success: false, message: "NFT not found" });
    if (!SERVICE_PLANS.some(plan => plan.price === nft.price)) {
      return res.status(400).json({ success: false, message: "Invalid service package" });
    }
    const selectedPackage = SERVICE_PLANS.find(plan => Number(plan.price) === Number(nft.price));

    // Fund wallet check - agar fund balance hai to OTP bhejo, warna oxapay flow
    const hasFundBalance = user.fundBalance >= nft.price;

    const otp = Math.floor(100000 + Math.random() * 900000);
    user.nftbuyOTP = otp;
    await user.save();

    if (hasFundBalance) {
      const { success, error } = await sendbuynftEmailOtp(user.email, otp);
      if (!success) return res.status(500).json({ success: false, message: "Failed to send OTP", error });
    }

    res.status(200).json({
      success: true,
      message: hasFundBalance ? "OTP sent to your email" : "Proceed with OxaPay payment",
      userId: user.userId,
      txnPassword: user.txnpass,
      nft,
      hasFundBalance,
      fundBalance: user.fundBalance,
    });

} catch (error) {
    console.error("Error in sendPurchaseOtp:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
}
}

const confirmBuyNft = async (req, res) => {
  const { nftId, otp, txnpass, userId} = req.body;

  try {
    const user = await UserModel.findOne({userId});
    const nft = await NftModel.findById(nftId);

    if (!user || !nft) return res.status(404).json({ success: false, message: "User or NFT not found" });
    if (!SERVICE_PLANS.some(plan => plan.price === nft.price)) {
      return res.status(400).json({ success: false, message: "Invalid service package" });
    }
    const selectedPackage = SERVICE_PLANS.find(plan => Number(plan.price) === Number(nft.price));

    const referrar = await UserModel.findById(user.referrer);
    if (String(user.txnpass || "").trim() !== String(txnpass || "").trim())
      return res.status(404).json({ success: false, message: "Transaction password is wrong" });

    const hasFundBalance = user.fundBalance >= nft.price;

    if (hasFundBalance) {
      // Fund wallet se payment
      if (user.nftbuyOTP !== Number(otp)) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
      const packageAmount = Number(nft.price || 0);
      const stakingAmount = round2((packageAmount * Number(INCOME_PLAN.joining.percentOfJoiningAmount || 40)) / 100);

      user.fundBalance = round2(user.fundBalance - packageAmount);
      user.fundWalletHistory = user.fundWalletHistory || [];
      user.fundWalletHistory.push({
        type: "debit",
        amount: packageAmount,
        note: `Package purchase: ${nft.title || nft._id}`,
        balanceAfter: user.fundBalance,
        date: new Date(),
      });
      user.fundBalance = round2(user.fundBalance + stakingAmount);
      user.fundWalletHistory.push({
        type: "credit",
        amount: stakingAmount,
        note: `40% staking amount credited from package: ${nft.title || nft._id}`,
        balanceAfter: user.fundBalance,
        date: new Date(),
      });
      user.totalInvested += packageAmount;
      user.stakingPrincipal += stakingAmount;
      user.roiPercent = Number(selectedPackage?.dailyPercent || 0.5);
      user.stopROIIncome = false;
      user.nfts.push({ nft: nft._id, price: packageAmount });
      user.isActivated = true;
      user.nftbuyOTP = null;
      await user.save();
      await updateBinaryBusinessAndMatching(user._id, packageAmount);

      // Sponsor income - 10%
      if (referrar && Number(INCOME_PLAN.sponsor.percent || 0) > 0) {
        const sponsorIncome = round2((packageAmount * Number(INCOME_PLAN.sponsor.percent || 0)) / 100);
        referrar.walletBalance += sponsorIncome;
        referrar.todayIncome += sponsorIncome;
        referrar.proBonusIncome += sponsorIncome;
        referrar.totalProfitEarned += sponsorIncome;
        referrar.proBonusHistory = referrar.proBonusHistory || [];
        referrar.proBonusHistory.push({
          fromUser: user.userId,
          amount: sponsorIncome,
          baseAmount: packageAmount,
          date: new Date(),
        });
        await referrar.save();
        await user.save();
      }

      return res.status(200).json({ success: true, message: "Package purchased successfully from Fund Wallet." });
    } else {
      // Normal OxaPay flow - sirf validate karo
      return res.status(200).json({ success: true, message: "Proceed with OxaPay payment", useOxaPay: true });
    }
  } catch (error) {
    console.error("Error in buyNft:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getbuynft = async (req, res)=>{
   try {
    const {userId} = req.params
    const user = await UserModel.findOne({userId: userId}).select("nfts").populate('nfts.nft');
    if(!user) return errorResponse(res, "user not found", 404)
         const updatedNFTs = user.nfts.map(nft => {
      const daysPassed = dayjs().diff(dayjs(nft.purchasedAt), "day");
      const daysCount = Math.max(400 - daysPassed, 0); // Ensure no negative value

      return {
        ...nft.toObject(), // convert Mongoose subdoc to plain object
        daysCount
      };
    });

       return successResponse(res, "data fetched successfully", {nfts: updatedNFTs}, 200)
   } catch (error) {
    console.log(error)
    errorResponse(res, "something went wornt", 500)
   } 
}

export {
      sendPurchaseOtp,
    confirmBuyNft,
    getbuynft
}
