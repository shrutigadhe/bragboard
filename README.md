# 🏆 BragBoard – Internal Employee Recognition Platform

[![Live Demo](https://img.shields.io/badge/Vercel-Live%20App-brightgreen?style=for-the-badge&logo=vercel)](https://bragboard-ictwzlgyw-shrutigadhe6-5986s-projects.vercel.app)
[![Backend Status](https://img.shields.io/badge/Render-Backend%20API-blue?style=for-the-badge&logo=render)](https://bragboard-backend-yj4e.onrender.com/api/greet)
[![API Docs](https://img.shields.io/badge/FastAPI-Swagger%20Docs-009688?style=for-the-badge&logo=fastapi)](https://bragboard-backend-yj4e.onrender.com/docs)

**BragBoard** is a full-stack employee recognition and appreciation platform designed to boost team morale and foster a culture of gratitude. Employees can share department brag posts, send peer-to-peer shout-outs, tag colleagues, leave reactions/comments, and track engagement via dynamic leaderboards.

---

## 🌐 Live Deployment Links

- **Frontend App (Vercel):** [https://bragboard-ictwzlgyw-shrutigadhe6-5986s-projects.vercel.app](https://bragboard-ictwzlgyw-shrutigadhe6-5986s-projects.vercel.app)
- **Backend API (Render):** [https://bragboard-backend-yj4e.onrender.com](https://bragboard-backend-yj4e.onrender.com)
- **Interactive API Documentation:** [https://bragboard-backend-yj4e.onrender.com/docs](https://bragboard-backend-yj4e.onrender.com/docs)

---

## ✨ Features

### 👤 User & Profile Management
- **JWT Authentication:** Secure signup/login with JWT access tokens and persistent session storage.
- **Profile Customization:** Upload and crop custom profile avatars, edit user display name, email address, and department assignment.

### 📢 Brags & Department Feed
- **Department Brags:** Share achievement posts within your department.
- **Automatic Image Compression:** Uploaded images are compressed client-side before sending to optimize database storage and eliminate load delays.
- **Rich Media & Lightbox:** Support for high-res images and video attachments with built-in lightbox preview.

### 👏 Peer-to-Peer Shout-Outs & Mentions
- **Public Recognition:** Send appreciation shout-outs to one or multiple team members.
- **@Mention Tagging:** Tag colleagues in posts (`@FirstName`) to trigger instant notifications for tagged individuals.

### ❤️ Reactions & Threaded Comments
- **LinkedIn-Style Reactions:** React to posts with Likes, Claps, or Stars.
- **Threaded Comments:** Leave top-level comments or reply directly to existing comments.

### 🔔 Smart Notification Center
- **Real-Time Polling & Unread Badges:** Instant notification bell updates for reactions, comments, shout-outs, and mentions.
- **Interactive Navigation:** Clicking any notification auto-navigates directly to the relevant post or shout-out on the dashboard.

### 🛡️ Admin Dashboard & Moderation
- **Platform Analytics:** Real-time stats showing Top Contributors and Most Tagged Team Members.
- **Gamified Leaderboard:** Points system rewarding posts (+10 pts), shout-outs sent (+5 pts), shout-outs received (+15 pts), and reactions (+2 pts).
- **Content Moderation:** Review user reports for inappropriate content with single-click options to **Dismiss/Resolve** or **Delete Content**.
- **CSV Data Export:** One-click export of moderation reports to CSV format.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (v18)
- **Styling:** Tailwind CSS with custom glassmorphism components
- **Routing:** React Router v6 (with SPA rewrite support)
- **Icons:** React Icons (FontAwesome / Lucide)

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **ORM & DB:** SQLAlchemy & PostgreSQL (hosted on Render)
- **Authentication:** OAuth2 with Password Hashing (Argon2 / Passlib) and PyJWT
- **Validation:** Pydantic schemas

### Deployment & CI/CD
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render
- **Database:** Render PostgreSQL

---

## 🏗️ System Architecture

```text
 ┌─────────────────────────────────────────────────────────┐
 │                   React.js Frontend                     │
 │                   (Hosted on Vercel)                    │
 └────────────────────────────┬────────────────────────────┘
                              │
                              │ REST API Calls (HTTPS / CORS)
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │                   FastAPI Backend                       │
 │                   (Hosted on Render)                    │
 └────────────────────────────┬────────────────────────────┘
                              │
                              │ SQLAlchemy ORM
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │                  PostgreSQL Database                    │
 │                   (Hosted on Render)                    │
 └─────────────────────────────────────────────────────────┘
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** (v16+) & **npm**
- **Python** (v3.10+)
- **PostgreSQL** (or SQLite for local testing)

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
# Activate virtual environment (Windows)
.\venv\Scripts\activate
# Activate virtual environment (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (.env)
# DATABASE_URL=postgresql://user:password@localhost:5432/bragboard
# SECRET_KEY=your_secret_key

# Run the development server
uvicorn main:app --reload --port 8000
```
Backend API will be live at `http://127.0.0.1:8000` (Swagger docs at `http://127.0.0.1:8000/docs`).

### 3. Frontend Setup
```bash
cd frontend/bragfront

# Install dependencies
npm install

# Create local environment file (.env)
# REACT_APP_API_URL=http://127.0.0.1:8000

# Start React app
npm start
```
Frontend app will be running at `http://localhost:3000`.

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register` | Register a new user |
| `POST` | `/api/login` | Log in and receive JWT token |
| `GET` | `/api/me` | Fetch current user profile |
| `PUT` | `/api/me` | Update user profile (name, email, dept, avatar) |
| `GET` | `/api/departments/` | Fetch list of company departments |
| `GET` | `/api/brags/department` | Fetch brag posts for user's department |
| `POST` | `/api/brags/` | Create a new brag post |
| `GET` | `/api/brags/{brag_id}` | Fetch a single brag post by ID |
| `GET` | `/api/shoutouts/` | Fetch public shout-outs feed |
| `POST` | `/api/shoutouts/` | Send appreciation shout-out |
| `GET` | `/api/notifications/` | Fetch user's in-app notifications |
| `GET` | `/api/admin/stats` | Admin platform analytics & stats |
| `GET` | `/api/admin/reports` | Admin moderation reports |
| `DELETE` | `/api/admin/reports/{id}` | Clear a report record |

---

## 👥 Contributing & Contact

Created by **Shruti Gadhe**  
Repository: [https://github.com/shrutigadhe/bragboard](https://github.com/shrutigadhe/bragboard)
