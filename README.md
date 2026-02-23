# EcoAvatar — Riciclo Intelligente

**EcoAvatar** is an AI-powered web application that helps users sort their waste correctly. The user photographs an object through their device camera, the image is analysed by OpenAI's GPT-4o vision model to identify the material, and a virtual avatar (powered by D-ID) delivers the recycling instructions aloud through a generated video.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Environment Variables](#environment-variables)
6. [Installation & Setup](#installation--setup)
7. [How It Works](#how-it-works)
8. [API Routes](#api-routes)
9. [Frontend Workflow](#frontend-workflow)
10. [Configuration Files](#configuration-files)
11. [License](#license)

---

## Overview

EcoAvatar guides users through three simple steps:

1. **Snap a photo** — the webcam captures an image of the object to be recycled.
2. **AI analysis** — the image is sent to OpenAI GPT-4o, which identifies the object, its primary material, and the correct recycling bin (Plastica, Vetro, Carta, Organico, or Indifferenziata).
3. **Avatar response** — the AI's answer is forwarded to the D-ID Talks API, which generates a short video of a virtual avatar speaking the recycling instructions. The video is played back in a modal overlay.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                              │
│  index.ejs ──► Webcam.js captures image                      │
│       │                                                      │
│       ├─ POST /ask  (base64 image) ─────────────────── ───┐  │
│       │                                                   │  │
│       ├─ POST /generate-did-video  (text) ────────── ─┐   │  │
│       │                                               │   │  │
│       └─ GET  /talk-status/:talkId  (polling) ──  ┐   │   │  │
│                                                   │   │   │  │
└───────────────────────────────────────────────── ─┼───┼───┼──┘
                                                    │   │   │
┌───────────────────────────────────────────────── ─┼───┼───┼──┐
│                  Express Server (index.js)        │   │   │  │
│                                                   │   │   │  │
│   /ask ─────────► OpenAI GPT-4o (vision) ◄────────┼───┼───┘  │
│                       │ answer text               │   │      │
│                       ▼                           │   │      │
│   /generate-did-video ► D-ID Talks API ◄──────────┼───┘      │
│                       │ talkId                    │          │
│                       ▼                           │          │
│   /talk-status/:id ──► D-ID Status API ◄──────────┘          │
│                       │ result_url (video mp4)               │
│                       ▼                                      │
│               Response sent to client                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                                                         |
| ----------- | ------------------------------------------------------------------ |
| Runtime     | **Node.js**                                                        |
| Framework   | **Express 4**                                                      |
| Templating  | **EJS** (Embedded JavaScript)                                      |
| AI Vision   | **OpenAI GPT-4o** (via `openai` npm package)                       |
| Avatar      | **D-ID Talks API** (via REST calls with `axios`)                   |
| Webcam      | **WebcamJS** (client-side library)                                 |
| UI          | **Bootstrap 5**, **Font Awesome 6**, **Google Fonts (Poppins)**    |
| Dev tools   | **nodemon** (auto-restart), **Prettier** (formatting)              |

---

## Project Structure

```
BCC25/
├── index.js                        # Express server — all backend routes
├── package.json                    # NPM metadata and dependencies
├── .env                            # API keys (CHATGPT_KEY, DID_API_KEY, DID_AVATAR_ID)
├── .gitignore                      # Git ignore rules
├── .prettierrc                     # Prettier code-formatting config
│
├── templates/
│   └── index.ejs                   # Main HTML page (EJS template)
│
└── public/                         # Static files served at root URL
    └── assets/
        ├── api.json                # D-ID client-side configuration
        ├── style-agents.css        # CSS for WebRTC connection states
        ├── images/                 # (referenced) bg.png, alex_v2_idle_image.png
        └── scripts/
            └── chatbot.js          # Legacy D-ID WebRTC streaming client
```

### Key Files Explained

| File | Role |
| --- | --- |
| `index.js` | The single backend entry point. Configures Express middleware, serves the EJS template, and exposes three API routes (`/ask`, `/generate-did-video`, `/talk-status/:talkId`). It also contains a client-side helper function `speakWithDID()` (lines 184-252) that is referenced from the template. |
| `templates/index.ejs` | The full-page frontend: navbar, hero section, "How it Works" steps, camera section with WebcamJS, a Bootstrap modal for avatar video playback, and a "Where to throw it" info section. All client-side JavaScript (webcam init, snapshot, image resize, D-ID polling, modal management) is embedded inline. |
| `public/assets/api.json` | D-ID client configuration used by `chatbot.js`. Contains the D-ID API key, base URL, WebSocket URL, and service type (`clips`). |
| `public/assets/scripts/chatbot.js` | A standalone WebRTC-based streaming client for D-ID. It manages a live peer connection to D-ID's streaming API to deliver real-time avatar video. This module is **not used** by the current `index.ejs` template (which uses the simpler Talks/polling approach) but is kept as an alternative or legacy integration path. |
| `public/assets/style-agents.css` | CSS rules for visually representing WebRTC connection states (peer, ICE, signaling, streaming) with colour-coded labels. Used primarily with `chatbot.js`. |

---

## Environment Variables

The application requires a `.env` file in the project root with the following keys:

| Variable | Description |
| --- | --- |
| `CHATGPT_KEY` | OpenAI API key with access to the **GPT-4o** model. |
| `DID_API_KEY` | D-ID API key (Base64-encoded credentials) for the Talks endpoint. |
| `DID_AVATAR_ID` | D-ID avatar identifier. Defaults to `alex_v2` if not set. |

---

## Installation & Setup

### Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- An **OpenAI API key** with GPT-4o access
- A **D-ID API key** (free tier available at [d-id.com](https://www.d-id.com/))

### Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create or edit the `.env` file in the project root:

   ```env
   CHATGPT_KEY="sk-..."
   DID_API_KEY="your_did_api_key_here"
   DID_AVATAR_ID="alex_v2"
   ```

3. **Start the server**

   - Production:

     ```bash
     npm start
     ```

   - Development (auto-reload with nodemon):

     ```bash
     npm run dev
     ```

4. **Open the app**

   Navigate to `http://localhost:3000` in your browser. Allow camera access when prompted.

---

## How It Works

### 1. Image Capture

The frontend uses the **WebcamJS** library to access the device camera. When the user clicks **"Scatta Foto"**, a JPEG snapshot is taken and displayed as a preview. The image is stored as a base64-encoded data URI in the DOM.

### 2. Image Analysis (OpenAI GPT-4o)

When the user clicks **"Invia per Analisi"**:

1. The snapshot is resized client-side to a maximum width of 800px to reduce payload size.
2. The resized base64 image is sent via `POST /ask` to the Express backend.
3. The backend validates the image format (accepts JPEG, PNG, WebP) and forwards it to OpenAI's Chat Completions API using the **GPT-4o** model with a vision content block.
4. The system prompt instructs the model to:
   - Identify the main subject in the image
   - Determine its predominant material
   - Return the correct recycling bin: **PLASTICA**, **VETRO**, **CARTA**, **ORGANICO**, or **INDIFFERENZIATA**
   - Respond concisely and naturally (not in bullet points)
5. The model's answer is returned to the client as JSON.

### 3. Avatar Video Generation (D-ID)

Once the AI answer is received:

1. The frontend opens a Bootstrap modal and shows a loading spinner.
2. It sends the answer text to `POST /generate-did-video`.
3. The backend calls the **D-ID Talks API** with:
   - The answer text as a TTS script
   - A Microsoft Neural voice (`it-IT-ElsaNeural`) for Italian speech
   - The configured avatar ID
4. D-ID returns a `talkId`.
5. The frontend polls `GET /talk-status/:talkId` every 1.5 seconds (up to 20 retries) until the video is generated.
6. Once the `result_url` is available, the video is loaded into a `<video>` element inside the modal and played automatically.
7. After the video finishes, the modal closes after a 2-second delay.

---

## API Routes

### `GET /`

Renders the main page (`templates/index.ejs`).

---

### `POST /ask`

Analyses an image and returns recycling instructions.

**Request body:**

```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response (200):**

```json
{
  "answer": "Si tratta di una bottiglia in PET, va smaltita nella PLASTICA."
}
```

**Error responses:**

| Status | Condition |
| --- | --- |
| `400` | Missing `imageData`, invalid format, or unsupported image type |
| `500` | OpenAI API error |

---

### `POST /generate-did-video`

Requests D-ID to generate a talking avatar video.

**Request body:**

```json
{
  "text": "Si tratta di una bottiglia in PET, va smaltita nella PLASTICA."
}
```

**Response (200):**

```json
{
  "talkId": "tlk_abc123..."
}
```

---

### `GET /talk-status/:talkId`

Returns the current generation status of a D-ID talk video.

**Response (200):**

```json
{
  "status": "done",
  "result_url": "https://d-id-talks-prod.s3.us-west-2.amazonaws.com/..."
}
```

Possible `status` values: `created`, `started`, `done`, `error`.

---

## Frontend Workflow

The frontend is a single EJS template (`templates/index.ejs`) that contains:

| Section | Description |
| --- | --- |
| **Navbar** | Navigation links to Home, How it Works, Camera, and Recycling Bins sections. |
| **Hero** | Title and tagline for EcoAvatar. |
| **Steps** | Three-column layout explaining the Snap → Analyse → Recycle flow. |
| **Camera** | WebcamJS-powered live camera feed with "Scatta Foto" (take photo) and "Invia per Analisi" (submit) buttons. The snapshot preview appears below the camera. |
| **Avatar Modal** | A Bootstrap modal that opens when analysis begins. Shows a spinner while the D-ID video is being generated, then plays the avatar video. Automatically closes after playback. |
| **Bins** | Informational section showing common recycling bin categories (Carta, Vetro, Plastica). |
| **Footer** | Copyright notice. |

### Client-Side Functions

| Function | Purpose |
| --- | --- |
| `take_snapshot()` | Captures a JPEG frame from the webcam and displays it. |
| `resizeImage(img, maxWidth)` | Downscales the captured image to reduce upload size. Returns a base64 data URI. |
| `submitQuestion()` | Orchestrates the full flow: resize → send to `/ask` → open modal → call `speakWithDID()`. |
| `speakWithDID(message, modal, video)` | Sends the AI answer to `/generate-did-video`, polls for completion, then plays the resulting video in the modal. |
| `checkTalkStatus(talkId)` | Polls `GET /talk-status/:talkId` until the video URL is available or the retry limit is reached. |
| `resetModal()` | Resets the modal to its initial state (spinner visible, video hidden and unloaded). |

---

## Configuration Files

### `.prettierrc`

```json
{
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 120
}
```

Enforces consistent code formatting: single quotes, 2-space indentation, 120-character line width.

### `public/assets/api.json`

Client-side configuration for the D-ID WebRTC streaming module (`chatbot.js`). Contains the D-ID API key, base URL, WebSocket URL, and the service type. This file is only consumed by `chatbot.js` and is not used by the main application flow.

---

## License

This project is licensed under the **MIT License**.
