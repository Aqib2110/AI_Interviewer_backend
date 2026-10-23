import express from "express";
import { auth } from "./routes/auth.routes";
import { globalErrorHandler } from "./middleware/error.middleware";
import { orgRouter } from "./routes/org.routes";
import { userRouter } from "./routes/user.routes";
import { interview } from "./routes/interview.routes";
import cookieParser from "cookie-parser";

import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
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
