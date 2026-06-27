import { connect, disconnect } from "mongoose";
import { config } from "dotenv";
import { UserModel } from "./src/models/user.model.js";

config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = "Super Admin";

(async () => {
  try {
    await connect(process.env.MONGO_URI);
    console.log("✅ DB Connected");

    const existing = await UserModel.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log("⚠️  Admin already exists:", ADMIN_EMAIL);
      await disconnect();
      return;
    }

    const admin = await UserModel.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      isActivated: true,
    });

    console.log("✅ Admin created successfully!");
    console.log("   Email   :", ADMIN_EMAIL);
    console.log("   Password:", ADMIN_PASSWORD);
    console.log("   UserID  :", admin.userId);

    await disconnect();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
