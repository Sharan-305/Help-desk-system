const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  updateTicketStatus,
  assignTicket,
  addComment,
  getComments
} = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All ticket routes require authentication
router.use(protect);

router.route('/')
  .post(createTicket)
  .get(getTickets);

router.route('/:id')
  .get(getTicketById)
  .put(updateTicket)
  .delete(deleteTicket);

router.put('/:id/status', updateTicketStatus);
router.put('/:id/assign', authorize('Admin', 'Support Agent'), assignTicket);

router.route('/:id/comments')
  .post(addComment)
  .get(getComments);

module.exports = router;
