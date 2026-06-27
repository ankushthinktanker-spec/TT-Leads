import app from './app';
import connectDB from './config/database';
import { ensureDefaultRoles } from './utils/role.utils';
import { startSubscriptionScheduler } from './services/subscriptionScheduler';
import { canUseOfflineMode, setDatabaseReady, setRuntimeMode } from './config/runtime';
import { validateRuntimeConfig } from './config/validateRuntime';

const { runtimeMode } = validateRuntimeConfig(process.env);
setRuntimeMode(runtimeMode);

const PORT = Number(process.env.PORT || 5000);
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
    let databaseAvailable = false;
    try {
        await connectDB();
        await ensureDefaultRoles();
        setDatabaseReady(true);
        databaseAvailable = true;
    } catch (error) {
        setDatabaseReady(false);
        if (!canUseOfflineMode()) {
            throw error;
        }
        console.warn('Starting backend in development offline mode because the database is unavailable.');
        console.warn(error instanceof Error ? error.message : error);
    }

    server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        if (databaseAvailable) {
            startSubscriptionScheduler();
        } else {
            console.log('Offline mode: database-backed modules are limited until MongoDB is reachable.');
        }
    });
};

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
