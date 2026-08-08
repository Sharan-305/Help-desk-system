const { ObjectId } = require('mongodb');
const { getTicketsCollection, getCommentsCollection, getUsersCollection } = require('../config/database');
const { generateTicketId } = require('../utils/ticketIdGenerator');

// @desc    Create a new support ticket
// @route   POST /api/tickets
// @access  Private (Customer, Admin)
const createTicket = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description, and category are required' });
    }

    const ticketId = await generateTicketId();

    const newTicket = {
      ticketId,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      priority: priority || 'Medium',
      status: 'OPEN',
      createdBy: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email
      },
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null
    };

    const ticketsCollection = getTicketsCollection();
    const result = await ticketsCollection.insertOne(newTicket);

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: {
        _id: result.insertedId,
        ...newTicket
      }
    });
  } catch (error) {
    console.error('Create Ticket Error:', error);
    res.status(500).json({ message: 'Failed to create ticket', error: error.message });
  }
};

// @desc    Get tickets (filtered by role and query params)
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res) => {
  try {
    const { status, priority, category, search, assignedToMe } = req.query;
    const query = {};

    // Role-based scoping
    if (req.user.role === 'Customer') {
      query['createdBy._id'] = new ObjectId(req.user._id);
    } else if (req.user.role === 'Support Agent' && assignedToMe === 'true') {
      query['assignedTo._id'] = new ObjectId(req.user._id);
    }
    // Admin and Support Agent see all tickets by default

    // Filtering options
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }
    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const ticketsCollection = getTicketsCollection();
    const tickets = await ticketsCollection
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({
      count: tickets.length,
      tickets
    });
  } catch (error) {
    console.error('Get Tickets Error:', error);
    res.status(500).json({ message: 'Failed to fetch tickets', error: error.message });
  }
};

// @desc    Get single ticket by MongoDB _id or ticketId
// @route   GET /api/tickets/:id
// @access  Private
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketsCollection = getTicketsCollection();

    let query;
    if (ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { ticketId: id }] };
    } else {
      query = { ticketId: id };
    }

    const ticket = await ticketsCollection.findOne(query);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Role access authorization check
    if (
      req.user.role === 'Customer' &&
      ticket.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied: You can only view your own tickets' });
    }

    // Fetch comments for this ticket
    const commentsCollection = getCommentsCollection();
    const comments = await commentsCollection
      .find({ ticketId: ticket.ticketId })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      ticket,
      comments
    });
  } catch (error) {
    console.error('Get Ticket By Id Error:', error);
    res.status(500).json({ message: 'Failed to fetch ticket details', error: error.message });
  }
};

// @desc    Update ticket details
// @route   PUT /api/tickets/:id
// @access  Private
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, priority } = req.body;
    const ticketsCollection = getTicketsCollection();

    let filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { ticketId: id };
    const ticket = await ticketsCollection.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Authorization
    if (req.user.role === 'Customer' && ticket.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You can only edit your own tickets' });
    }

    const updateFields = {
      updatedAt: new Date()
    };
    if (title) updateFields.title = title.trim();
    if (description) updateFields.description = description.trim();
    if (category) updateFields.category = category.trim();
    if (priority) updateFields.priority = priority;

    await ticketsCollection.updateOne(filter, { $set: updateFields });

    const updatedTicket = await ticketsCollection.findOne(filter);
    res.json({
      message: 'Ticket updated successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Update Ticket Error:', error);
    res.status(500).json({ message: 'Failed to update ticket', error: error.message });
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private (Admin, or Customer if ticket is OPEN)
const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketsCollection = getTicketsCollection();
    const commentsCollection = getCommentsCollection();

    let filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { ticketId: id };
    const ticket = await ticketsCollection.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role !== 'Admin' && ticket.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admins or ticket creators can delete this ticket' });
    }

    await ticketsCollection.deleteOne(filter);
    await commentsCollection.deleteMany({ ticketId: ticket.ticketId });

    res.json({ message: 'Ticket and associated comments deleted successfully' });
  } catch (error) {
    console.error('Delete Ticket Error:', error);
    res.status(500).json({ message: 'Failed to delete ticket', error: error.message });
  }
};

// @desc    Update ticket workflow status
// @route   PUT /api/tickets/:id/status
// @access  Private
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const ticketsCollection = getTicketsCollection();
    let filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { ticketId: id };
    const ticket = await ticketsCollection.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Role permissions check for workflow status changes
    if (req.user.role === 'Customer') {
      // Customer can close or reopen their ticket
      if (ticket.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only update status on your own tickets' });
      }
      if (!['CLOSED', 'REOPENED'].includes(status)) {
        return res.status(403).json({ message: 'Customers can only update ticket status to CLOSED or REOPENED' });
      }
    }

    const updateFields = {
      status,
      updatedAt: new Date()
    };

    if (status === 'RESOLVED') {
      updateFields.resolvedAt = new Date();
    } else if (status === 'REOPENED') {
      updateFields.resolvedAt = null;
    }

    await ticketsCollection.updateOne(filter, { $set: updateFields });

    // Automatically add an audit system comment
    const commentsCollection = getCommentsCollection();
    await commentsCollection.insertOne({
      ticketId: ticket.ticketId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      message: `System Alert: Status updated from '${ticket.status}' to '${status}' by ${req.user.name} (${req.user.role})`,
      isSystem: true,
      createdAt: new Date()
    });

    const updatedTicket = await ticketsCollection.findOne(filter);
    res.json({
      message: `Status updated to ${status}`,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'Failed to update ticket status', error: error.message });
  }
};

// @desc    Assign ticket to support agent
// @route   PUT /api/tickets/:id/assign
// @access  Private (Admin, Support Agent)
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ message: 'agentId is required' });
    }

    const usersCollection = getUsersCollection();
    const agent = await usersCollection.findOne({
      _id: new ObjectId(agentId),
      role: { $in: ['Support Agent', 'Admin'] }
    });

    if (!agent) {
      return res.status(404).json({ message: 'Support agent or admin not found' });
    }

    const ticketsCollection = getTicketsCollection();
    let filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { ticketId: id };
    const ticket = await ticketsCollection.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const assignedToObj = {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      department: agent.department || 'Support'
    };

    // Auto-update status to ASSIGNED if currently OPEN
    const newStatus = (ticket.status === 'OPEN') ? 'ASSIGNED' : ticket.status;

    await ticketsCollection.updateOne(filter, {
      $set: {
        assignedTo: assignedToObj,
        status: newStatus,
        updatedAt: new Date()
      }
    });

    // Add audit comment
    const commentsCollection = getCommentsCollection();
    await commentsCollection.insertOne({
      ticketId: ticket.ticketId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      message: `Ticket assigned to agent ${agent.name} (${agent.email})`,
      isSystem: true,
      createdAt: new Date()
    });

    const updatedTicket = await ticketsCollection.findOne(filter);
    res.json({
      message: `Ticket successfully assigned to ${agent.name}`,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Assign Ticket Error:', error);
    res.status(500).json({ message: 'Failed to assign ticket', error: error.message });
  }
};

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Comment message cannot be empty' });
    }

    const ticketsCollection = getTicketsCollection();
    let filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { ticketId: id };
    const ticket = await ticketsCollection.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Role check: customer can only comment on own tickets
    if (req.user.role === 'Customer' && ticket.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You can only comment on your own tickets' });
    }

    const newComment = {
      ticketId: ticket.ticketId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      message: message.trim(),
      isSystem: false,
      createdAt: new Date()
    };

    const commentsCollection = getCommentsCollection();
    const result = await commentsCollection.insertOne(newComment);

    // Update ticket updatedAt timestamp
    await ticketsCollection.updateOne(filter, { $set: { updatedAt: new Date() } });

    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        _id: result.insertedId,
        ...newComment
      }
    });
  } catch (error) {
    console.error('Add Comment Error:', error);
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

// @desc    Get all comments for a ticket
// @route   GET /api/tickets/:id/comments
// @access  Private
const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketsCollection = getTicketsCollection();
    let filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { ticketId: id };
    const ticket = await ticketsCollection.findOne(filter);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const commentsCollection = getCommentsCollection();
    const comments = await commentsCollection
      .find({ ticketId: ticket.ticketId })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      ticketId: ticket.ticketId,
      count: comments.length,
      comments
    });
  } catch (error) {
    console.error('Get Comments Error:', error);
    res.status(500).json({ message: 'Failed to fetch comments', error: error.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  updateTicketStatus,
  assignTicket,
  addComment,
  getComments
};
