import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

type TokenKind = 'access' | 'refresh';

export interface TokenPayload extends JwtPayload {
    id: string;
    jti: string;
    typ: TokenKind;
}

const signToken = (id: string, secret: string, expiresIn: string, typ: TokenKind): string => {
    return jwt.sign(
        { id, typ },
        secret,
        {
            expiresIn,
            jwtid: crypto.randomUUID(),
            subject: id
        } as jwt.SignOptions
    );
};

export const generateToken = (id: string): string => {
    return signToken(id, env.JWT_SECRET, env.JWT_EXPIRE, 'access');
};

export const generateRefreshToken = (id: string): string => {
    return signToken(id, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRE, 'refresh');
};

const verifyTypedToken = (token: string, secret: string, expectedType: TokenKind): TokenPayload => {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (!decoded?.id || !decoded?.jti || decoded?.typ !== expectedType) {
        throw new Error('Invalid token payload');
    }
    return decoded;
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return verifyTypedToken(token, env.JWT_SECRET, 'access');
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return verifyTypedToken(token, env.JWT_REFRESH_SECRET, 'refresh');
};
