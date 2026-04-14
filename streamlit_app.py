import streamlit as st
import google.generativeai as genai
import os
from io import BytesIO
import docx2txt
from pypdf import PdfReader
import json

# --- Gemini API Key ---
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GENAI_API_KEY")
api_configured = False
if api_key:
    genai.configure(api_key=api_key)
    api_configured = True

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

# --- Sidebar ---
with st.sidebar:
    st.title("φ PhDMe")
    st.markdown("---")
    st.info("Upload a research paper and we'll transform it into an elegant narrative.")

    provider = st.selectbox("AI Provider", ["Google Gemini"])
    api_key_input = st.text_input(
        "AI API Key",
        type="password",
        help="Enter your Google Gemini API key. For Gemini, get a key from https://aistudio.google.com/app/apikey.",
    )
    if api_key_input:
        genai.configure(api_key=api_key_input)
        api_key = api_key_input
        api_configured = True

    model_choice = None
    supported_models = []
    if api_configured:
        supported_models = get_supported_models()
        if supported_models:
            default_index = supported_models.index("models/gemini-1.5-flash") if "models/gemini-1.5-flash" in supported_models else 0
            model_choice = st.selectbox("AI Model", supported_models, index=default_index)
            st.success("AI API key configured. Select a model for generation.")
        else:
            st.warning("AI API key is configured, but no supported generation models were found.")
    else:
        st.warning("Enter a Google Gemini API key or set GOOGLE_API_KEY/GENAI_API_KEY.")

    st.markdown("---")
    st.markdown("### Settings")
    narrative_tone = st.selectbox("Narrative Tone", ["Magazine Feature", "Academic Summary", "Creative Story", "Technical Deep-Dive"])
    
    st.markdown("---")
    st.caption("PhDMe • 2026")

# --- Helper Functions ---
def extract_text(uploaded_file):
    if uploaded_file.type == "application/pdf":
        reader = PdfReader(uploaded_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    elif uploaded_file.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return docx2txt.process(uploaded_file)
    elif uploaded_file.type == "text/plain":
        return str(uploaded_file.read(), "utf-8")
    else:
        return None


def get_supported_models():
    try:
        models = []
        for model in genai.list_models(page_size=100):
            supported = getattr(model, "supported_generation_methods", [])
            if "generateContent" in supported or "generate_content" in supported:
                models.append(model.name)
        return models
    except Exception as e:
        st.error(f"Could not list available models: {e}")
        return []


def generate_narrative(text, tone, model_name):
    model = genai.GenerativeModel(model_name)
    prompt = f"""
    You are an expert science communicator. Transform this research paper into an elegant narrative with a '{tone}' tone.
    
    Paper Text:
    {text[:30000]}
    
    Return a JSON object with:
    - title: A compelling title.
    - authors: List of authors.
    - abstract: A brief summary.
    - sections: List of objects with {{'title': str, 'content': str, 'type': 'text'|'metric'|'quote', 'visualData': dict}}.
    """
    
    try:
        response = model.generate_content(prompt)
    except Exception as e:
        st.error(f"AI generation failed: {e}")
        return None

    try:
        # Clean response if it contains markdown code blocks
        content = response.text.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        return json.loads(content)
    except Exception as e:
        st.error(f"Failed to parse AI response: {e}")
        return None

# --- Main UI ---
st.title("Reimagine Your Research")
st.subheader("Turn dense papers into interactive stories.")

uploaded_file = st.file_uploader("Choose a file (PDF, DOCX, TXT)", type=["pdf", "docx", "txt"])

if uploaded_file is not None:
    if not api_configured:
        st.warning("Please enter your Gemini API key above or set GOOGLE_API_KEY/GENAI_API_KEY in the environment.")
    else:
        if st.button("Generate Narrative"):
            with st.spinner("Analyzing paper and crafting your story..."):
                text = extract_text(uploaded_file)
                if text:
                    if model_choice:
                        narrative = generate_narrative(text, narrative_tone, model_choice)
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
            st.markdown(f"### {section['title']}")
            
            if section['type'] == 'quote':
                st.markdown(f"> *{section['content']}*")
            elif section['type'] == 'metric':
                col1, col2 = st.columns([2, 1])
                with col1:
                    st.write(section['content'])
                with col2:
                    data = section.get('visualData', {})
                    st.metric(label=data.get('label', 'Metric'), value=f"{data.get('value', '')} {data.get('unit', '')}")
            else:
                st.write(section['content'])
            
            st.markdown("---")

    # Share Button (Streamlit specific)
    st.button("Share Link", on_click=lambda: st.toast("Copy the URL from your browser to share!"))
