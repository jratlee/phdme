import streamlit as st
from google import genai
from google.genai import types
import os
import re
from io import BytesIO
import docx2txt
from pypdf import PdfReader
import json

try:
    from dotenv import load_dotenv

    load_dotenv()  # load a local .env file if present (no-op otherwise)
except ImportError:
    # python-dotenv is optional; the app still works with real env vars.
    pass


def make_client(key):
    """Create a google-genai Client, returning None on failure."""
    if not key:
        return None
    try:
        return genai.Client(api_key=key)
    except Exception as e:
        st.error(f"Could not initialize the Gemini client: {e}")
        return None


def get_secret(*names):
    """Return the first key found in st.secrets, then in environment variables.

    st.secrets is used for Streamlit Cloud deployments (.streamlit/secrets.toml),
    while environment variables / .env support local runs.
    """
    for name in names:
        try:
            if name in st.secrets:
                return st.secrets[name]
        except Exception:
            # st.secrets raises if no secrets file exists; fall back to env vars.
            pass
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


# --- Gemini API Key ---
api_key = get_secret("GOOGLE_API_KEY", "GENAI_API_KEY", "GEMINI_API_KEY")
client = make_client(api_key)
api_configured = client is not None

if "supported_models" not in st.session_state:
    st.session_state.supported_models = []
if "model_choice" not in st.session_state:
    st.session_state.model_choice = None

# --- Page Config ---
st.set_page_config(
    page_title="PhDMe | Reimagining Research",
    page_icon="φ",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- Styling ---
st.markdown("""
    <style>
    .main {
        background-color: #F9F8F4;
    }
    .stButton>button {
        width: 100%;
        border-radius: 20px;
        height: 3em;
        background-color: #C5A059;
        color: white;
        border: none;
    }
    .stButton>button:hover {
        background-color: #B48F48;
        color: white;
    }
    .reportview-container .main .block-container {
        padding-top: 2rem;
    }
    h1, h2, h3 {
        font-family: 'Playfair Display', serif;
    }
    .narrative-section {
        background-color: white;
        padding: 2rem;
        border-radius: 15px;
        border: 1px solid #E5E7EB;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #F3F4F6;
        padding: 1.5rem;
        border-radius: 10px;
        border-left: 5px solid #C5A059;
    }
    </style>
    """, unsafe_allow_html=True)

# --- Helper Functions ---
def extract_text(uploaded_file):
    """Extract plain text from an uploaded PDF, DOCX, or TXT file."""
    file_type = uploaded_file.type
    name = (uploaded_file.name or "").lower()

    try:
        if file_type == "application/pdf" or name.endswith(".pdf"):
            reader = PdfReader(uploaded_file)
            pages = [(page.extract_text() or "") for page in reader.pages]
            return "\n".join(pages).strip() or None

        if (
            file_type
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            or name.endswith(".docx")
        ):
            # docx2txt needs a file path or a seekable file-like object.
            uploaded_file.seek(0)
            return docx2txt.process(BytesIO(uploaded_file.read())) or None

        if file_type == "text/plain" or name.endswith(".txt"):
            uploaded_file.seek(0)
            return uploaded_file.read().decode("utf-8", errors="replace") or None
    except Exception as e:  # surface parsing errors instead of crashing
        st.error(f"Failed to read the file: {e}")
        return None

    return None


def get_supported_models(client):
    """Return model names that support content generation."""
    if client is None:
        return []
    try:
        models = []
        for model in client.models.list():
            actions = getattr(model, "supported_actions", None) or []
            # Some models omit supported_actions; assume they can generate.
            if not actions or "generateContent" in actions:
                if model.name:
                    models.append(model.name)
        return models
    except Exception as e:
        st.error(f"Could not list available models: {e}")
        return []


def _parse_json_response(raw):
    """Best-effort extraction of a JSON object from a model response."""
    if not raw:
        return None
    content = raw.strip()

    # Strip ```json ... ``` or ``` ... ``` fences if present.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", content, re.DOTALL)
    if fence:
        content = fence.group(1).strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Fall back to the first {...} block found in the text.
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
    return None


def generate_narrative(client, text, tone, model_name):
    if client is None:
        st.error("Gemini client is not configured.")
        return None

    prompt = f"""
    You are an expert science communicator. Transform this research paper into an elegant narrative with a '{tone}' tone.

    Paper Text:
    {text[:30000]}

    Return ONLY a JSON object (no prose, no markdown) with:
    - title: A compelling title.
    - authors: List of authors.
    - abstract: A brief summary.
    - sections: List of objects with {{"title": str, "content": str, "type": "text"|"metric"|"quote", "visualData": dict}}.
    """

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
    except Exception as e:
        st.error(f"AI generation failed: {e}")
        return None

    narrative = _parse_json_response(getattr(response, "text", None))
    if narrative is None:
        st.error("Failed to parse the AI response as JSON. Try again or pick a different model.")
    return narrative

# --- Sidebar ---
with st.sidebar:
    st.title("φ PhDMe")
    st.markdown("---")
    st.info("Upload a research paper and we'll transform it into an elegant narrative.")

    provider = st.selectbox("AI Provider", ["Google Gemini"])
    api_key_input = st.text_input(
        "AI API Key",
        type="password",
        help="Enter your Google Gemini API key. Get one at https://aistudio.google.com/apikey.",
    )
    st.caption(
        "🔒 Your API key is used only to make requests during this browser session. "
        "It is **never** written to disk, logged, or stored after the session ends."
    )

    # Use the typed key for this run only; never persist it in session_state.
    if api_key_input:
        client = make_client(api_key_input)
        api_key = api_key_input
        api_configured = client is not None

    if api_configured:
        st.session_state.supported_models = get_supported_models(client)
        if st.session_state.supported_models:
            if st.session_state.model_choice not in st.session_state.supported_models:
                preferred = next(
                    (m for m in st.session_state.supported_models if "flash" in m.lower()),
                    None,
                )
                default_index = (
                    st.session_state.supported_models.index(preferred) if preferred else 0
                )
                st.session_state.model_choice = st.session_state.supported_models[default_index]

            st.session_state.model_choice = st.selectbox(
                "AI Model",
                st.session_state.supported_models,
                index=st.session_state.supported_models.index(st.session_state.model_choice),
            )
            st.success("AI API key configured. Select a model for generation.")
        else:
            st.session_state.model_choice = None
            st.warning("AI API key is configured, but no supported generation models were found.")
    else:
        st.session_state.supported_models = []
        st.session_state.model_choice = None
        st.warning("Enter a Google Gemini API key or set GOOGLE_API_KEY/GENAI_API_KEY.")

    st.markdown("---")
    st.markdown("### Settings")
    narrative_tone = st.selectbox("Narrative Tone", ["Magazine Feature", "Academic Summary", "Creative Story", "Technical Deep-Dive"])
    
    st.markdown("---")
    st.markdown(
        "[📖 Read the docs](https://github.com/jratlee/phdme/blob/main/README.md)"
    )
    st.caption("PhDMe • © 2026 False Dawn Industries")

# --- Main UI ---
st.title("Reimagine Your Research")
st.subheader("Turn dense papers into interactive stories.")

with st.expander("ℹ️ How it works", expanded=False):
    st.markdown(
        """
        **PhDMe** transforms a dense research paper into an elegant, magazine-style narrative.

        1. **Add your Gemini API key** in the sidebar (or set it via secrets / environment).
        2. **Upload** a `PDF`, `DOCX`, or `TXT` file. Text is extracted locally in your browser session.
        3. **Pick a tone** and click **Generate Narrative**. The text is sent to Google Gemini,
           which returns a structured story (title, abstract, and sections).
        4. **Read & share** the rendered narrative.

        🔒 **Privacy:** Your API key and uploaded document are processed only for the current
        session. Nothing is written to disk, logged, or retained after your session ends.

        📖 Full documentation, deployment steps, and source:
        [README on GitHub](https://github.com/jratlee/phdme/blob/main/README.md).
        """
    )

uploaded_file = st.file_uploader("Choose a file (PDF, DOCX, TXT)", type=["pdf", "docx", "txt"])

generate_disabled = not api_configured or not st.session_state.supported_models
if uploaded_file is not None:
    if not api_configured:
        st.warning("Please enter your Gemini API key above or set GOOGLE_API_KEY/GENAI_API_KEY in the environment.")
    elif not st.session_state.supported_models:
        st.warning("Your API key is valid, but no compatible Gemini models were found.")
    else:
        if st.button("Generate Narrative", disabled=generate_disabled):
            with st.spinner("Analyzing paper and crafting your story..."):
                text = extract_text(uploaded_file)
                if text:
                    if st.session_state.model_choice:
                        narrative = generate_narrative(
                            client, text, narrative_tone, st.session_state.model_choice
                        )
                        if narrative:
                            st.session_state.narrative = narrative
                            st.success("Narrative generated!")
                    else:
                        st.error("No compatible model selected. Check your API key and model list.")
                else:
                    st.error("Could not extract text from the file.")

# --- Display Narrative ---
if "narrative" in st.session_state:
    n = st.session_state.narrative
    
    st.markdown("---")
    st.header(n.get('title', 'Untitled Narrative'))
    st.write(f"*By {', '.join(n.get('authors', []))}*")
    
    st.info(n.get('abstract', ''))
    
    for section in n.get('sections', []):
        with st.container():
            st.markdown(f"### {section.get('title', 'Untitled Section')}")

            section_type = section.get('type', 'text')
            content = section.get('content', '')

            if section_type == 'quote':
                st.markdown(f"> *{content}*")
            elif section_type == 'metric':
                col1, col2 = st.columns([2, 1])
                with col1:
                    st.write(content)
                with col2:
                    data = section.get('visualData') or {}
                    st.metric(
                        label=data.get('label', 'Metric'),
                        value=f"{data.get('value', '')} {data.get('unit', '')}".strip(),
                    )
            else:
                st.write(content)

            st.markdown("---")

    # Share Button (Streamlit specific)
    st.button("Share Link", on_click=lambda: st.toast("Copy the URL from your browser to share!"))

# --- Footer / Attribution ---
st.markdown("---")
st.caption(
    "© 2026 False Dawn Industries. PhDMe is a creation of "
    "False Dawn Industries. This project is provided under the MIT License and retains "
    "required attribution for any third-party MIT-licensed components. "
    "[Documentation](https://github.com/jratlee/phdme/blob/main/README.md)"
)
