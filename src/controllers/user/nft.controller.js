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
    if(user.fundBalance < nft.price) return res.status(400).json({ success: false, message: "Insufficient balance" });


    const otp = Math.floor(100000 + Math.random() * 900000);
    user.nftbuyOTP = otp;
     await user.save();
       const { success, error } = await sendbuynftEmailOtp(user.email, otp);
    if (!success) {
      return res.status(500).json({ success: false, message: "Failed to send OTP", error });
    }

    res.status(200).json({ success: true, message: "OTP sent to your email" ,userId: user.userId, txnPassword: user.txnpass, nft});



    //  const transporter = nodemailer.createTransport({
    //   service: process.env.EMAIL_HOST,
    //   auth: {
    //     user: process.env.EMAIL_USERNAME,
    //     pass: process.env.EMAIL_PASSWORD,
    //   },
    // });
    //    await transporter.sendMail({
    //   from: process.env.EMAIL_USERNAME,
    //   to: user.email,
    //   subject: "NFT Purchase OTP",
    //   text: `Your OTP for NFT Purchase is ${otp}`,
    // });
    //  res.status(200).json({ success: true, message: "OTP sent to your email" });

} catch (error) {
    console.error("Error in sendPurchaseOtp:", error);
    res.status(500).json({ success: false, message: "Internal server error",  });
}
}

const confirmBuyNft = async (req, res) => {
  // const { userId } = req.params;
  const { nftId, otp, txnpass, userId} = req.body;
  // const { nftId, txnpass, userId} = req.body;


  try {
    const user = await UserModel.findOne({userId});
    const nft = await NftModel.findById(nftId);
  //  console.log(user)
   console.log(nft)

    if (!user || !nft) return res.status(404).json({ success: false, message: "User or NFT not found" });
    if (!SERVICE_PLANS.some(plan => plan.price === nft.price)) {
      return res.status(400).json({ success: false, message: "Invalid service package" });
    }
    console.log('here')
     const referrar = await UserModel.findById(user.referrer)
    if (String(user.txnpass || "").trim() !== String(txnpass || "").trim())return res.status(404).json({ success: false, message: "Transaction password is worong" });
    if (user.fundBalance < nft.price) return res.status(400).json({ success: false, message: "Insufficient balance" });

if(user.nftbuyOTP !== Number(otp)){
    console.log(`userby${user.nftbuyOTP} otp${otp}`)
     return res.status(400).json({ success: false, message: "Invalid OTP" });
}

    const packageAmount = Number(nft.price || 0);
    const stakingAmount = round2((packageAmount * Number(INCOME_PLAN.joining.percentOfJoiningAmount || 40)) / 100);

    user.fundBalance -= packageAmount;
    user.totalInvested += packageAmount;
    user.stakingPrincipal += stakingAmount;
    if (referrar && !user.referralGiven) {
      const sponsorIncome = (packageAmount * INCOME_PLAN.sponsor.percent) / 100;
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
      user.referralGiven = true;
    }
    user.nfts.push({ nft: nft._id, price: packageAmount });
    user.isActivated = true
    user.nftbuyOTP = null;
    await user.save();
    await updateBinaryBusinessAndMatching(user._id, packageAmount);

    res.status(200).json({ success: true, message: "Service package purchased successfully." });
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
