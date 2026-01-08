"use client";

import { useState, useEffect } from "react";
import { FileArchive, Download, Upload, Loader2, FileText, CheckCircle2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { compressPdf } from "@/lib/pdf-compressor";
import { useTheme } from "next-themes";
import PixelBlast from "@/components/PixelBlast";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [result, setResult] = useState<{
    blob: Blob;
    originalSize: number;
    compressedSize: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setProgress(0);
      setError(null);
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    setIsCompressing(true);
    setProgress(0);
    setError(null);

    try {
      const compressedBlob = await compressPdf(file, { 
        quality: 0.5,
        scale: 1.0,
        onProgress: (p) => setProgress(p)
      });
      
      setResult({
        blob: compressedBlob,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        name: file.name.replace(/\.pdf$/i, "_compressed.pdf"),
      });
    } catch (err: any) {
      console.error("Compression failed:", err);
      setError(err.message || "Failed to compress PDF. The file might be too large or corrupted.");
    } finally {
      setIsCompressing(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const reductionPercent = result 
    ? Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100) 
    : 0;

  if (!mounted) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#fafafa] p-4 font-sans transition-colors duration-500 dark:bg-[#000000]">
      {theme === "dark" && (
        <PixelBlast 
          color="#B19EEF"
          pixelSize={4}
          patternScale={2}
          patternDensity={0.8}
          liquid={true}
          liquidStrength={0.05}
          edgeFade={0.4}
        />
      )}
      
      <div className="absolute top-6 right-6 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full w-12 h-12 bg-white/80 backdrop-blur dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 shadow-lg"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-zinc-100" />
          ) : (
            <Moon className="h-5 w-5 text-zinc-900" />
          )}
        </Button>
      </div>

      <div className="relative w-full max-w-xl z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-zinc-200 bg-white/90 backdrop-blur-sm shadow-2xl dark:border-zinc-800 dark:bg-black/80">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 dark:border dark:border-zinc-800">
                <FileArchive className="h-8 w-8 text-[#B19EEF]" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">
                PDF Squeeze
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Compress your PDF files instantly in your browser.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-6 rounded-xl bg-red-50 p-4 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">
                      {error}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-red-200 text-red-800 hover:bg-red-100 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      onClick={() => {
                        setError(null);
                        setFile(null);
                      }}
                    >
                      Reset & Try Again
                    </Button>
                  </div>
                </motion.div>
              )}

              {!result && !isCompressing && !error ? (
                <div className="space-y-4">
                  <div 
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all ${
                      file 
                        ? "border-[#B19EEF] bg-[#B19EEF]/5 dark:bg-[#B19EEF]/10" 
                        : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 hover:dark:bg-zinc-900"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    />
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="rounded-full bg-white p-3 shadow-sm dark:bg-zinc-800 border dark:border-zinc-700">
                        {file ? <FileText className="h-6 w-6 text-[#B19EEF]" /> : <Upload className="h-6 w-6 text-zinc-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {file ? file.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {file ? formatSize(file.size) : "PDF files only"}
                        </p>
                        {file && file.size > 30 * 1024 * 1024 && (
                          <p className="text-[10px] text-amber-600 font-medium mt-1 uppercase tracking-wider">
                            Large file • Processing may take a moment
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full h-12 text-base font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-all active:scale-[0.98]"
                    disabled={!file}
                    onClick={handleCompress}
                  >
                    Compress PDF
                  </Button>
                </div>
              ) : null}

              <AnimatePresence>
                {isCompressing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center space-y-6 py-8"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 blur-2xl bg-[#B19EEF]/20 rounded-full animate-pulse" />
                      <Loader2 className="h-12 w-12 animate-spin text-[#B19EEF] relative z-10" />
                    </div>
                    <div className="w-full space-y-3 text-center">
                      <p className="text-sm font-medium dark:text-white">Optimizing your PDF...</p>
                      <Progress value={progress} className="h-2 bg-zinc-100 dark:bg-zinc-800" indicatorClassName="bg-[#B19EEF]" />
                      <p className="text-xs text-zinc-500">{Math.round(progress)}% complete</p>
                    </div>
                  </motion.div>
                )}

                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 py-4"
                  >
                    <div className="flex flex-col items-center gap-4 rounded-xl bg-zinc-50 p-6 dark:bg-zinc-900/30 border dark:border-zinc-800">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-white uppercase tracking-tight">Success!</h3>
                        <p className="text-sm text-zinc-500 font-mono mt-1 opacity-70 truncate max-w-[280px]">{result.name}</p>
                      </div>

                      <div className="grid w-full grid-cols-2 gap-4 mt-2">
                        <div className="flex flex-col items-center rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900 border dark:border-zinc-800">
                          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Original</span>
                          <span className="text-sm font-mono mt-1">{formatSize(result.originalSize)}</span>
                        </div>
                        <div className="flex flex-col items-center rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900 border dark:border-zinc-800 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 px-1.5 py-0 font-bold">
                              -{reductionPercent}%
                            </Badge>
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Squeezed</span>
                          <span className="text-sm font-mono font-bold text-green-600 dark:text-green-400 mt-1">{formatSize(result.compressedSize)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 font-semibold"
                        onClick={() => {
                          setFile(null);
                          setResult(null);
                        }}
                      >
                        Start Over
                      </Button>
                      <Button 
                        className="flex-1 h-12 bg-[#B19EEF] text-white hover:bg-[#a28de6] shadow-lg shadow-[#B19EEF]/20 font-bold transition-all active:scale-[0.98]"
                        onClick={downloadResult}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
            
            <CardFooter className="justify-center border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 py-4 dark:bg-zinc-900/20 rounded-b-xl">
              <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-black italic">
                Browser Native • Privacy Focused • No Cloud
              </p>
            </CardFooter>
          </Card>
        </motion.div>

        <div className="mt-8 text-center flex flex-col items-center gap-2">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium opacity-50">
            Powered by pdf.js & jsPDF • Created with Next.js
          </p>
        </div>
      </div>
    </div>
  );
}
