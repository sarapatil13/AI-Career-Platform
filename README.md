# AI-Powered Career Platform

This repository implements a student-level portfolio project for an AI-powered career platform.

## Problem Statement

Students and early-career developers need a single workflow that can analyze a resume, recommend career directions, prepare targeted interview guidance, and estimate placement readiness. The project demonstrates a simple full-stack architecture that combines a Next.js frontend, an Express REST API, MongoDB persistence, Gemini-based feedback, and an educational ML prediction pipeline.

## Features

- User registration, login, JWT issuance, protected API routing, and Google OAuth login flow.
- Resume PDF upload and text extraction with pdf-parse.
- ATS-style resume analysis.
- Gemini-backed resume feedback and AI structured prompt output.
- Simple RAG-style interview preparation route using role and resume context.
- Career recommendation and guidance service.
- Educational ML prediction service for placement probability with Random Forest, XGBoost, and LightGBM-style pipeline design notes.
- Docker and environment-variable friendly configuration.

## Architecture

The frontend is a Next.js application that sends requests to the backend Express API. The backend exposes REST endpoints for authentication, resume analysis, interview preparation, career recommendations, career guidance, and placement prediction. The MongoDB data layer stores users. The Gemini API is used for resume analysis and guidance generation. The resume analysis and skill extraction service is separated from the Gemini service and authentication logic.

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

1. The user uploads a PDF through the frontend.
2. The server stores the upload and reads the PDF buffer.
3. pdf-parse extracts text.
4. ATS analysis reads the extracted text and returns a score, found skills, missing skills, and suggestions.
5. Gemini feedback is generated from the extracted text.

## RAG Flow

The interview preparation endpoint takes resume text, target role, optional company or technology, and a query. It gathers a lightweight retrieval context from predefined student-friendly career preparation topics and passes that context plus the prompt into the Gemini service. The selection is intentionally simple for an MVP portfolio project.

## ML Pipeline

The ML pipeline is intentionally educational and lightweight. There is a small sample feature set for a placement prediction pipeline:

- CGPA
- DSA score
- aptitude score
- number of projects
- internship experience
- technical skill score
- communication score

The service exposes a predict endpoint and keeps a design-level scaffold for Random Forest, XGBoost, LightGBM, and MLflow tracking. The actual artifacts may be generated later with a proper dataset.

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
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

API keys, OAuth credentials, and JWT secrets remain server-only environment settings and are never exposed to the frontend.

## Future Improvements

- Replace the handcrafted retrieval context with real vector search or a chunked document store.
- Add a real dataset and train Random Forest, XGBoost, and LightGBM models with MLflow tracking.
- Add persistence for resumes and analysis results.
- Move OAuth to a production-ready session model.
- Add better frontend state management for login and analysis results.

## Docker

A Docker Compose file is included for a simple local development setup. The backend and frontend each receive their own Dockerfile.
