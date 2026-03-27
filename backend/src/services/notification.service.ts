import Notification, { INotification } from '../models/notification.model';
import mongoose, { FilterQuery } from 'mongoose';

export const listNotifications = async (
    filter: FilterQuery<INotification>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
) => {
    const items = await Notification.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const total = await Notification.countDocuments(filter);
    return { items, total };
};

export const createNotification = async (data: Partial<INotification>) => Notification.create(data);

export const markNotificationRead = async (id: string, userId: mongoose.Types.ObjectId) =>
    Notification.findOneAndUpdate(
        { _id: id, userId },
        { $set: { status: 'read', readAt: new Date() } },
        { new: true, runValidators: true }
    );
