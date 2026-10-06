import jwt from 'jsonwebtoken'

export const generateRefreshToken = (payload: any) => {
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
};

export const generateAccessToken = (payload: any) => {
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '15m' });
};