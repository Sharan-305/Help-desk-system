const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
// Use ALT_PORT environment variable to avoid colliding with the main server
const PORT = process.env.ALT_PORT || 5001;

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files (same frontend folder)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    message: 'Alternate Help Desk API instance is running',
    timestamp: new Date()
  });
});

// Fallback route for frontend HTML pages
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Alternate Server Unhandled Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Start Server after connecting to MongoDB
const startAltServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log('=======================================================');
      console.log(`🚀 Alternate Help Desk Backend running on port ${PORT}`);
      console.log(`🌐 Local Access: http://localhost:${PORT}`);
      console.log('=======================================================');
    });
  } catch (error) {
    console.error('Failed to start alternate server:', error);
  }
};

startAltServer();
