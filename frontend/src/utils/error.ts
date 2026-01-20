import axios from 'axios';

type ErrorPayload = { message?: string };

export const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as ErrorPayload | undefined;
        return data?.message || fallback;
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    return fallback;
};
