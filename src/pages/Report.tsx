import React, { useState, useRef } from 'react';
import { Camera, Crosshair, ChevronDown, CheckCircle2, ShieldAlert, Sparkles, Loader2, Mic } from 'lucide-react';
import LocationPicker from '../components/LocationPicker';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { analyzeIssueImage } from '../services/geminiService';

import exifr from 'exifr';

export default function Report() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Road Maintenance');
  const [priority, setPriority] = useState('LOW');
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [exifDebug, setExifDebug] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsDictating(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTitle(prev => prev ? prev + ' ' + transcript : transcript);
      setIsDictating(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognition.start();
  };

  if (!user) {
    return (
      <div className="p-5 flex flex-col items-center justify-center min-h-full text-center animate-in fade-in zoom-in duration-300 pb-20">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign In Required</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-[280px] mx-auto leading-relaxed mb-8">
          To report a civic issue, please join the community. This helps us verify reports, prevent spam, and keep you updated on the resolution progress.
        </p>
        <button 
          onClick={() => navigate('/auth')}
          className="bg-blue-600 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 w-full max-w-[280px] mx-auto"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExifDebug('Analyzing image for GPS...');
      try {
        const gpsData = await exifr.gps(file);
        if (gpsData && gpsData.latitude && gpsData.longitude) {
          setPosition([gpsData.latitude, gpsData.longitude]);
          setLocationDetected(true);
          setExifDebug(`Found GPS: Lat ${gpsData.latitude.toFixed(4)}, Lng ${gpsData.longitude.toFixed(4)}`);
        } else {
          setLocationDetected(false);
          setExifDebug('No GPS data found in image.');
        }
      } catch (err) {
        setLocationDetected(false);
        setExifDebug(`Exif error: ${err instanceof Error ? err.message : String(err)}`);
        console.error("Failed to extract EXIF data", err);
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        // Compress image using canvas
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800; // Max width or height
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // 60% quality JPEG
            setImagePreview(compressedBase64);

            // Auto analyze image
            try {
              setIsAnalyzingImage(true);
              const aiResult = await analyzeIssueImage(compressedBase64, 'image/jpeg');
              if (aiResult) {
                if (aiResult.title) setTitle(aiResult.title);
                if (aiResult.category) setCategory(aiResult.category);
                if (aiResult.priority) setPriority(aiResult.priority);
              }
            } catch (error) {
              console.error("Failed to analyze image with AI", error);
            } finally {
              setIsAnalyzingImage(false);
            }
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user || !position || !title.trim()) return;
    setIsSubmitting(true);
    try {
      const complaintRef = doc(collection(db, 'complaints'));
      await setDoc(complaintRef, {
        userId: user.uid,
        title: title.trim(),
        description: description.trim(),
        category: category,
        locationName: `Lat: ${position[0].toFixed(5)}, Lng: ${position[1].toFixed(5)}`,
        latitude: position[0],
        longitude: position[1],
        status: 'Pending Review',
        priority: priority.toUpperCase(),
        imageUrl: imagePreview ? imagePreview : '',
        upvotesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setImagePreview(null);
        setPosition(null);
        setLocationDetected(false);
        setTitle('');
        setDescription('');
        setCategory('Road Maintenance');
        setPriority('LOW');
      }, 3000);
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'complaints');
    } finally {
       setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-4 min-h-screen flex flex-col items-center justify-center text-center animate-in zoom-in duration-300 pb-32">
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-5 ring-8 ring-green-50/50">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Report Submitted!</h2>
        <p className="text-gray-500 text-sm mt-3 max-w-[260px] mx-auto leading-relaxed">
          Thank you for making the city better. We have routed your issue to the appropriate department.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col min-h-full animate-in fade-in slide-in-from-bottom-4 duration-300 pb-24">
      <div className="mb-6 mt-2">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Report Incident</h2>
        <p className="text-sm text-gray-500 mt-1">Submit new civic issues directly.</p>
      </div>

      <div className="space-y-5 flex-1">
        {/* Issue Title */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
            <span>Issue Title</span>
            {isAnalyzingImage && <span className="text-blue-500 font-medium normal-case flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> AI analyzing...</span>}
          </label>
          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="E.g. Large pothole on Main Street"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 pl-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all placeholder:font-normal placeholder:text-gray-400"
            />
            <button 
              onClick={startDictation}
              className={`absolute right-3 p-1.5 rounded-full transition-colors ${isDictating ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
              title="Dictate title"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Issue Description */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex justify-between">
            <span>Issue Description</span>
            <span className="text-gray-400 font-normal">Optional</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide more details about the issue..."
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all placeholder:font-normal placeholder:text-gray-400 resize-none"
          />
        </div>

        {/* Issue Category */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Issue Category</label>
          <div className="relative">
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            >
              <option>Road Maintenance</option>
              <option>Water & Sanitation</option>
              <option>Electrical & Streetlights</option>
              <option>Garbage & Waste</option>
              <option>Public Infrastructure</option>
            </select>
            <ChevronDown className="absolute right-4 top-4 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Location Picker */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
            <span>Location</span>
            {locationDetected && <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">Pinpointed from photo</span>}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1" onClick={() => setIsMapOpen(true)}>
              <input 
                type="text" 
                readOnly 
                placeholder="Select on map..." 
                value={position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : ''} 
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-medium py-3.5 px-4 rounded-xl focus:outline-none cursor-pointer placeholder:font-normal placeholder:text-gray-400" 
              />
            </div>
            <button 
              onClick={() => setIsMapOpen(!isMapOpen)} 
              className={`p-3.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                isMapOpen 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                  : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
              }`}
            >
              <Crosshair className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inline Map View */}
        {isMapOpen && (
          <div className="w-full animate-in slide-in-from-top-2 fade-in stretch-in duration-200">
             <LocationPicker 
               position={position} 
               setPosition={setPosition} 
               onConfirm={() => setIsMapOpen(false)} 
             />
          </div>
        )}

        {/* Image Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
            <span>Upload Image</span>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Auto-detects issue
            </span>
          </label>
          {exifDebug && (
            <div className={`text-xs p-2 rounded ${exifDebug.startsWith('Found') ? 'bg-green-50 text-green-700' : exifDebug.startsWith('Analyzing') ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
              EXIF Info: {exifDebug}
            </div>
          )}
          <div
            onClick={() => { if(!isAnalyzingImage) fileInputRef.current?.click() }}
            className={`border-2 border-dashed border-gray-200 rounded-2xl p-2 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all group h-48 overflow-hidden relative ${isAnalyzingImage ? 'opacity-70 pointer-events-none' : ''}`}
          >
             {imagePreview ? (
               <>
                 <img src={imagePreview} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                 <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                   <Camera className="w-6 h-6 text-white mb-2" />
                   <span className="text-white font-medium text-sm">Retake Photo</span>
                 </div>
               </>
             ) : (
               <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-gray-500 transition-colors">
                 <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center">
                   <Camera className="w-5 h-5 text-blue-500" />
                 </div>
                 <span className="text-sm font-medium">Tap to take a photo</span>
               </div>
             )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImageChange} 
          />
        </div>
      </div>

      <div className="mt-8 mb-2">
        <button 
          onClick={handleSubmit}
          disabled={!position || !imagePreview || !title.trim() || isSubmitting}
          className="w-full bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </div>
  );
}
