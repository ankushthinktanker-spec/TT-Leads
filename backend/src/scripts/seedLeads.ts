import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lead from '../models/lead.model';
import User from '../models/user.model';
import Company from '../models/company.model';
import Contact from '../models/contact.model';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thinktanker-leads';

const FIRST_NAMES = ['Aarav', 'Ishita', 'Rohan', 'Meera', 'Karan', 'Priya', 'Arjun', 'Neha', 'Vikram', 'Anaya'];
const LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Mehta', 'Nair', 'Singh', 'Kapoor', 'Iyer', 'Reddy'];
const SOURCES = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email Campaign', 'Trade Show', 'Partner', 'JustDial', 'Other'];
const STATUSES = ['New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture'];
const PRIORITIES = ['Hot', 'Warm', 'Cold'];
const SERVICES = ['Web Development', 'Mobile App', 'Cloud Services', 'AI/ML', 'DevOps', 'Consulting', 'Other'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai', 'Hyderabad', 'Kolkata', 'Jaipur'];

const statusToStage = (status: string) => {
    switch (status) {
        case 'Contacted':
            return 'Contacted';
        case 'Qualified':
            return 'Qualified';
        case 'Won':
        case 'Lost':
            return 'Customer';
        case 'Needs Analysis':
        case 'Proposal Sent':
        case 'Negotiation':
            return 'Opportunity';
        case 'Nurture':
            return 'Contacted';
        default:
            return 'New';
    }
};

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const seedLeads = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for lead seeding...');

        const users = await User.find().lean();
        if (users.length === 0) {
            console.error('No users found. Create a user before seeding leads.');
            process.exit(1);
        }

        const companies = await Company.find().lean();
        const contacts = await Contact.find().lean();

        const count = Number(process.env.SEED_LEADS_COUNT || 20);
        const timestamp = Date.now();

        const leads = Array.from({ length: count }).map((_, index) => {
            const firstName = pick(FIRST_NAMES);
            const lastName = pick(LAST_NAMES);
            const status = pick(STATUSES);
            const company = companies.length ? pick(companies) : null;
            const contact = contacts.length ? pick(contacts) : null;
            const assignedUser = pick(users);

            return {
                leadNumber: `LD-SEED-${timestamp}-${String(index + 1).padStart(3, '0')}`,
                firstName,
                lastName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@example.com`,
                phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
                company: company?.name || `${lastName} Ventures`,
                companyId: company?._id,
                contactId: contact?._id,
                designation: pick(['CEO', 'CTO', 'Founder', 'Manager', 'Director']),
                source: pick(SOURCES),
                status,
                lifecycleStage: statusToStage(status),
                priority: pick(PRIORITIES),
                location: {
                    city: pick(CITIES),
                    country: 'India'
                },
                serviceInterest: [pick(SERVICES)],
                dealValue: Math.floor(50000 + Math.random() * 950000),
                expectedCloseDate: new Date(Date.now() + (10 + Math.floor(Math.random() * 90)) * 86400000),
                assignedTo: assignedUser._id,
                createdBy: assignedUser._id,
                tags: ['Seeded']
            };
        });

        await Lead.create(leads);
        console.log(`Seeded ${count} leads successfully.`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding leads:', error);
        process.exit(1);
    }
};

seedLeads();
