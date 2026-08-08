# Cloud-Based Help Desk Ticket System

**B.Tech Artificial Intelligence & Data Science - Cloud Computing Project**

---

## 1. Project Abstract
The **Cloud-Based Help Desk Ticket System** is an intermediate-level, cloud-native full-stack web application designed to streamline customer support, technical issue reporting, ticket allocation, and issue resolution workflows. Built specifically for cloud deployment, the application leverages Node.js and Express for the REST API backend, the **official native MongoDB Node.js Driver** for cloud database persistence on MongoDB Atlas, JWT (JSON Web Tokens) with bcrypt password hashing for secure authentication, and a responsive HTML5/CSS3/JavaScript frontend with interactive Chart.js analytics.

---

## 2. Problem Statement
Traditional help-desk systems rely on fragmented email threads, paper tickets, or legacy on-premise hardware, resulting in:
- High latency in resolving customer issues.
- Lack of centralized ticket assignment and visibility for support agents.
- Inability to track real-time resolution metrics or SLA priorities.
- High infrastructure setup and maintenance costs.

---

## 3. Project Objectives
- Build a cloud-hosted, scalable help-desk ticket management system.
- Implement **Role-Based Access Control (RBAC)** across three distinct user roles: `Customer`, `Support Agent`, and `Admin`.
- Enforce clean RESTful API standards for authentication, ticket operations, and administration.
- Utilize the official native `mongodb` Node.js driver without any ORM abstraction layer (such as Mongoose) to gain deep practical experience with raw MongoDB queries, aggregation pipelines, and document indexing.
- Provide a responsive dashboard featuring live Chart.js statistics for priority distribution and ticket status breakdown.

---

## 4. Existing System vs Proposed System

| Parameter | Existing Legacy System | Proposed Cloud-Based System |
| :--- | :--- | :--- |
| **Hosting** | On-premise servers | Cloud-hosted backend & database (MongoDB Atlas) |
| **Ticket Tracking** | Manual spreadsheet / email | Automated sequential IDs (`HD-1001`) & real-time status |
| **Access Control** | Uniform / minimal roles | Multi-role RBAC (`Customer`, `Agent`, `Admin`) |
| **Analytics** | Static offline reports | Dynamic interactive dashboard with Chart.js |
| **Scalability** | Hardware limited | Elastic cloud architecture |

---

## 5. System Requirements

### Functional Requirements
1. **User Authentication & Profiles**: Registration, login, profile view, password hashing with bcrypt, JWT token generation.
2. **Customer Ticket Lifecycle**: Create tickets, view personal tickets, track status, add comments, close or reopen tickets.
3. **Support Agent Operations**: View assigned tickets, update ticket workflow status (`OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`), post resolution responses, inspect ticket history.
4. **Admin Governance**: View all users, modify user roles and departments, manage ticket categories, assign tickets to agents, inspect real-time dashboard analytics.
5. **Audit Logging**: Automatic system comment generation upon workflow status transitions or agent assignments.

### Non-Functional Requirements
- **Performance**: Sub-100ms API response time with indexed MongoDB queries.
- **Security**: Environment variable secret management, hashed passwords, CORS protection, JWT expiration.
- **Usability**: Responsive glassmorphic UI with CSS grid/flexbox, dark mode palette, and mobile-friendly sidebar.
- **Reliability**: Graceful handling of database reconnects and API errors.

---

## 6. Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla CSS with CSS Variables & Glassmorphism), JavaScript (ES6+, Fetch API), Chart.js (CDN).
- **Backend**: Node.js, Express.js framework.
- **Database**: MongoDB Atlas using the **Official MongoDB Node.js Driver (`mongodb` npm package)**. *No Mongoose or ORM used.*
- **Security**: JWT (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`), CORS (`cors`), dotenv (`dotenv`).

---

## 7. Cloud Architecture & System Flow

```text
                                INTERNET
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Cloud Frontend  │
                         │ (HTML5 / CSS / JS)│
                         └─────────┬─────────┘
                                   │
                              HTTPS / REST
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Cloud Backend   │
                         │ (Node.js/Express) │
                         └─────────┬─────────┘
                                   │
                          Native MongoDB Driver
                                   │
                                   ▼
                         ┌───────────────────┐
                         │  MongoDB Atlas    │
                         │  Cloud Database   │
                         └───────────────────┘
```

---

## 8. Database Design (MongoDB Atlas Collections)

### 1. `users` Collection
```json
{
  "_id": "ObjectId",
  "name": "Sarah Connor",
  "email": "agent@helpdesk.com",
  "password": "$2a$10$hashed_bcrypt_password",
  "role": "Support Agent", // 'Customer' | 'Support Agent' | 'Admin'
  "department": "Tier-2 Technical Support",
  "createdAt": "ISODate"
}
```

### 2. `tickets` Collection
```json
{
  "_id": "ObjectId",
  "ticketId": "HD-1001",
  "title": "Unable to authenticate via Single Sign-On",
  "description": "Receiving HTTP 401 Unauthorized when attempting to login...",
  "category": "Account Issue",
  "priority": "High", // 'Low' | 'Medium' | 'High' | 'Critical'
  "status": "ASSIGNED", // 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED'
  "createdBy": { "_id": "ObjectId", "name": "David Miller", "email": "customer@helpdesk.com" },
  "assignedTo": { "_id": "ObjectId", "name": "Sarah Connor", "email": "agent@helpdesk.com" },
  "createdAt": "ISODate",
  "updatedAt": "ISODate",
  "resolvedAt": null
}
```

### 3. `comments` Collection
```json
{
  "_id": "ObjectId",
  "ticketId": "HD-1001",
  "userId": "ObjectId",
  "userName": "Sarah Connor",
  "userRole": "Support Agent",
  "message": "Hello David, I have received your ticket and am investigating.",
  "isSystem": false,
  "createdAt": "ISODate"
}
```

### 4. `categories` Collection
```json
{
  "_id": "ObjectId",
  "name": "Technical Issue",
  "description": "Bugs, system errors, database or API failures",
  "createdAt": "ISODate"
}
```

---

## 9. REST API Endpoint Specifications

### Authentication
- `POST /api/auth/register` - Register a new customer account.
- `POST /api/auth/login` - Authenticate user & return JWT token.
- `GET  /api/auth/profile` - Fetch authenticated user details.

### Ticket Management
- `POST   /api/tickets` - Create new ticket.
- `GET    /api/tickets` - List tickets (filtered by role, search, status, priority, category).
- `GET    /api/tickets/:id` - Fetch single ticket with comment thread.
- `PUT    /api/tickets/:id` - Edit ticket details.
- `DELETE /api/tickets/:id` - Delete ticket (Admin or ticket owner).

### Ticket Workflow & Actions
- `PUT  /api/tickets/:id/status` - Transition ticket status (`OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED` → `REOPENED`).
- `PUT  /api/tickets/:id/assign` - Assign ticket to a support agent.
- `POST /api/tickets/:id/comments` - Post comment/response.
- `GET  /api/tickets/:id/comments` - List comments for ticket.

### Admin Operations
- `GET /api/admin/dashboard` - Get aggregated dashboard statistics & chart metrics.
- `GET /api/admin/users` - View all registered users.
- `PUT /api/admin/users/:id/role` - Update user system role or department.
- `GET /api/admin/categories` - Fetch ticket categories.
- `POST /api/admin/categories` - Add ticket category.
- `DELETE /api/admin/categories/:id` - Delete category.

---

## 10. Complete Ticket Workflow

```text
Customer Creates Ticket
         ↓
       OPEN
         ↓
 Admin/Agent Assigns Agent
         ↓
     ASSIGNED
         ↓
 Agent Starts Investigation
         ↓
    IN_PROGRESS
         ↓
  Issue Resolved by Agent
         ↓
     RESOLVED
         ↓
  Customer/Admin Closes Ticket
         ↓
       CLOSED (Can be REOPENED by Customer if issue persists)
```

---

## 11. Step-by-Step Cloud Deployment Guide

### 1. MongoDB Atlas Configuration
1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Database Cluster (Shared M0 Free Tier).
3. Under **Database Access**, create a user with read/write privileges.
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere).
5. Obtain your Connection String URI: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/helpdesk_db`.

### 2. Node.js Backend Deployment (Render / Railway / Heroku)
1. Push repository code to GitHub.
2. Create a new **Web Service** on Render (or Railway).
3. Connect your GitHub repository.
4. Set Build Command: `npm install`.
5. Set Start Command: `node backend/server.js`.
6. Add Environment Variables:
   - `PORT=5000`
   - `MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/helpdesk_db`
   - `JWT_SECRET=your_production_secret_key`
   - `CLIENT_URL=*`
7. Deploy service and copy public backend URL (e.g. `https://helpdesk-backend.onrender.com`).

### 3. Frontend Hosting (Vercel / Netlify / GitHub Pages)
1. Deploy `frontend/` directory to Vercel or Netlify.
2. Ensure `API_BASE_URL` in `js/api.js` resolves to your deployed cloud backend API URL.

---

## 12. Local Installation & Demonstration Guide

### Prerequisites
- Node.js (v16+) installed.
- Local MongoDB running on `mongodb://127.0.0.1:27017` OR MongoDB Atlas connection URI.

### Execution Steps
```bash
# 1. Clone repository
git clone <repo-url>
cd "Help desk system"

# 2. Install Node dependencies
npm install

# 3. Seed initial demo database (Admin, Agent, Customer accounts & Sample Tickets)
npm run seed

# 4. Start backend server
npm run dev
# OR: npm start
```

Open browser at `http://localhost:5000/`.

### Pre-seeded Demo Credentials
- **Admin**: `admin@helpdesk.com` / `admin123`
- **Support Agent**: `agent@helpdesk.com` / `agent123`
- **Customer**: `customer@helpdesk.com` / `customer123`

---

## 13. Testing Strategy
- **Unit Testing**: Route handlers and utility functions (`ticketIdGenerator.js`).
- **Integration Testing**: Testing JWT authorization headers and native MongoDB driver CRUD operations.
- **Workflow Verification**: Verifying state transitions from `OPEN` to `CLOSED` and `REOPENED`.
- **Cross-Browser Verification**: Tested on Chrome, Edge, and mobile responsive viewports.

---

## 14. Advantages, Limitations & Future Enhancements

### Key Advantages
- Native MongoDB driver integration demonstrates core database query mechanics without ORM abstraction.
- Multi-role security ensures privacy and structured support workflows.
- Lightweight vanilla frontend provides rapid page loads and high responsiveness.

### Limitations
- File attachments (screenshots/logs) require cloud storage integration (AWS S3 or Cloudinary).
- Real-time notifications currently rely on HTTP polling rather than WebSockets.

### Future Enhancements
- Integration with AWS S3 for uploading error screenshots.
- Real-time WebSocket / Socket.io live chat between Customers and Agents.
- Email notifications via Nodemailer / SendGrid for ticket status updates.

---

## 15. Conclusion
The **Cloud-Based Help Desk Ticket System** successfully demonstrates key principles of cloud computing, REST API design, raw database management, role-based security, and responsive web design. It offers a production-ready template suitable for academic evaluation and enterprise scaling.
