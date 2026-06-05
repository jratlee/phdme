# φ PhDMe: Reimagining Research

**In plain English:** Ever try to read an academic paper and wish it was written like a cool magazine article instead? PhDMe takes boring, dense PDFs and uses AI to rewrite them into interactive, easy-to-read stories with quotes, metrics, and simple explanations.

---

> Upload a research paper and watch it transformed into an elegant, interactive narrative site.

PhDMe takes a dense PDF or Word document and uses Google's Gemini models to rewrite it as a
high-end, magazine-style story (think *Nature*, *Wired*, or *National Geographic*) with
accessible explanations, pull quotes, and metrics — all rendered in an elegant Streamlit app.

---

## Features

- AI narrative generation: Gemini reshapes papers into reader-friendly sections.
- Document parsing: accepts PDF, DOCX, and TXT uploads, extracted in-session.
- Tone control: Magazine Feature, Academic Summary, Creative Story, or Technical Deep-Dive.
- Privacy-first: your API key and document are used only for the current session.
- Production-ready: pinned dependencies, upload size limits, and safe error handling.

---

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| App      | Streamlit (Python 3.11)             |
| AI       | `google-genai` (Google Gemini)      |
| Parsing  | `pypdf`, `docx2txt`                 |
| Config   | `python-dotenv`, `st.secrets`       |

---

## Run Locally

A single Python interface lives in [`streamlit_app.py`](streamlit_app.py).

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Provide a Gemini key. The app resolves it from `st.secrets` first, then environment
   variables, checking `GOOGLE_API_KEY`, then `GENAI_API_KEY`, then `GEMINI_API_KEY`. You can:
   - Export an env var: `export GOOGLE_API_KEY=your_api_key_here`, or
   - Copy [`.streamlit/secrets.toml.example`](.streamlit/secrets.toml.example) to
     `.streamlit/secrets.toml` and fill in your key, or
   - Paste it into the sidebar at runtime.
3. Launch the app:
   ```bash
   streamlit run streamlit_app.py
   ```

### Deploy to Streamlit Community Cloud

1. Push this repo to GitHub.
2. On [share.streamlit.io](https://share.streamlit.io), create an app pointing to
   `streamlit_app.py` on your branch.
3. In App, go to Settings, then Secrets, and add your key in TOML format. Do not upload
   `secrets.toml`:
   ```toml
   GOOGLE_API_KEY = "your_api_key_here"
   ```
4. Deploy. The theme/server defaults come from [`.streamlit/config.toml`](.streamlit/config.toml).

> `.streamlit/secrets.toml` is git-ignored. Only the `.example` template is committed.

---

## Project Structure

```
streamlit_app.py              # The Streamlit application (UI + parsing + Gemini)
requirements.txt              # Pinned Python dependencies
.streamlit/
  config.toml                 # Theme + production server settings (committed)
  secrets.toml.example        # Template for local secrets (committed)
.github/workflows/ci.yml      # Lint + syntax check on every push/PR
```

---

## Environment Variables & Secrets

| Variable                                          | Purpose                          |
| ------------------------------------------------- | -------------------------------- |
| `GOOGLE_API_KEY` / `GENAI_API_KEY` / `GEMINI_API_KEY` | Gemini API access (first found) |

The app resolves the key from `st.secrets` first, then environment variables, then the
sidebar input. Provide it in **one** of these ways:

- Export an env var: `export GOOGLE_API_KEY=your_api_key_here`, or
- Copy [`.streamlit/secrets.toml.example`](.streamlit/secrets.toml.example) to
  `.streamlit/secrets.toml` and fill in your key, or
- Paste it into the sidebar at runtime.

> Never commit secrets. `.env*` and `.streamlit/secrets.toml` are git-ignored
> (only the `.example` templates are committed). The key is used only for live requests
> and is never written to disk, logged, or retained after your session ends.

### Production hardening

This deployment ships with sensible defaults baked in:

- **Pinned dependencies** in `requirements.txt` for reproducible builds.
- **Upload limits** — 15 MB cap enforced both in the app and via `maxUploadSize`.
- **CORS + XSRF protection** enabled in `.streamlit/config.toml`.
- **No leaked tracebacks** — `showErrorDetails = false`; errors are logged, not shown to users.
- **Safe parsing** — encrypted/corrupt files and oversized prompts are handled gracefully.

---

## License & Attribution

© 2026 False Dawn Industries. PhDMe is a creation of False Dawn Industries.
This project is provided under the MIT License and retains required attribution for any third-party
MIT-licensed components.

See [LICENSE](LICENSE) for the full text.

> Privacy: the Streamlit app uses your Gemini API key only to make requests during your active
> session. It is never written to disk, logged, or retained after the session ends.
