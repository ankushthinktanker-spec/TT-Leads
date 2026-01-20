import jwt, { JwtPayload } from 'jsonwebtoken';

export const generateToken = (id: string): string => {
    return jwt.sign({ id }, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRE || '30m'
    } as jwt.SignOptions);
};

export const generateRefreshToken = (id: string): string => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): JwtPayload | string => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
};
