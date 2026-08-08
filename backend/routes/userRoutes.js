const express = require('express');
const router = express.Router();
const { getAgents, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/agents', authorize('Admin', 'Support Agent', 'Customer'), getAgents);
router.put('/profile', updateProfile);

module.exports = router;
