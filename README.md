<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# φ PhDMe — Reimagining Research

> Upload a research paper and watch it transformed into an elegant, interactive narrative site.

PhDMe takes a dense PDF or Word document and uses Google's Gemini models to rewrite it as a
high-end, magazine-style story (think *Nature*, *Wired*, or *National Geographic*) — complete with
accessible explanations, pull quotes, metrics, and visual diagrams. Generated sites can be saved,
shared via a permalink, and revisited later.

🔗 **View in AI Studio:** https://ai.studio/apps/709d0739-58ff-4276-b71d-5e278134952d

---

## ✨ Features

- **AI narrative generation** — Gemini reshapes papers into 5–8 reader-friendly sections.
- **Rich document parsing** — Accepts PDF (`pdfjs-dist`) and DOCX (`mammoth`) uploads.
- **Interactive visuals** — 3D scenes (`react-three-fiber` / `drei`) and animated diagrams.
- **Shareable sites** — Each generated narrative gets a short ID and a persistent URL.
- **Auth & storage** — Google sign-in and Firestore persistence via Firebase.
- **Two ways to run** — A React + Vite single-page app, plus a lightweight Streamlit prototype.

---

## 🧱 Tech Stack

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Web frontend     | React 19, TypeScript, Vite 6, Framer Motion, Tailwind   |
| 3D / visuals     | three.js, @react-three/fiber, @react-three/drei         |
| AI               | `@google/genai` (Gemini) / `google-generativeai` (Py)   |
| Backend services | Firebase Auth + Firestore                               |
| Parsing          | `pdfjs-dist`, `mammoth` (web) · `pypdf`, `docx2txt` (py) |
| Prototype app    | Streamlit (Python)                                      |

---

## 🚀 Run Locally (React app)

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ and a [Gemini API key](https://aistudio.google.com/apikey).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file in the project root and add your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
   > The app reads this via Vite (`process.env.GEMINI_API_KEY` / `process.env.API_KEY`).
3. Configure Firebase in [`lib/firebase.ts`](lib/firebase.ts) (project credentials, Auth, and
   Firestore). See [`firestore.rules`](firestore.rules) for the security rules.
4. Start the dev server (runs on [http://localhost:3000](http://localhost:3000)):
   ```bash
   npm run dev
   ```

### Build & preview

```bash
npm run build     # production build to ./dist
npm run preview   # serve the production build locally
```

---

## 🐍 Run the Streamlit Prototype (optional)

A simpler Python interface lives in [`streamlit_app.py`](streamlit_app.py).

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Provide a Gemini key. The app resolves it from `st.secrets` first, then environment
   variables, checking `GOOGLE_API_KEY` → `GENAI_API_KEY` → `GEMINI_API_KEY`. Either:
   - Export an env var: `export GOOGLE_API_KEY=your_api_key_here`, **or**
   - Copy [`.streamlit/secrets.toml.example`](.streamlit/secrets.toml.example) to
     `.streamlit/secrets.toml` and fill in your key.
   - (You can also paste it into the sidebar at runtime.)
3. Launch the app:
   ```bash
   streamlit run streamlit_app.py
   ```

### ☁️ Deploy to Streamlit Community Cloud

1. Push this repo to GitHub.
2. On [share.streamlit.io](https://share.streamlit.io), create an app pointing to
   `streamlit_app.py` on your branch.
3. In **App → Settings → Secrets**, add your key (TOML format — do **not** upload
   `secrets.toml`):
   ```toml
   GOOGLE_API_KEY = "your_api_key_here"
   ```
4. Deploy. The theme/server defaults come from [`.streamlit/config.toml`](.streamlit/config.toml).

> `.streamlit/secrets.toml` is git-ignored. Only the `.example` template is committed.

---

## 📁 Project Structure

```
App.tsx                # React app entry & main flow (auth, upload, render)
index.tsx / index.html # Vite entry point
streamlit_app.py       # Standalone Streamlit prototype
components/
  UploadZone.tsx       # File drop + parsing (PDF/DOCX)
  NarrativeSite.tsx    # Renders the generated narrative
  Diagrams.tsx         # Diagram visualizations
  QuantumScene.tsx     # 3D scene (react-three-fiber)
lib/
  firebase.ts          # Firebase init, Auth & Firestore
  gemini.ts            # Gemini prompt + structured JSON generation
types.ts               # Shared TypeScript types
firestore.rules        # Firestore security rules
```

---

## 🔐 Environment Variables

| Variable                          | Used by      | Purpose                          |
| --------------------------------- | ------------ | -------------------------------- |
| `GEMINI_API_KEY`                  | React (Vite) | Gemini API access                |
| `GOOGLE_API_KEY` / `GENAI_API_KEY`| Streamlit    | Gemini API access (first found)  |

Copy [`.env.example`](.env.example) to `.env` (or `.env.local`) and fill in your keys.

> **Never commit secrets.** `.env` / `.env.*` are git-ignored (except `.env.example`).
> Your **Gemini API key** is a secret — keep it out of source control.

### Firebase configuration & security

`firebase-applet-config.json` holds the **web** Firebase config (project ID, web API key,
auth domain). Per [Firebase docs](https://firebase.google.com/docs/projects/api-keys), the web
API key is **not a secret** — it identifies the project and is meant to ship in client code.
Your data is protected by **Firestore Security Rules**, not by hiding this key.

To keep the project secure, make sure you:

- [ ] Keep [`firestore.rules`](firestore.rules) deployed (writes require auth + ownership; reads
      on `sites` are intentionally public for share links).
- [ ] Add **API key restrictions** in Google Cloud Console (restrict to your domains / referrers).
- [ ] Add your production domain to **Firebase Auth → Authorized domains**.
- [ ] Treat the **Gemini API key** as a true secret (never expose it client-side in production —
      proxy AI calls through a backend if you deploy publicly).

---

## 📄 License

See [LICENSE](LICENSE).
