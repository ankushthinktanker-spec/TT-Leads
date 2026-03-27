import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'production';

interface EnvConfig {
    NODE_ENV: NodeEnv;
    PORT: number;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_EXPIRE: string;
    JWT_REFRESH_EXPIRE: string;
    BCRYPT_ROUNDS: number;
    MAX_LOGIN_ATTEMPTS: number;
    LOGIN_LOCK_MINUTES: number;
    REQUEST_TIMEOUT_MS: number;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    DATA_ENCRYPTION_KEY: string;
}

const envSchema = Joi.object<EnvConfig>({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().integer().min(1).max(65535).default(5000),
    MONGODB_URI: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRE: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRE: Joi.string().default('7d'),
    BCRYPT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),
    MAX_LOGIN_ATTEMPTS: Joi.number().integer().min(3).max(20).default(5),
    LOGIN_LOCK_MINUTES: Joi.number().integer().min(1).max(120).default(15),
    REQUEST_TIMEOUT_MS: Joi.number().integer().min(5000).max(120000).default(20000),
    RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(60000).default(900000),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().min(20).default(100),
    DATA_ENCRYPTION_KEY: Joi.string().min(32).required()
})
    .unknown(true)
    .required();

const { value, error } = envSchema.validate(process.env, {
    abortEarly: false,
    convert: true
});

if (error) {
    const details = error.details.map((entry) => entry.message).join(', ');
    throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = value as EnvConfig;
