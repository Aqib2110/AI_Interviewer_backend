import { Request,Response,NextFunction } from "express";
import { generateAccessToken, generateRefreshToken } from "../lib/tokens";
import db from "../lib/prisma";



const login = async (req: Request, res: Response, next: NextFunction) => {
try {
    const { email, password } = req.body;
if( !email || !password) {
    return res.status(400).json({
        message: "email and password are required"
    })}

    const user = await db.orm.public.User.where({ email: email }).first();

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    if(user.password !== password)
    {
        return res.status(401).json({
            message: "Incorrect email or password"
        });
    }

// const existingSession = await db.orm.public.Session.where({ userId: user.id }).all();
// if(existingSession.length >= 2)
// {
//     await db.orm.public.Session.where({ userId: user.id }).delete();
// }


const refreshToken = generateRefreshToken({ id: user.id, name: user.name, email: user.email });

    const session = await db.orm.public.Session.create({
        userId: user.id,
        refreshToken: refreshToken
    })

    const accessToken = generateAccessToken({ id: user.id, session: session.id, name: user.name, email: user.email });



    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000
    });

return res.status(201).json({
    token: accessToken,
    message: "User logged in successfully"
})
} catch (error) {
    next(error);
}

}


export const authHandler = {  login };