const bcrypt = require('bcryptjs');
const { connectDB, getDb, closeDB } = require('./backend/config/database');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding process with Jira Service Management dataset...');
    await connectDB();
    const db = getDb();

    // Clear existing collections
    await db.collection('users').deleteMany({});
    await db.collection('categories').deleteMany({});
    await db.collection('tickets').deleteMany({});
    await db.collection('comments').deleteMany({});

    console.log('🧹 Cleared existing collections.');

    // 1. Seed Categories
    const categories = [
      { name: 'Billing & Payments', description: 'Billing page errors, payment processing, invoice issues', createdAt: new Date() },
      { name: 'Account & Intranet Access', description: 'VPN, Single Sign-On, Intranet portal authentication', createdAt: new Date() },
      { name: 'Hardware & Workstation', description: 'Laptops, monitors, mice, keyboard, hardware failure', createdAt: new Date() },
      { name: 'Software & Email', description: 'Outlook, email loading, software licensing, browser bugs', createdAt: new Date() },
      { name: 'Network & Cloud Storage', description: 'Latency spikes, cloud storage, DNS, regional connectivity', createdAt: new Date() },
      { name: 'General Inquiries', description: 'General support and unclassified requests', createdAt: new Date() }
    ];
    await db.collection('categories').insertMany(categories);
    console.log('✅ Categories seeded.');

    // 2. Seed Users
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    const agentPasswordHash = await bcrypt.hash('agent123', salt);
    const customerPasswordHash = await bcrypt.hash('customer123', salt);

    const users = [
      {
        name: 'System Admin',
        email: 'admin@helpdesk.com',
        password: adminPasswordHash,
        role: 'Admin',
        department: 'IT Infrastructure & Governance',
        createdAt: new Date()
      },
      {
        name: 'Sarah Connor',
        email: 'agent@helpdesk.com',
        password: agentPasswordHash,
        role: 'Support Agent',
        department: 'Tier-2 Cloud Support',
        createdAt: new Date()
      },
      {
        name: 'Alex Mercer',
        email: 'agent2@helpdesk.com',
        password: agentPasswordHash,
        role: 'Support Agent',
        department: 'Network & Infrastructure',
        createdAt: new Date()
      },
      {
        name: 'Annika Rang',
        email: 'customer@helpdesk.com',
        password: customerPasswordHash,
        role: 'Customer',
        department: 'Finance & Billing',
        createdAt: new Date()
      },
      {
        name: 'Abdullah Ibrahim',
        email: 'abdullah@company.com',
        password: customerPasswordHash,
        role: 'Customer',
        department: 'Engineering',
        createdAt: new Date()
      },
      {
        name: 'Grace Harris',
        email: 'grace@company.com',
        password: customerPasswordHash,
        role: 'Customer',
        department: 'Operations',
        createdAt: new Date()
      },
      {
        name: 'Zlatica Chalupka',
        email: 'zlatica@company.com',
        password: customerPasswordHash,
        role: 'Customer',
        department: 'Product Design',
        createdAt: new Date()
      },
      {
        name: 'Andres Ramos',
        email: 'andres@company.com',
        password: customerPasswordHash,
        role: 'Customer',
        department: 'Marketing',
        createdAt: new Date()
      }
    ];

    const userResult = await db.collection('users').insertMany(users);
    console.log('✅ Users seeded.');

    const userMap = {};
    Object.keys(userResult.insertedIds).forEach((idx) => {
      userMap[users[idx].email] = {
        _id: userResult.insertedIds[idx],
        name: users[idx].name,
        email: users[idx].email,
        department: users[idx].department
      };
    });

    // 3. Seed Realistic Jira Service Management Incidents
    const now = Date.now();
    const sampleTickets = [
      {
        ticketId: 'RD-121',
        title: "404 error on website's billing page",
        description: 'Users reporting HTTP 404 file not found when attempting to navigate to customer billing settings tab.',
        category: 'Billing & Payments',
        priority: 'High',
        status: 'IN_PROGRESS',
        createdBy: userMap['customer@helpdesk.com'],
        assignedTo: userMap['agent@helpdesk.com'],
        createdAt: new Date(now - 48 * 60000),
        updatedAt: new Date(now - 10 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-113',
        title: "I can't access the intranet from my computer",
        description: 'VPN connection succeeds but intranet.internal domain name fails to resolve on local workstation.',
        category: 'Account & Intranet Access',
        priority: 'Medium',
        status: 'ON_HOLD',
        createdBy: userMap['abdullah@company.com'],
        assignedTo: userMap['agent2@helpdesk.com'],
        createdAt: new Date(now - 57 * 60000),
        updatedAt: new Date(now - 15 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-111',
        title: "Computer isn't restarting",
        description: 'Power button unresponsive on workstation PC after firmware security update reboot prompt.',
        category: 'Hardware & Workstation',
        priority: 'High',
        status: 'WAITING_FOR_CUSTOMER',
        createdBy: userMap['grace@company.com'],
        assignedTo: userMap['agent@helpdesk.com'],
        createdAt: new Date(now - 57 * 60000),
        updatedAt: new Date(now - 20 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-123',
        title: "I can't see any billing information",
        description: 'Account overview panel renders blank values for current month usage and transaction history.',
        category: 'Billing & Payments',
        priority: 'High',
        status: 'IN_PROGRESS',
        createdBy: userMap['zlatica@company.com'],
        assignedTo: userMap['agent@helpdesk.com'],
        createdAt: new Date(now - 59 * 60000),
        updatedAt: new Date(now - 5 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-124',
        title: 'The billing site is really slow',
        description: 'Page load latency exceeding 8000ms when querying subscription invoices in Europe region.',
        category: 'Billing & Payments',
        priority: 'High',
        status: 'IN_PROGRESS',
        createdBy: userMap['andres@company.com'],
        assignedTo: userMap['agent2@helpdesk.com'],
        createdAt: new Date(now - 61 * 60000),
        updatedAt: new Date(now - 12 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-127',
        title: 'I can’t access the website in Europe',
        description: 'Cloudflare CDN routing error returning 502 Bad Gateway for EU customer IPs.',
        category: 'Network & Cloud Storage',
        priority: 'Critical',
        status: 'IN_PROGRESS',
        createdBy: userMap['customer@helpdesk.com'],
        assignedTo: userMap['agent2@helpdesk.com'],
        createdAt: new Date(now - 61 * 60000),
        updatedAt: new Date(now - 3 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-130',
        title: 'My mouse has exploded',
        description: 'Workstation wireless optical mouse hardware failure causing power short circuit.',
        category: 'Hardware & Workstation',
        priority: 'Medium',
        status: 'WAITING_FOR_SUPPORT',
        createdBy: userMap['grace@company.com'],
        assignedTo: userMap['agent@helpdesk.com'],
        createdAt: new Date(now - 365 * 60000),
        updatedAt: new Date(now - 100 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-131',
        title: 'Mouse is on fire',
        description: 'Battery thermal runaway incident on periferal device requiring emergency replacement.',
        category: 'Hardware & Workstation',
        priority: 'Critical',
        status: 'WAITING_FOR_APPROVAL',
        createdBy: userMap['abdullah@company.com'],
        assignedTo: userMap['agent2@helpdesk.com'],
        createdAt: new Date(now - 600 * 60000),
        updatedAt: new Date(now - 200 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-133',
        title: 'Blue screen of death!',
        description: 'Windows BSOD crash dump CRITICAL_PROCESS_DIED on boot.',
        category: 'Hardware & Workstation',
        priority: 'High',
        status: 'WAITING_FOR_SUPPORT',
        createdBy: userMap['zlatica@company.com'],
        assignedTo: userMap['agent@helpdesk.com'],
        createdAt: new Date(now - 612 * 60000),
        updatedAt: new Date(now - 300 * 60000),
        resolvedAt: null
      },
      {
        ticketId: 'RD-136',
        title: "Outlook isn't loading new emails",
        description: 'IMAP connection timeout when syncing inbox over corporate WiFi.',
        category: 'Software & Email',
        priority: 'Medium',
        status: 'WAITING_FOR_CUSTOMER',
        createdBy: userMap['andres@company.com'],
        assignedTo: userMap['agent2@helpdesk.com'],
        createdAt: new Date(now - 700 * 60000),
        updatedAt: new Date(now - 400 * 60000),
        resolvedAt: null
      }
    ];

    await db.collection('tickets').insertMany(sampleTickets);
    console.log('✅ Tickets seeded.');

    // 4. Seed Comments
    const comments = [
      {
        ticketId: 'RD-121',
        userId: userMap['customer@helpdesk.com']._id,
        userName: userMap['customer@helpdesk.com'].name,
        userRole: 'Customer',
        message: 'Hi support team, this issue is blocking our monthly billing reconciliation.',
        isSystem: false,
        createdAt: new Date(now - 40 * 60000)
      },
      {
        ticketId: 'RD-121',
        userId: userMap['agent@helpdesk.com']._id,
        userName: userMap['agent@helpdesk.com'].name,
        userRole: 'Support Agent',
        message: 'Investigating nginx routing rules for the billing service path.',
        isSystem: false,
        createdAt: new Date(now - 10 * 60000)
      }
    ];

    await db.collection('comments').insertMany(comments);
    console.log('✅ Comments seeded.');

    console.log('\n=======================================================');
    console.log('🎉 SEEDING COMPLETE SUCCESS! Demo credentials:');
    console.log('👉 Admin:         admin@helpdesk.com    / admin123');
    console.log('👉 Support Agent: agent@helpdesk.com    / agent123');
    console.log('👉 Customer:      customer@helpdesk.com / customer123');
    console.log('=======================================================\n');

    if (typeof closeDB === 'function') {
      await closeDB();
    }
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
