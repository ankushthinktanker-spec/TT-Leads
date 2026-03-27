import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../models/company.model';
import { encryptValue, isEncryptedValue } from '../utils/dataProtection.utils';

dotenv.config();

const run = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thinktanker-leads';
    await mongoose.connect(uri);

    const collection = Company.collection;
    const cursor = collection.find({
        $or: [
            { gst: { $exists: true, $type: 'string', $ne: '' } },
            { pan: { $exists: true, $type: 'string', $ne: '' } },
            { registrationNumber: { $exists: true, $type: 'string', $ne: '' } }
        ]
    });

    let scanned = 0;
    let updated = 0;
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc?._id) continue;
        scanned += 1;

        const gst = typeof doc.gst === 'string' ? doc.gst.trim().toUpperCase() : '';
        const pan = typeof doc.pan === 'string' ? doc.pan.trim().toUpperCase() : '';
        const registrationNumber = typeof doc.registrationNumber === 'string' ? doc.registrationNumber.trim() : '';

        const nextSet: Record<string, string> = {};
        if (gst && !isEncryptedValue(doc.gstEncrypted)) {
            nextSet.gstEncrypted = encryptValue(gst) as string;
        }
        if (pan && !isEncryptedValue(doc.panEncrypted)) {
            nextSet.panEncrypted = encryptValue(pan) as string;
        }
        if (registrationNumber && !isEncryptedValue(doc.registrationNumberEncrypted)) {
            nextSet.registrationNumberEncrypted = encryptValue(registrationNumber) as string;
        }

        if (Object.keys(nextSet).length === 0) continue;

        await collection.updateOne(
            { _id: doc._id },
            {
                $set: nextSet,
                $unset: { gst: '', pan: '', registrationNumber: '' }
            }
        );
        updated += 1;
    }

    console.log(`Sensitive field migration completed. Scanned: ${scanned}, Updated: ${updated}`);
    await mongoose.connection.close();
};

run().catch((error) => {
    console.error('Sensitive field migration failed');
    console.error(error);
    process.exit(1);
});
