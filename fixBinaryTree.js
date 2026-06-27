import { connect, disconnect } from "mongoose";
import { config } from "dotenv";
import { UserModel } from "./src/models/user.model.js";

config();

(async () => {
  await connect(process.env.MONGO_URI);
  console.log("✅ DB Connected");

  // Get root user (Rahul Sharma — the sponsor)
  const root = await UserModel.findOne({ userId: "RAH88669" });
  if (!root) { console.log("❌ Root user not found"); process.exit(1); }

  // Get all users who have root as referrer
  const directs = await UserModel.find({ referrer: root._id }).sort({ createdAt: 1 });
  console.log(`Found ${directs.length} direct users under ${root.name}`);

  // Binary placement: fill left first, then right, level by level (BFS)
  // Reset root children first
  root.leftChild = null;
  root.rightChild = null;
  await root.save();

  // Queue for placement: each entry = { parentId, side }
  const placementQueue = [
    { parentId: root._id, side: "left" },
    { parentId: root._id, side: "right" },
  ];

  for (const user of directs) {
    if (placementQueue.length === 0) break;

    const { parentId, side } = placementQueue.shift();
    const parent = await UserModel.findById(parentId);

    // Set child on parent
    parent[side === "left" ? "leftChild" : "rightChild"] = user._id;
    await parent.save();

    // Set placement info on child
    user.placementParent = parentId;
    user.placementSide = side;
    user.placementId = parent.userId;
    await user.save();

    console.log(`✅ ${user.name} (${user.userId}) → placed as ${side} child of ${parent.name} (${parent.userId})`);

    // Add this user's slots to queue
    placementQueue.push({ parentId: user._id, side: "left" });
    placementQueue.push({ parentId: user._id, side: "right" });
  }

  console.log("\n🎉 Binary tree fix complete!");
  await disconnect();
})();
