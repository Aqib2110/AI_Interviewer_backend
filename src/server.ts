import express from 'express';
import { auth } from './routes/auth.routes';
import { authMiddlware } from './middleware/auth.middleware';
import { globalErrorHandler } from './middleware/error.middleware';
import {orgRouter} from './routes/org.routes';
import { userRouter } from './routes/user.routes';
import { interview } from './routes/interview.routes';
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth/v1",auth);

app.use("/api/v1", interview);

app.use("/api/user/v1", userRouter);

app.use("/api/organization/v1",orgRouter);

app.use(globalErrorHandler);

app.listen(3001,()=>{
    console.log(`Server is running on port 3001`);
})
