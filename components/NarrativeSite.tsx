import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, BookOpen, Quote, BarChart3, Share2, Home } from 'lucide-react';
import { NarrativeSite as NarrativeSiteType } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NarrativeSiteProps {
  data: NarrativeSiteType;
  onBack?: () => void;
  hideNav?: boolean;
}

export const NarrativeSite: React.FC<NarrativeSiteProps> = ({ data, onBack, hideNav }) => {
  const shareUrl = `${window.location.origin}/?id=${data.id}`;

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#F9F8F4] text-stone-800 selection:bg-nobel-gold selection:text-white font-sans">
      {/* Navigation */}
      {!hideNav && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F9F8F4]/80 backdrop-blur-md border-bottom border-stone-100 py-4">
          <div className="container mx-auto px-6 flex justify-between items-center">
            <div className="flex items-center gap-4 cursor-pointer" onClick={onBack}>
              <div className="w-8 h-8 bg-nobel-gold rounded-full flex items-center justify-center text-white font-serif font-bold text-xl pb-1">φ</div>
              <span className="font-serif font-bold text-lg tracking-wide">PhDMe</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all text-sm font-medium"
              >
                <Share2 size={16} /> Share
              </button>
              <button 
                onClick={onBack}
                className="p-2 text-stone-500 hover:text-stone-900 transition-colors"
              >
                <Home size={20} />
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Hero */}
      <header className={cn(
        "relative flex items-center justify-center overflow-hidden",
        hideNav ? "pt-12 pb-20" : "min-h-screen pt-20"
      )}>
        <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nobel-gold rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-300 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block mb-6 px-4 py-1 border border-nobel-gold text-nobel-gold text-[10px] tracking-[0.2em] uppercase font-bold rounded-full">
              Research Narrative
            </div>
            <h1 className={cn(
              "font-serif font-medium leading-tight mb-8 text-stone-900",
              hideNav ? "text-4xl md:text-6xl" : "text-5xl md:text-7xl lg:text-8xl"
            )}>
              {data.title}
            </h1>
            <div className="flex flex-wrap justify-center gap-4 mb-12 text-stone-500 font-serif italic text-lg">
              {data.authors.map((author, i) => (
                <span key={i}>{author}{i < data.authors.length - 1 ? ' • ' : ''}</span>
              ))}
            </div>
            
            {data.paperAbstract && (
              <p className="max-w-3xl mx-auto text-xl text-stone-600 font-light leading-relaxed mb-12 italic">
                "{data.paperAbstract}"
              </p>
            )}

            {hideNav && (
              <button 
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all text-sm font-medium shadow-lg"
              >
                <Share2 size={16} /> Share Narrative
              </button>
            )}

            {!hideNav && (
              <div className="flex justify-center">
                <a href="#content" className="group flex flex-col items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-900 transition-colors">
                    <span>READ STORY</span>
                    <span className="p-3 border border-stone-200 rounded-full group-hover:border-stone-900 transition-colors bg-white/50">
                        <ArrowDown size={16} />
                    </span>
                </a>
              </div>
            )}
          </motion.div>
        </div>
      </header>

      <main id="content" className="pb-32">
        {data.sections.map((section, index) => (
          <section key={index} className="py-16 border-t border-stone-100 first:border-0">
            <div className="container mx-auto px-6 md:px-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-4">
                  <div className="inline-block mb-3 text-[10px] font-bold tracking-widest text-stone-400 uppercase">Section {index + 1}</div>
                  <h2 className="font-serif text-3xl mb-6 leading-tight text-stone-900">{section.title}</h2>
                  <div className="w-12 h-1 bg-nobel-gold mb-6"></div>
                  
                  {section.type === 'metric' && section.visualData && (
                    <div className="mt-8 p-6 bg-white rounded-2xl border border-stone-100 shadow-sm">
                        <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-2">{section.visualData.label}</div>
                        <div className="text-4xl font-serif text-nobel-gold">{section.visualData.value}<span className="text-xl ml-1">{section.visualData.unit}</span></div>
                    </div>
                  )}
                </div>
                
                <div className="lg:col-span-8">
                  {section.type === 'quote' ? (
                    <div className="relative">
                        <Quote className="absolute -top-8 -left-8 text-nobel-gold/20 w-16 h-16" />
                        <p className="text-2xl font-serif text-stone-700 leading-relaxed italic">
                            {section.content}
                        </p>
                    </div>
                  ) : (
                    <div className="text-lg text-stone-600 leading-relaxed space-y-6">
                      {section.content.split('\n').map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  )}

                  {section.type === 'diagram' && (
                    <div className="mt-12 aspect-video bg-stone-100 rounded-3xl flex items-center justify-center border border-stone-200 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.1)_0%,transparent_70%)]" />
                        <div className="text-center p-8 relative z-10">
                            <BookOpen className="w-12 h-12 text-nobel-gold mx-auto mb-4 opacity-50" />
                            <p className="text-stone-400 font-serif italic">{section.visualData || "Visual representation of the discovery"}</p>
                        </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}
      </main>

      {!hideNav && (
        <footer className="py-20 bg-stone-900 text-stone-400 border-t border-stone-800">
          <div className="container mx-auto px-6 text-center">
              <div className="w-12 h-12 bg-nobel-gold rounded-full flex items-center justify-center text-white font-serif font-bold text-2xl mx-auto mb-8 pb-1">φ</div>
              <p className="font-serif text-xl text-white mb-4">Reimagined by PhDMe</p>
              <p className="text-sm max-w-md mx-auto mb-8">
                  This narrative was generated by AI based on a research paper. 
                  Always refer to the original publication for peer-reviewed details.
              </p>
              <button 
                  onClick={onBack}
                  className="px-8 py-3 border border-stone-700 rounded-full hover:bg-stone-800 transition-colors text-sm font-medium tracking-widest uppercase"
              >
                  Create Your Own
              </button>
          </div>
        </footer>
      )}
    </div>
  );
};
