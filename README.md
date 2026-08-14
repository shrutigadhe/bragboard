# 🏆 BragBoard – Internal Employee Recognition Platform

BragBoard is an internal employee recognition platform designed to
encourage employee appreciation and engagement.

It allows employees to recognize their colleagues through shout-outs,
reactions, comments, and tagging while providing administrators with
tools to monitor and manage platform activity.

---

## 🚀 Live Demo

🔗 **Live Application:**  
https://bragboard-frontend-bney.onrender.com

---

## ✨ Features

- 🔐 Secure user authentication
- 🎫 JWT-based authentication
- 🔄 Access and refresh token support
- 👥 Employee shout-outs and appreciation posts
- 🏷️ Employee tagging
- 👍 Reactions and engagement
- 💬 Comments
- 🛡️ Admin dashboard and activity monitoring
- 📊 Employee engagement features
- 📱 Responsive user interface
- 🤝 Team-based employee recognition

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Tailwind CSS

### Backend
- Python
- FastAPI
- REST APIs

### Database
- PostgreSQL

### Authentication & Security
- JWT Authentication
- Access Tokens
- Refresh Tokens

### Development Tools
- Git
- GitHub
- VS Code

---

## 🏗️ System Architecture

```text
                    BragBoard
                        │
                        ▼
                ┌───────────────┐
                │  React.js UI  │
                │ Tailwind CSS  │
                └───────┬───────┘
                        │
                        │ REST API
                        ▼
                ┌───────────────┐
                │    FastAPI    │
                │    Backend    │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │  PostgreSQL   │
                │   Database    │
                └───────────────┘
