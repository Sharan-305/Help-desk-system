const { ObjectId } = require('mongodb');
const { getUsersCollection, getTicketsCollection, getCategoriesCollection } = require('../config/database');

// @desc    Get dashboard statistics for Admin
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const ticketsCollection = getTicketsCollection();
    const usersCollection = getUsersCollection();

    const [
      totalTickets,
      openTickets,
      assignedTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      reopenedTickets,
      highPriorityTickets,
      criticalPriorityTickets,
      totalUsers,
      totalAgents,
      totalCustomers
    ] = await Promise.all([
      ticketsCollection.countDocuments(),
      ticketsCollection.countDocuments({ status: 'OPEN' }),
      ticketsCollection.countDocuments({ status: 'ASSIGNED' }),
      ticketsCollection.countDocuments({ status: 'IN_PROGRESS' }),
      ticketsCollection.countDocuments({ status: 'RESOLVED' }),
      ticketsCollection.countDocuments({ status: 'CLOSED' }),
      ticketsCollection.countDocuments({ status: 'REOPENED' }),
      ticketsCollection.countDocuments({ priority: 'High' }),
      ticketsCollection.countDocuments({ priority: 'Critical' }),
      usersCollection.countDocuments(),
      usersCollection.countDocuments({ role: 'Support Agent' }),
      usersCollection.countDocuments({ role: 'Customer' })
    ]);

    // Aggregate category & priority distribution for dashboard charts
    let categoryStats = [];
    let priorityStats = [];
    try {
      const catAgg = ticketsCollection.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
      const catRes = (catAgg && typeof catAgg.then === 'function') ? await catAgg : catAgg;
      categoryStats = (catRes && typeof catRes.toArray === 'function') ? await catRes.toArray() : [];
    } catch (e) {
      categoryStats = [];
    }

    try {
      const prioAgg = ticketsCollection.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]);
      const prioRes = (prioAgg && typeof prioAgg.then === 'function') ? await prioAgg : prioAgg;
      priorityStats = (prioRes && typeof prioRes.toArray === 'function') ? await prioRes.toArray() : [];
    } catch (e) {
      priorityStats = [];
    }

    res.json({
      stats: {
        totalTickets,
        openTickets,
        assignedTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        reopenedTickets,
        highPriorityTickets,
        criticalPriorityTickets,
        highOrCriticalTickets: highPriorityTickets + criticalPriorityTickets,
        totalUsers,
        totalAgents,
        totalCustomers
      },
      categoryStats,
      priorityStats
    });
  } catch (error) {
    console.error('Admin Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics', error: error.message });
  }
};

// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const usersCollection = getUsersCollection();
    const users = await usersCollection
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ count: users.length, users });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// @desc    Update user role or department
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, department } = req.body;

    if (role && !['Customer', 'Support Agent', 'Admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const usersCollection = getUsersCollection();
    const filter = { _id: new ObjectId(id) };

    const updateFields = {};
    if (role) updateFields.role = role;
    if (department) updateFields.department = department.trim();

    const result = await usersCollection.updateOne(filter, { $set: updateFields });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = await usersCollection.findOne(filter, { projection: { password: 0 } });
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update User Role Error:', error);
    res.status(500).json({ message: 'Failed to update user role', error: error.message });
  }
};

// @desc    Get categories
// @route   GET /api/admin/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const categoriesCollection = getCategoriesCollection();
    const categories = await categoriesCollection.find({}).sort({ name: 1 }).toArray();
    res.json({ categories });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// @desc    Create new category
// @route   POST /api/admin/categories
// @access  Private (Admin)
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const categoriesCollection = getCategoriesCollection();
    const existing = await categoriesCollection.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const newCategory = {
      name: name.trim(),
      description: (description || '').trim(),
      createdAt: new Date()
    };

    const result = await categoriesCollection.insertOne(newCategory);
    res.status(201).json({
      message: 'Category created',
      category: { _id: result.insertedId, ...newCategory }
    });
  } catch (error) {
    console.error('Create Category Error:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private (Admin)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const categoriesCollection = getCategoriesCollection();
    await categoriesCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete Category Error:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  getCategories,
  createCategory,
  deleteCategory
};
