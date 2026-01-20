import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lead from '../models/lead.model';
import Activity from '../models/activity.model';
import LeadStageHistory from '../models/lead-stage-history.model';

dotenv.config();

const run = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not set');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const leads = await Lead.find({});
    for (const lead of leads) {
        const existingHistory = await LeadStageHistory.findOne({ leadId: lead._id });
        if (!existingHistory) {
            await LeadStageHistory.create({
                leadId: lead._id,
                fromStatus: null,
                toStatus: lead.status,
                changedBy: lead.createdBy,
                changedAt: lead.updatedAt || lead.createdAt
            });
        }

        if (!lead.firstResponseAt || !lead.lastActivityAt) {
            const activities = await Activity.find({
                'relatedTo.model': 'Lead',
                'relatedTo.id': lead._id
            }).sort({ activityDate: 1 });
            if (activities.length > 0) {
                lead.firstResponseAt = lead.firstResponseAt || activities[0].activityDate;
                lead.lastActivityAt = lead.lastActivityAt || activities[activities.length - 1].activityDate;
                await lead.save();
            }
        }
    }

    await mongoose.disconnect();
    console.log('Backfill complete');
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
