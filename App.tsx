import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { UploadZone } from './components/UploadZone';
import { NarrativeSite } from './components/NarrativeSite';
import { generateNarrative } from './lib/gemini';
import { NarrativeSite as NarrativeSiteType } from './types';
import { motion } from 'framer-motion';
import { 
  Loader2, 
  LogOut, 
  Sparkles, 
  FileText, 
  Globe, 
  Settings, 
  Info,
  ChevronRight,
  Database
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSite, setCurrentSite] = useState<NarrativeSiteType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState('Magazine Feature');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const siteId = params.get('id');

    if (siteId) {
      fetchSite(siteId);
    } else {
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsubscribe();
  }, []);

  const fetchSite = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'sites', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCurrentSite(docSnap.data() as NarrativeSiteType);
      } else {
        setError("Site not found.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load site.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (text: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const narrativeData = await generateNarrative(text);
      const siteId = nanoid(10);
      
      const newSite: NarrativeSiteType = {
        id: siteId,
        title: narrativeData.title || "Untitled Research",
        authors: narrativeData.authors || [],
        sections: narrativeData.sections || [],
        paperAbstract: narrativeData.paperAbstract,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous',
      };

      await setDoc(doc(db, 'sites', siteId), {
        ...newSite,
        serverCreatedAt: serverTimestamp()
      });

      setCurrentSite(newSite);
      window.history.pushState({}, '', `?id=${siteId}`);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate narrative. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setCurrentSite(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F8F4] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-nobel-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F4] text-stone-800 font-sans flex">
      
      {/* Streamlit-style Sidebar */}
      <aside className="w-80 bg-stone-100 border-r border-stone-200 h-screen sticky top-0 overflow-y-auto p-8 flex flex-col gap-8 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleBack}>
          <div className="w-10 h-10 bg-nobel-gold rounded-xl flex items-center justify-center text-white font-serif font-bold text-2xl pb-1 shadow-sm">φ</div>
          <h1 className="font-serif font-bold text-2xl tracking-tight text-stone-900">PhDMe</h1>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-3">
              <Info size={12} /> Status
            </div>
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-stone-900 truncate max-w-[140px]">{user.displayName}</span>
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest">Researcher</span>
                </div>
                <button onClick={() => signOut(auth)} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="w-full py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-all"
              >
                Sign In
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
              <Settings size={12} /> Configuration
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600">Narrative Tone</label>
              <select 
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-nobel-gold/20 focus:border-nobel-gold outline-none transition-all"
              >
                <option>Magazine Feature</option>
                <option>Academic Summary</option>
                <option>Creative Story</option>
                <option>Technical Deep-Dive</option>
              </select>
            </div>
          </div>
          
          {currentSite && (
            <button 
              onClick={handleBack}
              className="w-full py-3 border border-stone-300 text-stone-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
            >
              <ChevronRight size={14} className="rotate-180" /> New Narrative
            </button>
          )}
        </div>

        <div className="mt-auto pt-8 border-t border-stone-200">
          <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            <Database size={12} /> Environment
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Streamlit-Ready Architecture
          </div>
          <p className="mt-4 text-[10px] text-stone-400 leading-relaxed">
            This app is optimized for Streamlit deployment. Download the source to deploy on Streamlit Cloud.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {currentSite ? (
          <NarrativeSite data={currentSite} onBack={handleBack} hideNav={true} />
        ) : (
          <div className="p-12 lg:p-20 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <header className="mb-16">
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-nobel-gold/10 text-nobel-gold text-[10px] font-bold tracking-[0.2em] uppercase rounded-full">
                  <Sparkles size={12} /> AI-Powered Storytelling
                </div>
                <h2 className="font-serif text-5xl md:text-6xl text-stone-900 mb-6 leading-tight">
                  Reimagine Your <br/><span className="italic font-normal text-stone-500">Research.</span>
                </h2>
                <p className="text-lg text-stone-500 font-light max-w-2xl leading-relaxed">
                  Upload any research paper and our AI will transform it into an elegant, interactive experience. 
                  Designed for clarity, built for impact.
                </p>
              </header>

              <div className="space-y-12">
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                  <UploadZone onUpload={handleUpload} isProcessing={isProcessing} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-6 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-nobel-gold/10 transition-colors">
                      <FileText className="text-nobel-gold" size={20} />
                    </div>
                    <h4 className="font-serif text-lg text-stone-900 mb-2">All Formats</h4>
                    <p className="text-stone-500 text-xs leading-relaxed">PDF, DOCX, and TXT support. Direct text extraction.</p>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-nobel-gold/10 transition-colors">
                      <Sparkles className="text-nobel-gold" size={20} />
                    </div>
                    <h4 className="font-serif text-lg text-stone-900 mb-2">AI Narrative</h4>
                    <p className="text-stone-500 text-xs leading-relaxed">Gemini 3 Flash crafts a compelling story from your data.</p>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-nobel-gold/10 transition-colors">
                      <Globe className="text-nobel-gold" size={20} />
                    </div>
                    <h4 className="font-serif text-lg text-stone-900 mb-2">Instant Share</h4>
                    <p className="text-stone-500 text-xs leading-relaxed">Get a short URL to share your discovery with the world.</p>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-12 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-3"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  {error}
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
