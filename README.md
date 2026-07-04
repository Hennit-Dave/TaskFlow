# TaskFlow - Modern To-Do List Application

A full-stack task management application built with Node.js, Express, SQLite, and vanilla JavaScript. Perfect for beginner developers learning full-stack concepts.

## Features

- User authentication (register, login, logout)
- Create, read, update, and delete tasks
- Mark tasks as completed or pending
- Set priority levels (High, Medium, Low)
- Add due dates to tasks
- Filter tasks (All, Completed, Pending)
- Sort tasks (Newest, Oldest)
- Search tasks by title or keyword
- Dark mode toggle with persistent preference
- Progress bar showing completion percentage
- Toast notifications for actions
- Responsive design (mobile, tablet, desktop)
- Confirmation dialogs before deletion

## Project Structure

```
taskflow/
├── backend/
│   ├── server.js     # Express server with API routes
│   ├── database.js   # SQLite database setup
│   └── package.json  # Node.js dependencies
├── css/
│   └── style.css     # All styles with dark mode support
├── html/
│   ├── index.html        # Login and registration page
│   └── dashboard.html    # Main dashboard page
├── js/
│   ├── auth.js       # Authentication logic
│   ├── dashboard.js  # Task management logic
│   └── utils.js      # Shared utility functions
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- npm (included with Node.js)

## How to Run

1. **Navigate to the project folder**

```bash
cd taskflow
```

2. **Install backend dependencies**

```bash
cd backend
npm install
```

3. **Start the server**

```bash
npm start
```

The server will start at `http://localhost:3000`.

4. **Open the app**

Visit `http://localhost:3000/html/index.html` in your browser.

## How It Works

### Backend
- **Express** handles HTTP requests and serves static files.
- **SQLite** stores user accounts and tasks in `backend/taskflow.db`.
- **bcryptjs** hashes passwords before storing them.
- **JSON Web Tokens (JWT)** authenticate users on each request.

### Frontend
- **HTML** files are served as static content by the Express server.
- **CSS** uses custom properties for theming and dark mode.
- **JavaScript** is split into modules:
  - `utils.js` handles API calls, toast notifications, and formatting.
  - `auth.js` manages login and registration.
  - `dashboard.js` handles task CRUD, filtering, and UI updates.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Log in to an existing account |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/tasks` | Get user's tasks (with filter/sort/search) |
| POST | `/api/tasks` | Create a new task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express
- **Database:** SQLite (via better-sqlite3)
- **Authentication:** bcryptjs + JSON Web Tokens
