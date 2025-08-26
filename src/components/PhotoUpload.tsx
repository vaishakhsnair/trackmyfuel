import { useState, useRef } from "react";
import { X, Camera, Upload, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PhotoUploadProps {
  onReading: (reading: string) => void;
  onClose: () => void;
  onFile?: (file: File) => void | Promise<void>;
}

export const PhotoUpload = ({ onReading, onClose, onFile }: PhotoUploadProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (onFile) {
      setIsProcessing(true);
      try { await onFile(file) } finally { setIsProcessing(false) }
    }
  };

  const handleScan = async () => {
    // Kept for UI; real OCR handled by onFile in parent
    if (selectedImage) onReading('')
  };

  const handleCameraCapture = () => {
    // In a real app, this would open camera
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="metric-card w-full max-w-md p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">
            Scan Odometer
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Upload Options */}
        {!selectedImage && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              Take a photo of your odometer or upload an existing image
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCameraCapture}
                className="flex flex-col items-center space-y-2 h-20 bg-accent hover:bg-accent-hover"
              >
                <Camera className="w-6 h-6" />
                <span className="text-sm">Camera</span>
              </Button>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center space-y-2 h-20 bg-accent hover:bg-accent-hover"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm">Upload</span>
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              capture="environment"
            />
          </div>
        )}

        {/* Image Preview & Processing */}
        {selectedImage && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={selectedImage}
                alt="Odometer"
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                  <div className="text-center space-y-2">
                    <Scan className="w-8 h-8 animate-pulse mx-auto text-primary" />
                    <div className="text-sm text-muted-foreground">
                      Reading odometer...
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setSelectedImage(null)}
                className="flex-1"
              >
                Retake
              </Button>
              <Button
                onClick={handleScan}
                disabled={isProcessing}
                className="flex-1 quick-action-btn"
              >
                {isProcessing ? "Processing..." : "Scan Reading"}
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-accent/30 rounded-lg p-3 text-sm text-muted-foreground">
          <strong className="text-accent-foreground">Tips:</strong>
          <ul className="mt-1 space-y-1 text-xs">
            <li>• Ensure the odometer numbers are clearly visible</li>
            <li>• Take the photo straight-on without angle</li>
            <li>• Use good lighting for best results</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
