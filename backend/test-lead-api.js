const axios = require('axios');

async function loginAndCreateLead() {
    try {
        // Step 1: Login to get token
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@example.com',
            password: 'Admin@123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful!');

        // Step 2: Fetch existing leads
        console.log('\n📋 Fetching existing leads...');
        const leadsResponse = await axios.get('http://localhost:5000/api/leads', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`Found ${leadsResponse.data.data?.leads?.length || 0} leads`);
        if (leadsResponse.data.data?.leads) {
            leadsResponse.data.data.leads.forEach((lead, index) => {
                console.log(`${index + 1}. ${lead.firstName} ${lead.lastName} - ${lead.company}`);
            });
        }

        // Step 3: Create a test lead
        console.log('\n➕ Creating test lead...');
        const newLead = {
            firstName: 'Test',
            lastName: 'Lead',
            email: 'testlead@example.com',
            phone: '9999999999',
            company: 'Test Company',
            source: 'Website',
            status: 'New',
            lifecycleStage: 'New',
            priority: 'Warm',
            location: { country: 'India', city: 'Mumbai' },
            serviceInterest: ['Web Development'],
            followUpCount: 0
        };

        const createResponse = await axios.post('http://localhost:5000/api/leads', newLead, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Test lead created successfully!');
        console.log('Lead Number:', createResponse.data.data.leadNumber);

        // Step 4: Fetch leads again to confirm
        console.log('\n📋 Fetching leads again...');
        const leadsResponse2 = await axios.get('http://localhost:5000/api/leads', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`Now showing ${leadsResponse2.data.data?.leads?.length || 0} leads`);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

loginAndCreateLead();
