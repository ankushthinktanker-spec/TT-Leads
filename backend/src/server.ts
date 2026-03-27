import app from './app';
import connectDB from './config/database';
import { ensureDefaultRoles } from './utils/role.utils';
import { startSubscriptionScheduler } from './services/subscriptionScheduler';
import { env } from './config/env';

const PORT = env.PORT;
let server: ReturnType<typeof app.listen> | null = null;

const isIgnorableStreamError = (err: NodeJS.ErrnoException): boolean =>
    err.code === 'EPIPE' || err.code === 'ECONNRESET';

process.stdin.on('error', (err: NodeJS.ErrnoException) => {
    if (isIgnorableStreamError(err)) {
        console.warn(`Ignoring stdin stream error: ${err.code}`);
        return;
    }

    console.error('stdin stream error:', err.message);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
    console.error('Unhandled Promise Rejection:', err.message);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
        return;
    }
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    if (isIgnorableStreamError(err as NodeJS.ErrnoException)) {
        console.warn(`Ignoring uncaught stream error: ${(err as NodeJS.ErrnoException).code}`);
        return;
    }
    console.error('Uncaught Exception:', err.message);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (!server) {
        process.exit(0);
    }
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

const startServer = async () => {
    await connectDB();
    await ensureDefaultRoles();

    server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        startSubscriptionScheduler();
    });
};

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
