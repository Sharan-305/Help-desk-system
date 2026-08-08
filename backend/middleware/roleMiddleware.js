/**
 * Role-Based Authorization Middleware
 * @param  {...string} roles Allowed roles ('Customer', 'Support Agent', 'Admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to ${roles.join(', ')} roles. Your role is '${req.user.role}'`
      });
    }

    next();
  };
};

module.exports = { authorize };
