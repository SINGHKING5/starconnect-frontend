# StarConnect Frontend

This is the frontend for **StarConnect**, a modern, real-time social media feed built with Next.js.

---

## 🖥 Features

- Role-based login (Celebrity & Public)
- Celebrity: Create posts (text + image)
- Public: Follow celebrities, see infinite feed
- Real-time notifications when a celebrity posts
- Red badge alert and notification page
- Like & comment system
- Lazy loading images, mobile-friendly, and responsive

---

## 🔧 Tech Stack

- Next.js 14 (App Router + TypeScript)
- Tailwind CSS
- Socket.IO Client
- Zustand (state management)
- Axios
- localStorage (notifications persistence)

---

## 🚀 Setup Instructions

1. Clone the repo  
bash
git clone https://github.com/your-username/starconnect-frontend.git
cd starconnect-frontend

2. Install dependencies

bash
Copy
Edit
npm install


3. Create a .env.local file

env
Copy
Edit
NEXT_PUBLIC_BACKEND_URL=http://localhost:5050


4. Run the app

bash
Copy
Edit
npm run dev

