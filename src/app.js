import cors from "cors";
import morgan from "morgan";
import express from "express";
import './helper/dailyjob.js'

import { errorResponse } from "./utils/api-response.js";
import { currentUser } from "./middlewares/current-user.js";
import { errorHandler } from "./middlewares/error-handler.js";

// USER ROUTES IMPORT
import { userAuthRouter } from "./routes/user/auth.routes.js";
import { userProfileRouter } from "./routes/user/profile.routes.js";

//PAYMENT'S deposit withdrawal
import { paymentRoutes } from "./routes/admin/payments.js";



// ADMIN ROUTES IMPORT
import { adminAuthRouter } from "./routes/admin/auth.routes.js";
import { adminUserRouter } from "./routes/admin/user.routes.js";
import { adminTicketRoutes } from "./routes/admin/ticket.routes.js";
import { userTicketRoutes } from "./routes/user/ticket.routes.js";
import { nftRoutes, } from "./routes/nftstock/nft.js";
import { nftpurchaseRouter } from "./routes/nftstock/usernft.js";
import path from 'path';
import { incomeHistory } from "./routes/admin/Incomehistory.route.js";

import { oxapayRoutes } from "./routes/user/payment.routes.js";
const app = express();

app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Set authorization token if the bearer token is provided
app.use(currentUser);

app.get("/", (req, res) => res.send("backend is running..."))

// USER ROUTES
app.use("/api/v1/user/auth", userAuthRouter);
app.use("/api/v1/user/profile", userProfileRouter);
app.use("/api/v1/user/ticket", userTicketRoutes);
app.use("/api/v1/user/nft/purchase", nftpurchaseRouter);
// app.use("uploads", express.static("uploads"));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// ADMIN ROUTES
app.use("/api/v1/admin/auth", adminAuthRouter);
app.use("/api/v1/admin/user", adminUserRouter);
app.use("/api/v1/admin/ticket", adminTicketRoutes);
app.use("/api/v1/admin/nft", nftRoutes);
app.use("/api/v1/admin/incomehistory", incomeHistory);


app.use("/api/v1/user/payment", paymentRoutes)

app.use("/api/v1/user/oxapay/payment", oxapayRoutes);





app.all("/*splat", (req, res) => {
  errorResponse(res, "Route not found", 404);
});

app.use(errorHandler);



export { app };