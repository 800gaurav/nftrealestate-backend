import { connect, disconnect } from "mongoose";
import { config } from "dotenv";
import { UserModel } from "./src/models/user.model.js";

config();

const formatUser = (user) => `${user.userId || "NO_USER_ID"} (${user._id})`;

(async () => {
  await connect(process.env.MONGO_URI);
  console.log("DB connected");

  const queryUserId = process.argv[2];
  const allUsers = await UserModel.find({}).select(
    "_id userId name leftChild rightChild placementParent placementSide binaryLevel referrer sponsor"
  );
  const userById = new Map(allUsers.map((user) => [user._id.toString(), user]));
  const users = queryUserId ? allUsers.filter((user) => user.userId === queryUserId) : allUsers;

  if (!users.length) {
    console.log(queryUserId ? `No user found for userId ${queryUserId}` : "No users found");
    await disconnect();
    process.exit(0);
  }

  const issues = [];
  const childClaims = new Map();

  for (const user of users) {
    for (const side of ["left", "right"]) {
      const field = `${side}Child`;
      const childId = user[field];
      if (!childId) continue;

      const childIdString = childId.toString();
      if (childIdString === user._id.toString()) {
        issues.push(`${formatUser(user)} has ${field} pointing to itself`);
        continue;
      }

      const child = userById.get(childIdString);
      if (!child) {
        issues.push(`${formatUser(user)} has ${field} pointing to missing user ${childIdString}`);
        continue;
      }

      const claims = childClaims.get(childIdString) || [];
      claims.push(`${formatUser(user)}.${field}`);
      childClaims.set(childIdString, claims);

      if (String(child.placementParent || "") !== String(user._id)) {
        issues.push(
          `${formatUser(user)} has ${field} = ${formatUser(child)}, but child placementParent is ${child.placementParent || "empty"}`
        );
      }

      if (child.placementSide && child.placementSide !== side) {
        issues.push(
          `${formatUser(child)} placementSide is ${child.placementSide}, but parent points to it as ${side}`
        );
      }
    }
  }

  for (const [childId, claims] of childClaims.entries()) {
    if (claims.length > 1) {
      const child = userById.get(childId);
      issues.push(`${formatUser(child)} is claimed by multiple parent slots: ${claims.join(", ")}`);
    }
  }

  for (const user of users) {
    if (!user.placementParent) continue;

    const parent = userById.get(user.placementParent.toString());
    if (!parent) {
      issues.push(`${formatUser(user)} has missing placementParent ${user.placementParent}`);
      continue;
    }

    const expectedField = user.placementSide === "right" ? "rightChild" : "leftChild";
    if (String(parent[expectedField] || "") !== String(user._id)) {
      issues.push(
        `${formatUser(user)} says parent is ${formatUser(parent)} ${expectedField}, but parent does not point back`
      );
    }
  }

  console.log(`Checked ${users.length} user(s)`);
  console.log(`Total users in database: ${allUsers.length}`);

  if (!issues.length) {
    console.log("No binary tree consistency issues found in checked user(s)");
  } else {
    console.log("Binary tree consistency issues:");
    for (const issue of issues) console.log(`- ${issue}`);
  }

  await disconnect();
})();
