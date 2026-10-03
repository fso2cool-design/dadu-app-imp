import React, { useRef, useState, useEffect } from 'react';
import { X, PenNib, ArrowCounterClockwise, Trash, Check, Upload, Info } from '@phosphor-icons/react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  initialSignatureUrl?: string;
  title?: string;
  subtitle?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'Tanda Tangan Digital',
  subtitle = 'Goreskan tanda tangan langsung atau unggah file gambar tanda tangan transparan',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0f172a'); // Physical ink color default
  const [penWidth, setPenWidth] = useState(3);
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Init canvas
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle retina displays
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;

      // Fill transparent
      ctx.clearRect(0, 0, rect.width, rect.height);
      setHasDrawn(false);
      setHistory([]);
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Update stroke styles when penColor or penWidth changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
  }, [penColor, penWidth]);

  if (!isOpen) return null;

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-10), imgData]);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveState();
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setHistory([]);
  };

  const undoLastStroke = () => {
    if (history.length === 0) {
      clearCanvas();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    ctx.putImageData(previousState, 0, 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setUploadedImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = () => {
    if (activeTab === 'upload' && uploadedImage) {
      onSave(uploadedImage);
      onClose();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--ds-surface-elevated)] rounded-3xl border border-[var(--ds-border)] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--ds-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] flex items-center justify-center">
              <PenNib className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--ds-text)]">{title}</h3>
              <p className="text-[11px] text-[var(--ds-text-muted)]">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[var(--ds-border)] px-5 pt-3 gap-3 bg-[var(--ds-surface-muted)]">
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'draw'
                ? 'border-[var(--ds-accent)] text-[var(--ds-accent)]'
                : 'border-transparent text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
            }`}
          >
            <PenNib className="w-3.5 h-3.5" />
            <span>Goreskan Tanda Tangan (Canvas)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[var(--ds-accent)] text-[var(--ds-accent)]'
                : 'border-transparent text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Gambar / Stempel</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {activeTab === 'draw' ? (
            <div className="space-y-3">
              {/* Canvas Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Pen Colors (Physical Ink Palette Scope Locked) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[var(--ds-text-muted)] font-medium mr-1">Warna Tinta:</span>
                  {[
                    { color: '#0f172a', label: 'Hitam' },
                    { color: '#1e3a8a', label: 'Biru Tua' },
                    { color: '#2563eb', label: 'Biru Terang' },
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setPenColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        penColor === c.color ? 'scale-110 border-[var(--ds-accent)] shadow-xs' : 'border-transparent'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>

                {/* Pen Width */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-[var(--ds-text-muted)] font-medium mr-1">Tebal:</span>
                  {[2, 3, 4].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setPenWidth(w)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        penWidth === w 
                          ? 'bg-[var(--ds-accent-soft)] border-[var(--ds-accent)] text-[var(--ds-accent)]' 
                          : 'bg-[var(--ds-surface-elevated)] border-[var(--ds-border)] text-[var(--ds-text)]'
                      }`}
                    >
                      {w === 2 ? 'Halus' : w === 3 ? 'Sedang' : 'Tebal'}
                    </button>
                  ))}
                </div>

                {/* Undo & Clear */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={undoLastStroke}
                    disabled={history.length === 0}
                    className="p-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text)] disabled:opacity-30 cursor-pointer transition-colors"
                    title="Undo goresan"
                  >
                    <ArrowCounterClockwise className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="p-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                    title="Hapus semua"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Drawing Pad Canvas Area (Scope Locked) */}
              <div className="relative border-2 border-dashed border-[var(--ds-border)] rounded-2xl bg-white overflow-hidden touch-none h-48 flex items-center justify-center cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full"
                />

                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-neutral-400 text-xs">
                    <PenNib className="w-6 h-6 mb-1 text-neutral-300 animate-pulse" />
                    <span>Goreskan tanda tangan Anda di area ini</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">(Gunakan mouse, trackpad, atau layar sentuh)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[var(--ds-text-muted)]">
                <Info className="w-3.5 h-3.5 text-[var(--ds-accent)] shrink-0" />
                <span>Tanda tangan disimpan dengan latar belakang transparan beresolusi tinggi.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[var(--ds-border)] rounded-2xl p-6 text-center bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-elevated)] transition-colors">
                <input
                  type="file"
                  id="signature-file-upload"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="signature-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--ds-accent)]">Klik untuk memilih file gambar</span>
                    <p className="text-[11px] text-[var(--ds-text-muted)] mt-0.5">PNG, JPG atau WebP (Disarankan PNG transparan)</p>
                  </div>
                </label>
              </div>

              {uploadedImage && (
                <div className="p-3 bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={uploadedImage}
                      alt="Uploaded Preview"
                      className="w-16 h-12 object-contain bg-[var(--ds-surface-muted)] rounded-lg border border-[var(--ds-border)]"
                    />
                    <div>
                      <span className="text-xs font-bold text-[var(--ds-text)] block">Pratinjau Gambar</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Siap digunakan</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--ds-border)] flex items-center justify-between bg-[var(--ds-surface-muted)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--ds-border)] text-[var(--ds-text-muted)] text-xs font-semibold hover:bg-[var(--ds-surface-elevated)] hover:text-[var(--ds-text)] transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={activeTab === 'draw' ? !hasDrawn : !uploadedImage}
            className="px-5 py-2 rounded-xl btn-primary text-xs font-semibold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Tanda Tangan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
