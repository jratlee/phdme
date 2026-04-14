import streamlit as st
import google.generativeai as genai
import os
from io import BytesIO
import docx2txt
from pypdf import PdfReader
import json

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
    
    api_key = st.text_input("Gemini API Key", type="password", help="Get your key at https://aistudio.google.com/app/apikey")
    if api_key:
        genai.configure(api_key=api_key)
    
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

def generate_narrative(text, tone):
    model = genai.GenerativeModel('gemini-1.5-flash')
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
    
    response = model.generate_content(prompt)
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
    if not api_key:
        st.warning("Please enter your Gemini API Key in the sidebar to proceed.")
    else:
        if st.button("Generate Narrative"):
            with st.spinner("Analyzing paper and crafting your story..."):
                text = extract_text(uploaded_file)
                if text:
                    narrative = generate_narrative(text, narrative_tone)
                    if narrative:
                        st.session_state.narrative = narrative
                        st.success("Narrative generated!")
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
