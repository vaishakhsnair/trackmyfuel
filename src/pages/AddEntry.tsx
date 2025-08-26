import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Calculator, Fuel, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { PhotoUpload } from "@/components/PhotoUpload";
import { addRefuel, ensureDefaultBike } from "@/lib/db";
import { compressImageToJpeg, extractExif, runOCR } from "@/lib/ocr";
import { useFuelPriceDiesel } from "@/lib/settings";

const AddEntry = () => {
  const { toast } = useToast();
  const [odometer, setOdometer] = useState("");
  const [rupees, setRupees] = useState("");
  const [pricePerLitre, setPricePerLitre] = useState("");
  const [litres, setLitres] = useState("");
  const [fullTank, setFullTank] = useState(false);
  const [note, setNote] = useState("");
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | undefined>(undefined);
  const [ocrConf, setOcrConf] = useState<number | undefined>(undefined);
  const [exifAt, setExifAt] = useState<number | undefined>(undefined);
  const [exifLat, setExifLat] = useState<number | undefined>(undefined);
  const [exifLon, setExifLon] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Quick amount options (₹)
  const quickAmounts = [200, 300, 500, 700, 1000, 1500];
  const [storedFuelPrice] = useFuelPriceDiesel()

  useEffect(() => {
    // Prefill from query string
    const sp = new URLSearchParams(window.location.search)
    const r = sp.get('rupees')
    const f = sp.get('full')
    if (r) setRupees(r)
    if (f) setFullTank(f === '1')
  }, [])

  useEffect(() => {
    // Prefill from stored setting if available
    if (!pricePerLitre && storedFuelPrice) {
      setPricePerLitre(String(storedFuelPrice))
    }
  }, [storedFuelPrice])

  // Auto-calc litres if rupees+price provided and litres empty
  useEffect(() => {
    if (rupees && pricePerLitre && !litres) {
      const r = parseFloat(rupees)
      const p = parseFloat(pricePerLitre)
      if (r > 0 && p > 0) setLitres((r / p).toFixed(2))
    }
  }, [rupees, pricePerLitre])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const odo = parseInt(odometer, 10)
    if (!odo) {
      toast({
        title: "Missing Information",
        description: "Please provide a valid odometer reading",
        variant: "destructive",
      });
      return;
    }
    const bike = await ensureDefaultBike()
    const id = await addRefuel({
      bike_local_id: bike.id,
      odometer_km: odo,
      rupees: rupees ? parseFloat(rupees) : undefined,
      price_per_litre: pricePerLitre ? parseFloat(pricePerLitre) : undefined,
      litres: litres ? parseFloat(litres) : undefined,
      full_tank: fullTank,
      note: note || undefined,
      photo_blob: photoBlob,
      photo_exif_time: exifAt,
      photo_lat: exifLat,
      photo_lon: exifLon,
      ocr_confidence: ocrConf,
      server_id: undefined,
    })
    toast({ title: "Entry saved", description: `#${id} queued for sync` })
    setOdometer("")
    setRupees("")
    setPricePerLitre("")
    setLitres("")
    setFullTank(false)
    setNote("")
    setPhotoBlob(undefined)
    setOcrConf(undefined)
    setExifAt(undefined)
    setExifLat(undefined)
    setExifLon(undefined)
  };

  const handlePhotoReading = (reading: string) => {
    setOdometer(reading);
    setShowPhotoUpload(false);
    toast({
      title: "Odometer Reading Detected",
      description: `Set to ${reading}km from photo`,
    });
  };

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const compressed = await compressImageToJpeg(f)
      setPhotoBlob(compressed)
      const ex = await extractExif(f)
      setExifAt(ex.takenAt)
      setExifLat(ex.lat)
      setExifLon(ex.lon)
      const ocr = await runOCR(compressed)
      if (ocr.odometer) setOdometer(String(ocr.odometer))
      setOcrConf(ocr.confidence)
    } catch (err: any) {
      toast({ title: 'Failed to process image', description: String(err?.message || err), variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-primary to-primary-glow rounded-lg">
                <Fuel className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Add Fuel Entry</h1>
                <p className="text-sm text-muted-foreground">Record your latest refuel</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Photo Upload Modal */}
          {showPhotoUpload && (
            <PhotoUpload
              onReading={handlePhotoReading}
              onFile={(file) => handleImageFile(file)}
              onClose={() => setShowPhotoUpload(false)}
            />
          )}

          {/* Main Form Card */}
          <Card className="metric-card p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Odometer Reading */}
              <div className="space-y-3">
                <Label htmlFor="odometer" className="text-sm font-medium text-card-foreground">
                  Current Odometer Reading
                </Label>
                <div className="relative">
                  <Input
                    id="odometer"
                    type="number"
                    placeholder="Enter current km reading"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    km
                  </span>
                </div>
                
                {/* Photo Upload Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPhotoUpload(true)}
                  className="w-full flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Odometer from Photo</span>
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowPhotoUpload(true)} className="w-full">Pick/Scan Photo for OCR</Button>
                </div>
              </div>

              {/* Money Spent */}
              <div className="space-y-3">
                <Label htmlFor="money" className="text-sm font-medium text-card-foreground">
                  Money Spent on Fuel
                </Label>
                
                {/* Quick Amount Buttons */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span>Quick amounts</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setRupees(amount.toString())}
                        className={`quick-amount-btn p-3 text-sm ${
                          rupees === String(amount) ? 'selected' : ''
                        }`}
                      >
                        ₹{amount}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  <Input
                    id="money"
                    type="number"
                    step="0.01"
                    placeholder="Or enter custom amount"
                    value={rupees}
                    onChange={(e) => setRupees(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Label htmlFor="price" className="text-xs text-muted-foreground">Price/Litre</Label>
                    <Input id="price" type="number" step="0.01" placeholder="e.g. 105" value={pricePerLitre} onChange={(e) => setPricePerLitre(e.target.value)} />
                  </div>
                  <div className="relative">
                    <Label htmlFor="litres" className="text-xs text-muted-foreground">Litres</Label>
                    <Input id="litres" type="number" step="0.01" placeholder="auto if price set" value={litres} onChange={(e) => setLitres(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input id="full" type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
                  <Label htmlFor="full">Full tank</Label>
                </div>

                <div>
                  <Label htmlFor="note" className="text-sm font-medium text-card-foreground">Note</Label>
                  <Input id="note" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </div>

              {/* Calculated Fuel Amount */}
              {(rupees || litres) && (
                <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-accent-foreground">
                    <Calculator className="w-4 h-4" />
                    <span className="font-medium">Calculated Amount</span>
                  </div>
                  <div className="text-2xl font-bold text-accent-foreground">
                    {litres || (rupees && pricePerLitre ? (parseFloat(rupees) / parseFloat(pricePerLitre)).toFixed(2) : "")} <span className="text-sm font-normal">Liters</span>
                  </div>
                  {ocrConf != null && (
                    <div className="text-xs text-muted-foreground">OCR confidence: {Math.round(ocrConf)}%</div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="quick-action-btn w-full p-4">
                <span className="font-semibold">Add Entry</span>
              </Button>
            </form>
          </Card>

          {/* Helper tips */}
          <Card className="metric-card p-6 space-y-2 text-sm text-muted-foreground">
            <div>Tip: Provide either litres or price per litre with ₹ to auto-calc litres.</div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AddEntry;
