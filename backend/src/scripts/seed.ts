import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model';
import Company from '../models/company.model';
import Contact from '../models/contact.model';
import Lead from '../models/lead.model';
import Proposal from '../models/proposal.model';
import Task from '../models/task.model';
import Activity from '../models/activity.model';
import Settings from '../models/settings.model';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thinktanker-leads';

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        console.log('Clearing existing data...');
        try {
            await User.collection.drop().catch(() => console.log('Users collection does not exist yet'));
            await Company.collection.drop().catch(() => console.log('Companies collection does not exist yet'));
            await Contact.collection.drop().catch(() => console.log('Contacts collection does not exist yet'));
            await Lead.collection.drop().catch(() => console.log('Leads collection does not exist yet'));
            await Proposal.collection.drop().catch(() => console.log('Proposals collection does not exist yet'));
            await Task.collection.drop().catch(() => console.log('Tasks collection does not exist yet'));
            await Activity.collection.drop().catch(() => console.log('Activities collection does not exist yet'));
            await Settings.collection.drop().catch(() => console.log('Settings collection does not exist yet'));
        } catch (error) {
            console.log('Some collections may not exist, continuing...');
        }

        // 1. Create Users
        console.log('Seeding Users...');
        const users = await User.create([
            {
                firstName: 'Sarah',
                lastName: 'Manager',
                email: 'manager@example.com',
                password: 'Password@123',
                role: 'Manager',
                phone: '9876543210'
            },
            {
                firstName: 'Mike',
                lastName: 'Sales',
                email: 'sales@example.com',
                password: 'Password@123',
                role: 'BDM',
                phone: '9876543211'
            },
            {
                firstName: 'Emma',
                lastName: 'Rep',
                email: 'emma@example.com',
                password: 'Password@123',
                role: 'BDM',
                phone: '9876543212'
            }
        ]);

        // Get Admin User (assuming one exists, or create if not)
        let adminUser = await User.findOne({ role: 'Admin' });
        if (!adminUser) {
            adminUser = await User.create({
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Admin@12345',
                role: 'Admin'
            });
        }
        // const allUsers = [adminUser, ...users];

        // 2. Create Settings
        console.log('Seeding Settings...');
        await Settings.create({
            type: 'Company',
            data: {
                name: 'ThinkTanker Solutions',
                email: 'contact@thinktanker.io',
                phone: '+91 98765 43210',
                website: 'https://thinktanker.io',
                address: {
                    street: '123 Tech Park, Sector 5',
                    city: 'Pune',
                    state: 'Maharashtra',
                    country: 'India',
                    pinCode: '411045'
                },
                currency: 'INR',
                taxRate: 18
            },
            updatedBy: adminUser._id
        });

        // 3. Create Companies
        console.log('Seeding Companies...');
        const companies = await Company.create([
            {
                name: 'TechCorp Industries',
                website: 'https://techcorp.com',
                industry: 'Technology',
                companySize: '51-200',
                email: 'info@techcorp.com',
                phone: '022-12345678',
                address: { city: 'Mumbai', country: 'India' },
                status: 'Active',
                createdBy: adminUser._id
            },
            {
                name: 'Global Retailers',
                website: 'https://globalretail.com',
                industry: 'Retail',
                companySize: '500+',
                email: 'contact@globalretail.com',
                phone: '011-87654321',
                address: { city: 'Delhi', country: 'India' },
                status: 'Active',
                createdBy: users[0]._id
            },
            {
                name: 'Innovate Startups',
                website: 'https://innovate.io',
                industry: 'Consulting',
                companySize: '1-10',
                email: 'hello@innovate.io',
                phone: '080-11223344',
                address: { city: 'Bangalore', country: 'India' },
                status: 'Active',
                createdBy: users[1]._id
            }
        ]);

        // 4. Create Contacts
        console.log('Seeding Contacts...');
        const contacts = await Contact.create([
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@techcorp.com',
                phone: '9988776655',
                designation: 'CTO',
                companyId: companies[0]._id,
                isPrimary: true,
                status: 'Active',
                createdBy: adminUser._id
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@globalretail.com',
                phone: '9988776644',
                designation: 'Procurement Manager',
                companyId: companies[1]._id,
                isPrimary: true,
                status: 'Active',
                createdBy: users[0]._id
            },
            {
                firstName: 'Alice',
                lastName: 'Brown',
                email: 'alice@innovate.io',
                phone: '9988776633',
                designation: 'CEO',
                companyId: companies[2]._id,
                isPrimary: true,
                status: 'Active',
                createdBy: users[1]._id
            }
        ]);

        // 5. Create Leads
        console.log('Seeding Leads...');
        const timestamp = Date.now();
        const leads = await Lead.create([
            {
                leadNumber: `SEED-${timestamp}-001`,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@techcorp.com',
                phone: '9988776655',
                company: 'TechCorp Industries',
                companyId: companies[0]._id,
                contactId: contacts[0]._id,
                designation: 'CTO',
                source: 'Referral',
                status: 'Negotiation',
                lifecycleStage: 'Opportunity',
                priority: 'Hot',
                location: { country: 'India', city: 'Mumbai' },
                serviceInterest: ['Cloud Services', 'Consulting'],
                dealValue: 5000000,
                expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                assignedTo: adminUser._id,
                tags: ['High Value', 'Urgent'],
                followUpCount: 0,
                createdBy: adminUser._id
            },
            {
                leadNumber: `SEED-${timestamp}-002`,
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@globalretail.com',
                phone: '9988776644',
                company: 'Global Retailers',
                companyId: companies[1]._id,
                contactId: contacts[1]._id,
                designation: 'Procurement Manager',
                source: 'Website',
                status: 'Qualified',
                lifecycleStage: 'Qualified',
                priority: 'Warm',
                location: { country: 'India', city: 'Delhi' },
                serviceInterest: ['Web Development'],
                dealValue: 2500000,
                expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                assignedTo: users[0]._id,
                tags: ['Retail', 'Q3'],
                followUpCount: 0,
                createdBy: users[0]._id
            },
            {
                leadNumber: `SEED-${timestamp}-003`,
                firstName: 'Alice',
                lastName: 'Brown',
                email: 'alice@innovate.io',
                phone: '9988776633',
                company: 'Innovate Startups',
                companyId: companies[2]._id,
                contactId: contacts[2]._id,
                designation: 'CEO',
                source: 'LinkedIn',
                status: 'New',
                lifecycleStage: 'New',
                priority: 'Cold',
                location: { country: 'India', city: 'Bangalore' },
                serviceInterest: ['Mobile App'],
                dealValue: 800000,
                expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                assignedTo: users[1]._id,
                tags: ['Mobile', 'Startup'],
                followUpCount: 0,
                createdBy: users[1]._id
            }
        ]);

        console.log('Database seeded successfully!');
        console.log(`   - ${users.length + 1} Users created`);
        console.log(`   - ${companies.length} Companies created`);
        console.log(`   - ${contacts.length} Contacts created`);
        console.log(`   - ${leads.length} Leads created`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
