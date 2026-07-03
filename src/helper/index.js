import { UserModel } from "../models/user.model.js";


const findBinaryPlacement = async (rootUser, sidePreference = "left") => {
    const side = sidePreference === "right" ? "right" : "left";
    const preferredChildField = side === "left" ? "leftChild" : "rightChild";
    const rootLevel = Number(rootUser.binaryLevel || 0);
    const rootUserId = rootUser._id.toString();

    if (!rootUser[preferredChildField]) {
        return { parent: rootUser, side, binaryLevel: rootLevel + 1 };
    }

    if (rootUser[preferredChildField].toString() === rootUserId) {
        return { parent: rootUser, side, binaryLevel: rootLevel + 1, replaceChildId: rootUser[preferredChildField] };
    }

    const preferredRoot = await UserModel.findById(rootUser[preferredChildField]).select(
        "_id userId leftChild rightChild binaryLevel"
    );

    if (!preferredRoot) {
        return { parent: rootUser, side, binaryLevel: rootLevel + 1, replaceChildId: rootUser[preferredChildField] };
    }

    const queue = [{ user: preferredRoot, level: rootLevel + 1 }];
    const visited = new Set([rootUserId]);

    while (queue.length) {
        const { user: currentUser, level } = queue.shift();
        const currentUserId = currentUser._id.toString();
        if (visited.has(currentUserId)) {
            return { parent: rootUser, side, binaryLevel: rootLevel + 1, replaceChildId: rootUser[preferredChildField] };
        }
        visited.add(currentUserId);

        const currentLevel = Number(currentUser.binaryLevel || level);

        if (!currentUser.leftChild) {
            return { parent: currentUser, side: "left", binaryLevel: currentLevel + 1 };
        }

        if (!currentUser.rightChild) {
            return { parent: currentUser, side: "right", binaryLevel: currentLevel + 1 };
        }

        const children = await UserModel.find({
            _id: { $in: [currentUser.leftChild, currentUser.rightChild] },
        }).select("_id userId leftChild rightChild binaryLevel");

        const childById = new Map(children.map((child) => [child._id.toString(), child]));
        const leftUser = childById.get(currentUser.leftChild.toString());
        const rightUser = childById.get(currentUser.rightChild.toString());

        if (!leftUser) {
            return { parent: currentUser, side: "left", binaryLevel: currentLevel + 1, replaceChildId: currentUser.leftChild };
        }

        if (!rightUser) {
            return { parent: currentUser, side: "right", binaryLevel: currentLevel + 1, replaceChildId: currentUser.rightChild };
        }

        if (leftUser) queue.push({ user: leftUser, level: currentLevel + 1 });
        if (rightUser) queue.push({ user: rightUser, level: currentLevel + 1 });
    }

    throw new Error(`No available binary placement found under ${rootUser.userId || rootUser._id} on ${side} side`);
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
