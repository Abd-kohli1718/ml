# VoiceHealth 🎙️🩺

A full-stack application that leverages machine learning to track your health through vocal biomarkers. By analyzing acoustic features in your voice (such as pitch, energy, speech rate, and MFCCs), VoiceHealth can detect anomalies that may indicate fatigue, respiratory issues, or other underlying health conditions.

![VoiceHealth UI App Demo](https://ml-t5te.vercel.app/favicon.svg)

## 🌟 Features

- **Voice Recording:** Record your voice directly in the browser (supports desktop and mobile).
- **ML Audio Analysis:** Extracts key vocal features using `librosa` and compares them against a baseline using z-score anomaly detection.
- **Health Insights:** Translates complex acoustic deviations into simple, easy-to-understand health observations and a 0-100 Health Score.
- **History & Tracking:** Beautiful notebook-style UI to visualize your past recordings, complete with audio playback.
- **Calendar & Analytics:** Track your voice health trends over time with dynamic donut and line charts.
- **PWA Support:** Installable on mobile devices via "Add to Home Screen" for native-like access.

## 🏗️ Architecture Stack

- **Frontend:** React, Vite, React Router, custom CSS styling (Deployed on **Vercel**).
- **Backend:** Python, FastAPI, Librosa, NumPy (Deployed on **Render**).
- **Database & Auth:** Supabase (PostgreSQL, Storage Buckets, Google SSO Auth).

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A Supabase Project

### 1. Clone the repository
```bash
git clone https://github.com/Abd-kohli1718/ByteConqueror_AtharvaKadam.git
cd ByteConqueror_AtharvaKadam
```

### 2. Setup the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r ../requirements.txt
```
Create a `.env` file in the `backend` directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```
Run the FastAPI server:
```bash
python run.py
```

### 3. Setup the Frontend
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Run the Vite development server:
```bash
npm run dev
```

## 🧠 How the ML Pipeline Works

1. **Feature Extraction:** Audio is converted to `.wav` and processed by `librosa`. We extract ~18 features: 13 MFCCs, pitch metrics, energy metrics, zero-crossing rate, speech rate, and pause durations.
2. **Baseline Comparison:** The extracted feature vector is compared against a pre-computed baseline profile (`baseline.pkl`) of normal speech.
3. **Anomaly Detection:** We calculate the z-score for each feature. If features deviate heavily from the baseline, it flags an anomaly.
4. **Clinical Interpretation:** Technical feature names (e.g., "high pitch_std") are mapped to human-readable insights (e.g., "voice instability or tremor") via a rule-based engine.

## 🔒 Security
- Authentication is handled exclusively through Supabase Google SSO.
- The backend features custom JWT decoding using the ES256 algorithm to secure protected routes and ensure users can only access their own data.
- Audio files are stored securely in robust Supabase storage policies.

---
*Built for the ByteConqueror Hackathon by Atharva Kadam.*
