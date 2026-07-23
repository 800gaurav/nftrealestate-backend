import { connect, disconnect } from "mongoose";
import { config } from "dotenv";
import { UserModel } from "./src/models/user.model.js";

config();

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/jupiter";
    await connect(mongoUri);
    console.log("✅ DB Connected");

    // 1. Setup Demo User
    const demoUserEmail = "demo.user@nftrealestate.com";
    const existingUser = await UserModel.findOne({ email: demoUserEmail });
    if (existingUser) {
      console.log("⚠️  Demo User already exists:", demoUserEmail);
    } else {
      const demoUser = await UserModel.create({
        name: "Demo User",
        email: demoUserEmail,
        password: "DemoUser@123",
        txnpass: "123456",
        userId: "DEMOUSER",
        phone: 9999999999,
        role: "user",
        isActivated: true,
        isDemo: true,
      });
      console.log("✅ Demo User created successfully!");
      console.log("   User ID : DEMOUSER");
      console.log("   Email   :", demoUser.email);
      console.log("   Password: DemoUser@123");
    }

    // 2. Setup Demo Admin
    const demoAdminEmail = "demo.admin@nftrealestate.com";
    const existingAdmin = await UserModel.findOne({ email: demoAdminEmail });
    if (existingAdmin) {
      console.log("⚠️  Demo Admin already exists:", demoAdminEmail);
    } else {
      const demoAdmin = await UserModel.create({
        name: "Demo Admin",
        email: demoAdminEmail,
        password: "DemoAdmin@123",
        role: "admin",
        isActivated: true,
        isDemo: true,
      });
      console.log("✅ Demo Admin created successfully!");
      console.log("   Email   :", demoAdmin.email);
      console.log("   Password: DemoAdmin@123");
    }

    await disconnect();
    console.log("🔌 DB Disconnected");
  } catch (err) {
    console.error("❌ Error running script:", err.message);
    process.exit(1);
  }
})();
