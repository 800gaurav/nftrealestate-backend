import { connect, disconnect } from "mongoose";
import { config } from "dotenv";
import { UserModel } from "./src/models/user.model.js";

config();

const dummyUsers = [
  { name: "Rahul Sharma",   email: "rahul@nftrealstate.com",   phone: 9876543210, totalInvested: 100, walletBalance: 45.5,  fundBalance: 20 },
  { name: "Priya Singh",    email: "priya@nftrealstate.com",   phone: 9876543211, totalInvested: 50,  walletBalance: 22.0,  fundBalance: 10 },
  { name: "Amit Kumar",     email: "amit@nftrealstate.com",    phone: 9876543212, totalInvested: 200, walletBalance: 90.0,  fundBalance: 50 },
  { name: "Neha Gupta",     email: "neha@nftrealstate.com",    phone: 9876543213, totalInvested: 25,  walletBalance: 10.5,  fundBalance: 5  },
  { name: "Vikas Patel",    email: "vikas@nftrealstate.com",   phone: 9876543214, totalInvested: 100, walletBalance: 35.0,  fundBalance: 15 },
  { name: "Sunita Yadav",   email: "sunita@nftrealstate.com",  phone: 9876543215, totalInvested: 50,  walletBalance: 18.0,  fundBalance: 8  },
  { name: "Ravi Verma",     email: "ravi@nftrealstate.com",    phone: 9876543216, totalInvested: 200, walletBalance: 75.0,  fundBalance: 30 },
  { name: "Pooja Mehta",    email: "pooja@nftrealstate.com",   phone: 9876543217, totalInvested: 100, walletBalance: 42.0,  fundBalance: 20 },
  { name: "Deepak Joshi",   email: "deepak@nftrealstate.com",  phone: 9876543218, totalInvested: 25,  walletBalance: 8.0,   fundBalance: 3  },
  { name: "Kavita Rawat",   email: "kavita@nftrealstate.com",  phone: 9876543219, totalInvested: 50,  walletBalance: 15.0,  fundBalance: 6  },
];

(async () => {
  try {
    await connect(process.env.MONGO_URI);
    console.log("✅ DB Connected");

    let firstUser = null;

    for (let i = 0; i < dummyUsers.length; i++) {
      const data = dummyUsers[i];

      const existing = await UserModel.findOne({ email: data.email });
      if (existing) {
        console.log(`⚠️  User already exists: ${data.email}`);
        if (i === 0) firstUser = existing;
        continue;
      }

      const userData = {
        name: data.name,
        email: data.email,
        password: "User@123",
        phone: data.phone,
        role: "user",
        isActivated: true,
        totalInvested: data.totalInvested,
        stakingPrincipal: Math.round(data.totalInvested * 0.4),
        walletBalance: data.walletBalance,
        fundBalance: data.fundBalance,
        totalProfitEarned: data.walletBalance,
        roiIncome: data.walletBalance,
        withdrawTRC_ADDRESS: "TDummyTRC20AddressPlaceholder" + i,
        withdrawBEP_ADDRESS: "0xDummyBEP20AddressPlaceholder" + i,
      };

      // Pehle user banega referrer baaki sab ke liye
      if (i > 0 && firstUser) {
        userData.referrer = firstUser._id;
        userData.sponsor = firstUser.userId;
      }

      const user = await UserModel.create(userData);
      console.log(`✅ Created: ${user.name} | ID: ${user.userId} | Email: ${user.email}`);

      if (i === 0) firstUser = user;
    }

    console.log("\n🎉 Dummy users seeding complete!");
    console.log("   Password for all users: User@123");
    await disconnect();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
