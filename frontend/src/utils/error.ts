import axios from 'axios';

type ErrorPayload = { message?: string; error?: { message?: string } };

export const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as ErrorPayload | undefined;
        const rawMessage = data?.error?.message || data?.message || error.message || fallback;
        const normalized = rawMessage.toLowerCase();

        if (!error.response) {
            return 'We could not connect to the workspace. Check the backend connection and try again.';
        }

        if (normalized.includes('cors not allowed')) {
            return 'The workspace blocked this request from the current origin. Verify the frontend and backend local URLs and try again.';
        }

        if (error.response.status === 401) {
            return normalized.includes('invalid credentials')
                ? 'The email or password is incorrect.'
                : 'Your session is no longer valid. Sign in again to continue.';
        }

        if (error.response.status === 403) {
            return 'You do not have access to perform this action.';
        }

        if (error.response.status === 404) {
            return 'The requested record could not be found.';
        }

        if (error.response.status === 409) {
            return 'This change conflicts with existing data. Review the record and try again.';
        }

        if (error.response.status === 422 || error.response.status === 400) {
            return rawMessage;
        }

        if (error.response.status >= 500) {
            return 'The workspace server could not complete the request. Try again in a moment.';
        }

        return rawMessage || fallback;
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    return fallback;
};
