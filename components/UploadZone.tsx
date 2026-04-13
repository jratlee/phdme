import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface UploadZoneProps {
  onUpload: (text: string) => void;
  isProcessing: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, isProcessing }) => {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const extractText = async (file: File | Blob) => {
    setProgress('Reading file...');
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(' ') + '\n';
          setProgress(`Extracting text (page ${i}/${pdf.numPages})...`);
        }
        return fullText;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } else if (file.type === 'text/plain') {
        return await (file as File).text();
      } else {
        throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
      }
    } catch (err) {
      console.error(err);
      throw new Error('Failed to extract text from file.');
    }
  };

  const handleGoogleDrive = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!clientId || !apiKey) {
      setError("Google Drive integration requires VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in environment variables.");
      return;
    }

    // @ts-ignore
    const gapi = window.gapi;
    // @ts-ignore
    const google = window.google;

    if (!gapi || !google) {
      setError("Google API failed to load.");
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: async (response: any) => {
        if (response.error !== undefined) {
          throw response;
        }
        const accessToken = response.access_token;
        showPicker(accessToken);
      },
    });

    const showPicker = (accessToken: string) => {
      const picker = new google.picker.PickerBuilder()
        .addView(google.picker.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setCallback(async (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            const fileId = doc.id;
            setProgress('Downloading from Drive...');
            try {
              const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              const blob = await res.blob();
              const text = await extractText(blob);
              onUpload(text);
            } catch (err: any) {
              setError("Failed to download file from Google Drive.");
            } finally {
              setProgress('');
            }
          }
        })
        .build();
      picker.setVisible(true);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    try {
      const text = await extractText(file);
      onUpload(text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProgress('');
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer p-12 border-2 border-dashed rounded-3xl transition-all duration-500",
          isDragActive ? "border-nobel-gold bg-nobel-gold/5" : "border-stone-200 bg-white hover:border-nobel-gold/50 hover:bg-stone-50/50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center text-center gap-6">
          <div className={cn(
            "p-6 rounded-full bg-stone-50 text-stone-400 transition-all duration-500 group-hover:scale-110 group-hover:text-nobel-gold group-hover:bg-nobel-gold/10",
            isDragActive && "scale-110 text-nobel-gold bg-nobel-gold/10"
          )}>
            {isProcessing ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : (
              <Upload className="w-12 h-12" />
            )}
          </div>
          
          <div>
            <h3 className="font-serif text-2xl text-stone-900 mb-2">
              {isProcessing ? "Reimagining your research..." : "Upload your paper"}
            </h3>
            <p className="text-stone-500 font-light max-w-sm mx-auto">
              {progress || "Drag & drop your PDF, DOCX, or TXT file here, or click to browse."}
            </p>
          </div>

          <div className="flex gap-4 text-xs font-bold tracking-widest text-stone-400 uppercase">
            <span className="flex items-center gap-1"><CheckCircle2 size={14} /> PDF</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={14} /> DOCX</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={14} /> TXT</span>
          </div>
        </div>

        {isDragActive && (
          <div className="absolute inset-0 bg-nobel-gold/5 rounded-3xl animate-pulse" />
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleGoogleDrive();
          }}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 rounded-full text-stone-600 hover:text-stone-900 hover:border-stone-400 transition-all text-sm font-medium shadow-sm"
        >
          <Database size={18} className="text-nobel-gold" />
          Connect Google Drive
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-fade-in">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};
