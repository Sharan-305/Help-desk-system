const { getTicketsCollection } = require('../config/database');

/**
 * Generates a sequential human-readable ticket ID (e.g. HD-1001, HD-1002)
 */
const generateTicketId = async () => {
  try {
    const ticketsCollection = getTicketsCollection();
    const count = await ticketsCollection.countDocuments();
    const nextNumber = 1001 + count;
    
    let ticketId = `HD-${nextNumber}`;
    // Double-check uniqueness in case of concurrent creations
    let existing = await ticketsCollection.findOne({ ticketId });
    let attempts = 0;
    while (existing && attempts < 50) {
      attempts++;
      ticketId = `HD-${nextNumber + attempts}`;
      existing = await ticketsCollection.findOne({ ticketId });
    }
    return ticketId;
  } catch (error) {
    console.error('Error generating ticket ID:', error);
    // Fallback ID if count fails
    return `HD-${Date.now().toString().slice(-6)}`;
  }
};

module.exports = { generateTicketId };
