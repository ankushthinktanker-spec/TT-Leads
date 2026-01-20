// Quick script to add a test lead directly to verify database connection
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thinktanker-leads';

async function addTestLead() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB:', mongoose.connection.name);

        // Get the Lead model
        const Lead = mongoose.connection.collection('leads');

        // Count existing leads
        const count = await Lead.countDocuments();
        console.log(`📊 Current leads count: ${count}`);

        // List all leads
        const leads = await Lead.find({}).toArray();
        console.log('\n📋 Existing leads:');
        leads.forEach((lead, index) => {
            console.log(`${index + 1}. ${lead.firstName} ${lead.lastName} - ${lead.email} (${lead.leadNumber})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addTestLead();
