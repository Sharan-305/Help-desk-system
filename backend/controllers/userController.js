const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { getUsersCollection } = require('../config/database');

// @desc    Get list of all support agents (and admins) for ticket assignment dropdowns
// @route   GET /api/users/agents
// @access  Private
const getAgents = async (req, res) => {
  try {
    const usersCollection = getUsersCollection();
    const agents = await usersCollection
      .find({ role: { $in: ['Support Agent', 'Admin'] } }, { projection: { password: 0 } })
      .sort({ name: 1 })
      .toArray();

    res.json({ agents });
  } catch (error) {
    console.error('Get Agents Error:', error);
    res.status(500).json({ message: 'Failed to fetch support agents' });
  }
};

// @desc    Update current user profile & application settings
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, department, settings, currentPassword, newPassword } = req.body;
    const usersCollection = getUsersCollection();

    const user = await usersCollection.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateFields = {};

    if (name && name.trim()) {
      updateFields.name = name.trim();
    }
    if (department !== undefined) {
      updateFields.department = department.trim();
    }

    if (settings) {
      updateFields.settings = {
        emailNotifications: settings.emailNotifications !== undefined ? Boolean(settings.emailNotifications) : true,
        autoRefreshInterval: settings.autoRefreshInterval !== undefined ? Number(settings.autoRefreshInterval) : 60,
        defaultPriority: settings.defaultPriority || 'Medium',
        themePreference: settings.themePreference || 'Blush Champagne'
      };
    }

    // Handle password change if requested
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password does not match' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(newPassword, salt);
    }

    await usersCollection.updateOne(
      { _id: req.user._id },
      { $set: updateFields }
    );

    const updatedUser = await usersCollection.findOne(
      { _id: req.user._id },
      { projection: { password: 0 } }
    );

    res.json({
      message: 'Profile & settings updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ message: 'Failed to update user settings', error: error.message });
  }
};

module.exports = {
  getAgents,
  updateProfile
};
