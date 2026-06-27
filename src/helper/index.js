import { UserModel } from "../models/user.model.js";


const findBinaryPlacement = async (rootUser, sidePreference = "left") => {
    const side = sidePreference === "right" ? "right" : "left";
    const queue = [{ user: rootUser, level: 1 }];

    while (queue.length) {
        const { user: currentUser, level } = queue.shift();

        if (side === "left") {
            if (!currentUser.leftChild) {
                return { parent: currentUser, side: "left", binaryLevel: level + 1 };
            }
            const leftUser = await UserModel.findById(currentUser.leftChild);
            if (leftUser) queue.push({ user: leftUser, level: level + 1 });
        }

        if (side === "right") {
            if (!currentUser.rightChild) {
                return { parent: currentUser, side: "right", binaryLevel: level + 1 };
            }
            const rightUser = await UserModel.findById(currentUser.rightChild);
            if (rightUser) queue.push({ user: rightUser, level: level + 1 });
        }
    }

    throw new Error("Binary tree is full");
};




const buildReferralTree = async (userId, currentLevel, maxLevel) => {
    if (currentLevel > maxLevel) return null;

    // Find all users referred by this user
    const referrals = await UserModel.find({ referrer: userId }).select("name email walletBalance referralCode level");

    const children = await Promise.all(
        referrals.map(async (referral) => {
            const subtree = await buildReferralTree(referral._id, currentLevel + 1, maxLevel);
            return {
                _id: referral._id,
                name: referral.name,
                email: referral.email,
                level: referral.level,
                walletBalance: referral.walletBalance,
                referralCode: referral.referralCode,
                children: subtree || []
            };
        })
    );

    return children;
};

export {
    findBinaryPlacement,
    buildReferralTree

}
