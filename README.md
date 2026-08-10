# AI-Powered Career Platform

This repository implements a student-level portfolio project for an AI-powered career platform.

## Problem Statement

Students and early-career developers need a single workflow that can analyze a resume, recommend career directions, prepare targeted interview guidance, and estimate placement readiness. The project demonstrates a simple full-stack architecture that combines a Next.js frontend, an Express REST API, MongoDB persistence, Gemini-based feedback, and an educational ML prediction pipeline.

## Features

- User registration, login, JWT issuance, protected API routing, and Google OAuth login flow.
- Resume PDF and DOCX upload with text extraction (pdf-parse + mammoth).
- Rule-based ATS-style resume analysis (skill matching against a curated skill list).
- Gemini-backed AI resume feedback.
- Interview preparation route that uses resume and role context with a lightweight static retrieval context (not vector search).
- Heuristic career recommendations plus Gemini-generated career guidance.
- Placement prediction via a deterministic heuristic demo rule (not a trained model), alongside a documented Random Forest / XGBoost / LightGBM design scaffold for a future Python pipeline.
- Docker and environment-variable friendly configuration.

## Architecture

The frontend is a Next.js application that sends requests to the backend Express API. The backend exposes REST endpoints for authentication, resume analysis, interview preparation, career recommendations, career guidance, and placement prediction. The MongoDB data layer stores users. The Gemini API is used for resume feedback, career guidance, and interview preparation. ATS scoring, career fit scores, and placement prediction are rule-based/heuristic and are not AI/ML.

## Technology Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Express.js, REST APIs, JWT
- Database: MongoDB via Mongoose
- AI: Gemini API with structured prompts
- ML: Python-based educational pipeline design with scikit-learn, Random Forest, XGBoost, LightGBM, and MLflow-friendly documentation
- Infrastructure: Docker and Docker Compose

## Project Structure

```text
AI-Career-Platform/
  client/
  server/
  README.md
```

## Authentication Flow

1. Users register through the /api/auth/register endpoint.
2. Users log in through the /api/auth/login endpoint.
3. The server issues a JWT signed with the JWT secret.
4. The frontend stores the token in localStorage and sends it to protected routes with the Authorization header.
5. The Google OAuth starter route uses the Google authorization URL and exchanges the code for a profile through the Google token endpoint.

## Resume Analysis Flow

1. The user uploads a PDF or DOCX through the frontend.
2. The server stores the upload and reads the file buffer.
3. pdf-parse (PDF) or mammoth (DOCX) extracts text.
4. ATS analysis reads the extracted text and returns a score, found skills, missing skills, and suggestions. This is a deterministic, rule-based matching step, not an AI/ML model.
5. Gemini feedback is generated from the extracted text.

## RAG Flow

The interview preparation endpoint takes resume text, target role, optional company or technology, and a query. It gathers a lightweight retrieval context from predefined student-friendly career preparation topics and passes that context plus the prompt into the Gemini service. The retrieval step is a fixed static list for an MVP portfolio project; it is not real vector search or embedding-based retrieval.

## ML Pipeline

The ML pipeline is intentionally educational and explicitly NOT a trained model. The predict endpoint applies a deterministic heuristic rule (`0.72 + (cgpa - 6) * 0.03`) and is labeled as such in its response. The train endpoint only prepares a small sample dataset and documents the intended Random Forest, XGBoost, and LightGBM pipeline for a future Python-based implementation. MLflow tracking is a design note only.

## MLflow Usage

MLflow is represented as a documentation-friendly, MVP-style tracking surface. The training metadata is prepared in the service layer. A real production-ready implementation would store run parameters, metrics, and artifact metadata inside an MLflow server or tracking URI.

## API Endpoints

### Auth

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/google
- GET /api/auth/google/callback
- GET /api/auth/me

### Resume

- POST /api/resume/upload
- POST /api/resume/analyze

### Interview

- POST /api/interview/prepare

### Career

- POST /api/career/recommend
- POST /api/career/guidance

### ML

- POST /api/ml/predict
- GET /api/ml/train

## How to Run Locally

1. Install dependencies in the client and server folders.
2. Create environment variables in the server .env file.
3. Start MongoDB.
4. Start the backend:

```bash
cd server
npm run dev
```

5. Start the frontend:

```bash
cd client
npm run dev
```

6. Open the UI at http://localhost:3000.

## Environment Variables

The backend should define these environment variables:

```env
PORT=5000
MONGO_URI=mongodb://your-connection-string
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-google-gemini-key
GEMINI_MODEL=gemini-3.6-flash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:3000
```

`GEMINI_MODEL` is optional; it defaults to `gemini-3.6-flash`. `CLIENT_URL` is where the OAuth callback redirects the browser after a successful or failed Google login. The frontend reads `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:5000/api`) to locate the backend.

API keys, OAuth credentials, and JWT secrets remain server-only environment settings and are never exposed to the frontend.

## Future Improvements

- Replace the handcrafted retrieval context with real vector search or a chunked document store.
- Add a real dataset and train Random Forest, XGBoost, and LightGBM models with MLflow tracking.
- Add persistence for resumes and analysis results.
- Move OAuth to a production-ready session model.
- Add better frontend state management for login and analysis results.

## Docker

A Docker Compose file is included for a simple local development setup. The backend and frontend each receive their own Dockerfile.
