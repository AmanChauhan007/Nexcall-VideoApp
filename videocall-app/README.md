# 📹 NexCall — Video Calling App

A full-stack video calling web app built with **React + Vite** (frontend) and **Spring Boot** (backend), using **WebRTC** for peer-to-peer video/audio and **WebSocket** for signaling.

---

## 🗂️ Project Structure

```
videocall-app/
├── backend/          ← Spring Boot (Java 17, WebSocket, WebRTC Signaling)
└── frontend/         ← React 18 + Vite (WebRTC, Video UI, Chat)
```

---

## ✅ Prerequisites

Install these before running:

| Tool     | Version  | Download                    |
|----------|----------|-----------------------------|
| Java JDK | 17+      | https://adoptium.net        |
| Maven    | 3.6+     | https://maven.apache.org    |
| Node.js  | 18+      | https://nodejs.org          |

Verify with:
```bash
java -version
mvn -version
node -v
npm -v
```

---

## 🚀 How to Run

### Terminal 1 — Start Backend (Spring Boot)

```bash
cd backend
mvn spring-boot:run
```

Wait for: `Started VideoCallApplication on port 8080`

> **Keep this terminal open while using the app.**

### Terminal 2 — Start Frontend (React)

```bash
cd frontend
npm install        # only needed first time
npm run dev
```

Open in browser: **http://localhost:3000**

---

## 🧪 How to Test

1. Open **http://localhost:3000** in **two browser windows** (use Incognito for the second)
2. In Window 1: Click **"+ New Room"** to generate a Room ID → Enter your name → Click **Join Room**
3. In Window 2: Enter the **same Room ID** → Enter a different name → Click **Join Room**
4. Both windows will connect and the video call starts automatically ✅

---

## 🎮 Features

- 📹 **WebRTC peer-to-peer video calling** (no server relay)
- 🎙️ **Mute/unmute audio**
- 📷 **Toggle camera on/off**
- 💬 **Live group chat**
- 👥 **Multi-participant support** (mesh topology)
- 🔗 **Shareable room links**
- 🔔 **Unread message badge**
- 🌐 **STUN server** for NAT traversal (Google STUN)

---

## 🛠️ VS Code Tips

1. Open the root `videocall-app/` folder in VS Code
2. Install these extensions:
   - **Extension Pack for Java** (Microsoft)
   - **Spring Boot Extension Pack** (VMware)
   - **ES7+ React/Redux/React-Native snippets**
3. You can run each terminal using VS Code's integrated terminal:
   - `Ctrl+\`` to open terminal
   - Use the **+** button to open a second terminal

---

## ⚙️ Configuration

**Backend port** — edit `backend/src/main/resources/application.properties`:
```
server.port=8080
```

**Frontend proxy** — edit `frontend/vite.config.js`:
```js
proxy: {
  '/api': { target: 'http://localhost:8080' }
}
```

If you change the backend port, update both files to match.

---

## 🌐 API Endpoints

| Method | URL                     | Description            |
|--------|-------------------------|------------------------|
| POST   | `/api/rooms/generate`   | Generate a new Room ID |
| GET    | `/api/rooms/{roomId}`   | Get room info          |
| GET    | `/api/rooms/health`     | Health check           |
| WS     | `/ws/signaling`         | WebRTC signaling       |

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| Camera/mic not working | Allow browser permissions when prompted. Use Chrome or Edge. |
| Port 8080 in use | Change `server.port` in `application.properties` |
| `mvn` not found | Use `mvnw` (Linux/Mac: `./mvnw spring-boot:run`, Windows: `mvnw.cmd spring-boot:run`) |
| No video from remote peer | Make sure both users are on the same network or use TURN server for cross-network calls |
| WebSocket not connecting | Ensure backend is running BEFORE joining a room |

---

## 📦 Tech Stack

**Backend:**
- Spring Boot 3.2
- Spring WebSocket
- Lombok
- Jackson JSON
- In-memory room management

**Frontend:**
- React 18
- React Router 6
- Vite 5
- WebRTC API (native browser)
- WebSocket API (native browser)

---

Built with ❤️ using Java Spring Boot + React
