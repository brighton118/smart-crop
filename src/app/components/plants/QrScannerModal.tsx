import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { extractPlantTag } from "../../../lib/plantUtils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Camera, QrCode, X, Search, AlertCircle } from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (plantTag: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const [manualTag, setManualTag] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    const scannerId = "kindbuds-qr-scanner-region";

    // Small delay to ensure DOM element is mounted
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          scannerId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            aspectRatio: 1.0,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            const tag = extractPlantTag(decodedText);
            if (tag) {
              scanner.clear().catch(() => {});
              onScanResult(tag);
            }
          },
          (error) => {
            // Ignore scan frame non-detection cycles
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        console.warn("Could not start camera scanner:", err);
        setErrorMessage("Camera access unavailable or permission not granted. You can still enter the plant tag manually below.");
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanResult]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTag.trim()) return;
    const cleanTag = extractPlantTag(manualTag);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
    }
    onScanResult(cleanTag);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-600 rounded-lg">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Scan Plant QR Tag</h3>
              <p className="text-xs text-slate-300">Point camera at the plant's tag</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scanner Region */}
        <div className="p-6 bg-slate-50 flex flex-col items-center">
          {errorMessage && (
            <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div
            id="kindbuds-qr-scanner-region"
            className="w-full max-w-[320px] bg-white rounded-xl overflow-hidden shadow-inner border border-slate-300 min-h-[260px] flex items-center justify-center"
          />

          <div className="mt-3 text-center">
            <span className="text-xs text-slate-500 font-medium">
              Permanent QR code identifies Mother Plants, Sub-Clones, or Seedlings
            </span>
          </div>
        </div>

        {/* Manual Input Fallback */}
        <div className="p-5 border-t bg-white">
          <div className="text-xs font-semibold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
            <QrCode className="w-4 h-4" /> Or Enter Plant Tag Manually:
          </div>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g. KB-MOM-OGK-01 or KB-MOM-OGK-01-C03"
              value={manualTag}
              onChange={(e) => setManualTag(e.target.value)}
              className="font-mono uppercase text-sm"
            />
            <Button
              type="submit"
              disabled={!manualTag.trim()}
              className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" /> Lookup
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

