import "./lib/temporal.js";
import "dotenv/config";
import { auth } from "./routes/auth.routes.js";
import { globalErrorHandler } from "./middleware/error.middleware.js";
import { orgRouter } from "./routes/org.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { interview } from "./routes/interview.routes.js";
import cookieParser from "cookie-parser";
import express from "express";

import cors from "cors";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000","https://ai-intervia.vercel.app"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1/auth", auth);

app.use("/api/v1", interview);

app.use("/api/v1", userRouter);

app.use("/api/v1", orgRouter);

app.use(globalErrorHandler);

app.listen(3001, () => {
  console.log(`Server is running on port 3001`);
});
