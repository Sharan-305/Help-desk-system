const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/helpdesk_db';

let dbInstance = null;
let isInMemoryFallback = false;

// In-Memory Storage collections for local demonstration fallback
const memoryStore = {
  users: [],
  tickets: [],
  comments: [],
  categories: []
};

// In-Memory Collection Wrapper mimicking Native MongoDB Driver API
class InMemoryCollection {
  constructor(name) {
    this.name = name;
  }

  get items() {
    return memoryStore[this.name] || [];
  }

  set items(val) {
    memoryStore[this.name] = val;
  }

  async createIndex() {
    return true;
  }

  async findOne(query = {}, options = {}) {
    const list = await this.find(query).toArray();
    return list[0] || null;
  }

  find(query = {}) {
    let results = this.items.filter(item => matchQuery(item, query));
    
    return {
      sort: (sortObj) => {
        const field = Object.keys(sortObj)[0];
        const dir = sortObj[field];
        results.sort((a, b) => {
          const valA = getNestedValue(a, field);
          const valB = getNestedValue(b, field);
          if (valA < valB) return dir === 1 ? -1 : 1;
          if (valA > valB) return dir === 1 ? 1 : -1;
          return 0;
        });
        return {
          toArray: async () => results,
          limit: (n) => ({ toArray: async () => results.slice(0, n) })
        };
      },
      toArray: async () => results
    };
  }

  async insertOne(doc) {
    const _id = doc._id || new ObjectId();
    const newDoc = { _id, ...doc };
    this.items.push(newDoc);
    return { insertedId: _id, acknowledged: true };
  }

  async insertMany(docs) {
    const insertedIds = {};
    docs.forEach((doc, idx) => {
      const _id = doc._id || new ObjectId();
      const newDoc = { _id, ...doc };
      this.items.push(newDoc);
      insertedIds[idx] = _id;
    });
    return { insertedIds, acknowledged: true };
  }

  async updateOne(filter, update) {
    const item = await this.findOne(filter);
    if (!item) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) {
      Object.assign(item, update.$set);
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(filter) {
    const index = this.items.findIndex(item => matchQuery(item, filter));
    if (index !== -1) {
      this.items.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter = {}) {
    if (Object.keys(filter).length === 0) {
      const count = this.items.length;
      this.items = [];
      return { deletedCount: count };
    }
    const initialLen = this.items.length;
    this.items = this.items.filter(item => !matchQuery(item, filter));
    return { deletedCount: initialLen - this.items.length };
  }

  async countDocuments(query = {}) {
    const list = await this.find(query).toArray();
    return list.length;
  }

  async aggregate(pipeline = []) {
    // Simple group aggregation support
    const groupStage = pipeline.find(p => p.$group);
    if (groupStage) {
      const field = groupStage.$group._id.replace('$', '');
      const groups = {};
      this.items.forEach(item => {
        const val = getNestedValue(item, field) || 'Unspecified';
        groups[val] = (groups[val] || 0) + 1;
      });
      const results = Object.keys(groups).map(k => ({ _id: k, count: groups[k] }));
      return { toArray: async () => results };
    }
    return { toArray: async () => this.items };
  }
}

// Query matcher helper
function matchQuery(item, query) {
  for (let key in query) {
    if (key === '$or') {
      const match = query.$or.some(subQuery => matchQuery(item, subQuery));
      if (!match) return false;
      continue;
    }
    const targetVal = getNestedValue(item, key);
    const expected = query[key];

    if (expected && typeof expected === 'object') {
      if (expected.$regex) {
        const regex = new RegExp(expected.$regex, expected.$options || '');
        if (!regex.test(targetVal || '')) return false;
      } else if (expected.$in) {
        if (!expected.$in.includes(targetVal)) return false;
      } else if (expected instanceof ObjectId) {
        if (!targetVal || targetVal.toString() !== expected.toString()) return false;
      }
    } else {
      if (targetVal instanceof ObjectId || expected instanceof ObjectId) {
        if ((targetVal?.toString()) !== (expected?.toString())) return false;
      } else if (targetVal !== expected) {
        return false;
      }
    }
  }
  return true;
}

function getNestedValue(obj, path) {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

const connectDB = async () => {
  if (dbInstance) return dbInstance;
  
  // Try connecting via native MongoDB Driver
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    dbInstance = client.db();
    console.log(`[MongoDB Atlas/Driver] Successfully connected to database: ${dbInstance.databaseName}`);
    
    // Create indexes
    await dbInstance.collection('users').createIndex({ email: 1 }, { unique: true });
    await dbInstance.collection('tickets').createIndex({ ticketId: 1 }, { unique: true });
    return dbInstance;
  } catch (error) {
    console.warn(`[MongoDB Driver Notice] Could not connect to external MongoDB URI (${uri}).`);
    console.warn(`[MongoDB Driver Notice] Falling back to In-Memory MongoDB Store for instant local execution.`);
    isInMemoryFallback = true;
    
    dbInstance = {
      databaseName: 'helpdesk_db_inmemory',
      collection: (name) => new InMemoryCollection(name)
    };

    // Auto seed default Jira dataset for in-memory mode
    try {
      await seedInMemoryData(dbInstance);
    } catch (e) {
      console.error('Failed auto seeding memory store:', e);
    }

    return dbInstance;
  }
};

const getDb = () => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return dbInstance;
};

const seedInMemoryData = async (db) => {
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const agentPasswordHash = await bcrypt.hash('agent123', salt);
  const customerPasswordHash = await bcrypt.hash('customer123', salt);

  const users = [
    {
      _id: new ObjectId("650000000000000000000001"),
      name: 'System Admin',
      email: 'admin@helpdesk.com',
      password: adminPasswordHash,
      role: 'Admin',
      department: 'IT Infrastructure & Governance',
      createdAt: new Date()
    },
    {
      _id: new ObjectId("650000000000000000000002"),
      name: 'Sarah Connor',
      email: 'agent@helpdesk.com',
      password: agentPasswordHash,
      role: 'Support Agent',
      department: 'Tier-2 Support',
      createdAt: new Date()
    },
    {
      _id: new ObjectId("650000000000000000000003"),
      name: 'Alex Mercer',
      email: 'agent2@helpdesk.com',
      password: agentPasswordHash,
      role: 'Support Agent',
      department: 'Infrastructure',
      createdAt: new Date()
    },
    {
      _id: new ObjectId("650000000000000000000004"),
      name: 'Annika Rang',
      email: 'customer@helpdesk.com',
      password: customerPasswordHash,
      role: 'Customer',
      department: 'Billing & Finance',
      createdAt: new Date()
    },
    {
      _id: new ObjectId("650000000000000000000005"),
      name: 'Abdullah Ibrahim',
      email: 'abdullah@company.com',
      password: customerPasswordHash,
      role: 'Customer',
      department: 'Engineering',
      createdAt: new Date()
    }
  ];

  await db.collection('users').insertMany(users);

  const now = Date.now();
  const tickets = [
    {
      _id: new ObjectId("650000000000000000000011"),
      ticketId: 'RD-121',
      title: "404 error on website's billing page",
      description: "Users reporting 404 error when accessing customer billing.",
      category: "Billing & Payments",
      priority: "High",
      status: "IN_PROGRESS",
      createdBy: { _id: users[3]._id, name: users[3].name, email: users[3].email },
      assignedTo: { _id: users[1]._id, name: users[1].name, email: users[1].email },
      createdAt: new Date(now - 48 * 60000),
      updatedAt: new Date(now - 10 * 60000)
    },
    {
      _id: new ObjectId("650000000000000000000012"),
      ticketId: 'RD-113',
      title: "I can't access the intranet from my computer",
      description: "VPN succeeds but intranet fails.",
      category: "Account & Intranet Access",
      priority: "Medium",
      status: "ON_HOLD",
      createdBy: { _id: users[4]._id, name: users[4].name, email: users[4].email },
      assignedTo: { _id: users[2]._id, name: users[2].name, email: users[2].email },
      createdAt: new Date(now - 57 * 60000),
      updatedAt: new Date(now - 15 * 60000)
    },
    {
      _id: new ObjectId("650000000000000000000013"),
      ticketId: 'RD-111',
      title: "Computer isn't restarting",
      description: "Power button unresponsive on workstation PC.",
      category: "Hardware & Workstation",
      priority: "High",
      status: "WAITING_FOR_CUSTOMER",
      createdBy: { _id: users[3]._id, name: users[3].name, email: users[3].email },
      assignedTo: { _id: users[1]._id, name: users[1].name, email: users[1].email },
      createdAt: new Date(now - 57 * 60000),
      updatedAt: new Date(now - 20 * 60000)
    },
    {
      _id: new ObjectId("650000000000000000000014"),
      ticketId: 'RD-123',
      title: "I can't see any billing information",
      description: "Usage billing metrics empty.",
      category: "Billing & Payments",
      priority: "High",
      status: "IN_PROGRESS",
      createdBy: { _id: users[3]._id, name: users[3].name, email: users[3].email },
      assignedTo: { _id: users[1]._id, name: users[1].name, email: users[1].email },
      createdAt: new Date(now - 59 * 60000),
      updatedAt: new Date(now - 5 * 60000)
    },
    {
      _id: new ObjectId("650000000000000000000015"),
      ticketId: 'RD-124',
      title: "The billing site is really slow",
      description: "Page load latency high.",
      category: "Billing & Payments",
      priority: "High",
      status: "IN_PROGRESS",
      createdBy: { _id: users[4]._id, name: users[4].name, email: users[4].email },
      assignedTo: { _id: users[2]._id, name: users[2].name, email: users[2].email },
      createdAt: new Date(now - 61 * 60000),
      updatedAt: new Date(now - 12 * 60000)
    }
  ];

  await db.collection('tickets').insertMany(tickets);

  const categories = [
    { name: 'Billing & Payments', description: 'Billing issues', createdAt: new Date() },
    { name: 'Account & Intranet Access', description: 'Account access', createdAt: new Date() },
    { name: 'Hardware & Workstation', description: 'Hardware issues', createdAt: new Date() },
    { name: 'Software & Email', description: 'Software issues', createdAt: new Date() },
    { name: 'Network & Cloud Storage', description: 'Network connectivity', createdAt: new Date() }
  ];
  await db.collection('categories').insertMany(categories);
};

module.exports = {
  connectDB,
  getDb,
  getUsersCollection: () => getDb().collection('users'),
  getTicketsCollection: () => getDb().collection('tickets'),
  getCommentsCollection: () => getDb().collection('comments'),
  getCategoriesCollection: () => getDb().collection('categories')
};
