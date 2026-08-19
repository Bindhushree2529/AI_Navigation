"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";
import { Camera, Upload, Eye, FileText, DollarSign, MessageSquare, Loader2, Mic, StopCircle } from "lucide-react";
import { api } from "@/services/api";
import { speak } from "@/hooks/useVoiceAssistant";

type Mode = "detect" | "describe" | "ocr" | "currency" | "ask";

const MODES: { id: Mode; icon: typeof Eye; label: string }[] = [
  { id: "detect", icon: Eye, label: "Object Detection" },
  { id: "describe", icon: MessageSquare, label: "Scene Description" },
  { id: "ocr", icon: FileText, label: "Read Text (OCR)" },
  { id: "currency", icon: DollarSign, label: "Currency" },
  { id: "ask", icon: Mic, label: "Visual Q&A" },
];

export default function DemoPage() {
  const [mode, setMode] = useState<Mode>("describe");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("What do you see?");
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    speak("Live AI demo. Choose a mode, then upload an image or use your live camera. Press Run Analysis to see results.");
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      speak("Camera started. Press Run Analysis to analyze what the camera sees.");
    } catch {
      speak("Camera permission denied. Please allow camera access.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    speak("Camera stopped.");
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  function captureFrame(): Blob | null {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.8)) as any;
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setResult(null);
    speak("Image selected. Press Run Analysis to analyze it.");
  }

  async function runAnalysis() {
    setLoading(true);
    setResult(null);
    speak("Analyzing. Please wait.");
    try {
      let blob: Blob | null = null;

      if (useLiveCamera && cameraActive) {
        blob = await captureFrame() as any;
        // captureFrame returns a Promise<Blob>, handle it
        if (!blob) {
          const canvas = canvasRef.current!;
          blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), "image/jpeg", 0.8));
        }
      } else if (uploadFile) {
        blob = uploadFile;
      } else {
        speak("Please upload an image or start the camera first.");
        setLoading(false);
        return;
      }

      const form = new FormData();
      form.append("file", blob, "frame.jpg");

      let text = "";
      if (mode === "detect") {
        const res = await api.post("/detections/analyze", form, { headers: { "Content-Type": "multipart/form-data" } });
        const dets = res.data.detections ?? [];
        text = dets.length
          ? dets.map((d: any) => `• ${d.spokenText || d.label} (${Math.round(d.confidence * 100)}%)`).join("\n")
          : "No objects detected. Path appears clear.";
      } else if (mode === "describe") {
        const res = await api.post("/detections/describe", form, { headers: { "Content-Type": "multipart/form-data" } });
        text = res.data.description || "No description available.";
      } else if (mode === "ocr") {
        const res = await api.post("/detections/ocr", form, { headers: { "Content-Type": "multipart/form-data" } });
        text = res.data.text || "No text found in image.";
      } else if (mode === "currency") {
        const res = await api.post("/detections/currency", form, { headers: { "Content-Type": "multipart/form-data" } });
        text = res.data.description || JSON.stringify(res.data, null, 2);
      } else if (mode === "ask") {
        const res = await api.post("/detections/ask", form, {
          headers: { "Content-Type": "multipart/form-data", "x-question": question },
        });
        text = res.data.answer || "No answer.";
      }

      setResult(text);
      speak(text);
    } catch (e: any) {
      const msg = e.response?.data?.error || "AI engine is not running. Start the ai-engine service on port 8001.";
      setResult(msg);
      speak(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-16 space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Live AI Demo</h1>
          <p className="text-muted-foreground mt-2">Test NaviAssist AI — object detection, scene description, OCR, currency, and visual Q&A.</p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Analysis mode">
          {MODES.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => { setMode(id); setResult(null); speak(`${label} mode selected.`); }}
              role="radio" aria-checked={mode === id}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-colors touch-target ${mode === id ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-600" : "hover:bg-surface"}`}>
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {/* Q&A question input */}
        {mode === "ask" && (
          <input value={question} onChange={e => setQuestion(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Ask a question about the image..."
            aria-label="Question for visual Q&A" />
        )}

        {/* Camera / Upload toggle */}
        <div className="flex gap-3">
          <button onClick={() => { setUseLiveCamera(false); stopCamera(); }}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${!useLiveCamera ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-600" : "hover:bg-surface"}`}>
            <Upload className="h-4 w-4" /> Upload Image
          </button>
          <button onClick={() => setUseLiveCamera(true)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${useLiveCamera ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-600" : "hover:bg-surface"}`}>
            <Camera className="h-4 w-4" /> Live Camera
          </button>
        </div>

        {/* Upload area */}
        {!useLiveCamera && (
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-brand-500 transition-colors"
            role="button" aria-label="Click to upload image" tabIndex={0}
            onKeyDown={e => e.key === "Enter" && fileRef.current?.click()}>
            {uploadPreview
              ? <img src={uploadPreview} alt="Uploaded preview" className="max-h-64 mx-auto rounded-xl object-contain" />
              : <div className="space-y-2"><Upload className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground">Click to upload an image</p></div>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-hidden />
          </div>
        )}

        {/* Live camera */}
        {useLiveCamera && (
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"
                aria-label="Live camera feed" />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white text-sm">Camera not started</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" aria-hidden />
            <button onClick={cameraActive ? stopCamera : startCamera}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${cameraActive ? "bg-red-500 text-white" : "btn-primary"}`}
              aria-label={cameraActive ? "Stop camera" : "Start camera"}>
              {cameraActive ? <><StopCircle className="h-4 w-4" /> Stop Camera</> : <><Camera className="h-4 w-4" /> Start Camera</>}
            </button>
          </div>
        )}

        <button onClick={runAnalysis} disabled={loading}
          className="btn-primary w-full touch-target" aria-label="Run AI analysis">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analyzing...</> : "Run AI Analysis"}
        </button>

        {/* Result */}
        {result && (
          <div className="card bg-surface space-y-3" role="region" aria-label="Analysis result" aria-live="polite">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Result</h2>
              <button onClick={() => speak(result)} className="btn-ghost text-xs flex items-center gap-1 text-brand-600">
                <Mic className="h-3 w-3" /> Read aloud
              </button>
            </div>
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
