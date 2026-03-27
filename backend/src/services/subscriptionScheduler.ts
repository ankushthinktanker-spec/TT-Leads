import cron from 'node-cron';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import Subscription from '../models/subscription.model';
import SubscriptionNotificationLog from '../models/subscription-notification-log.model';
import Notification from '../models/notification.model';

const TYPE_MAP: Record<number, string> = {
    7: '7_days_before',
    1: '1_day_before',
    0: 'on_due'
};

const buildNotificationMessage = (name: string, renewDate: Date, vendorName?: string) => {
    const dateLabel = renewDate.toLocaleDateString();
    return vendorName
        ? `${name} (${vendorName}) renews on ${dateLabel}.`
        : `${name} renews on ${dateLabel}.`;
};

const runSubscriptionNotifications = async (): Promise<void> => {
    const today = new Date();

    const targets = [7, 1, 0];
    for (const days of targets) {
        const targetDate = addDays(today, days);
        const windowStart = startOfDay(targetDate);
        const windowEnd = endOfDay(targetDate);

        const subscriptions = await Subscription.find({
            status: 'Active',
            renewDate: { $gte: windowStart, $lte: windowEnd }
        }).lean();

        for (const subscription of subscriptions) {
            const notifyDays = subscription.notifyBeforeDays?.length ? subscription.notifyBeforeDays : [7, 1];
            if (!notifyDays.includes(days) && days !== 0) {
                continue;
            }

            const type = TYPE_MAP[days] || 'on_due';
            const scheduledFor = startOfDay(targetDate);

            const existingLog = await SubscriptionNotificationLog.findOne({
                subscriptionId: subscription._id,
                type,
                scheduledFor
            }).lean();

            if (existingLog) {
                continue;
            }

            await SubscriptionNotificationLog.create({
                subscriptionId: subscription._id,
                scheduledFor,
                type,
                channel: 'InApp',
                status: 'queued'
            });

            await Notification.create({
                userId: subscription.internalOwnerId,
                title: 'Subscription Renewal Reminder',
                message: buildNotificationMessage(subscription.name, subscription.renewDate, subscription.vendorName),
                type: 'SUBSCRIPTION',
                status: 'unread',
                metadata: {
                    subscriptionId: subscription._id,
                    renewDate: subscription.renewDate,
                    daysBefore: days
                }
            });

            await SubscriptionNotificationLog.updateOne(
                { subscriptionId: subscription._id, type, scheduledFor },
                { $set: { status: 'sent', sentAt: new Date() } }
            );
        }
    }
};

export const startSubscriptionScheduler = (): void => {
    cron.schedule('0 9 * * *', () => {
        runSubscriptionNotifications().catch((error) => {
            // eslint-disable-next-line no-console
            console.error('Subscription scheduler failed', error);
        });
    });
};
