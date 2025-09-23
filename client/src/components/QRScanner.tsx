import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { X, Camera, CameraOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, isOpen }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    }

    return () => {
      stopAndCleanup();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    setCameraError(null);

    if (!videoRef.current) {
      setCameraError('No video element available');
      return;
    }

    // Prompt for camera permission first to ensure browser asks user immediately
    try {
      // Try to get a video stream (this triggers permission prompt)
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (err: any) {
      console.error('getUserMedia permission error:', err);
      const msg = (err && err.name === 'NotAllowedError')
        ? 'Camera permission denied. Please allow camera access and try again.'
        : 'Failed to access camera. Please check your device and permissions.';
      setCameraError(msg);
      toast.error(msg);
      return;
    }

    try {
      const cameraAvailable = await QrScanner.hasCamera();
      setHasCamera(cameraAvailable);
      if (!cameraAvailable) {
        setCameraError('No camera found on this device');
        return;
      }

      // Destroy any existing scanner first
      if (qrScannerRef.current) {
        try { qrScannerRef.current.destroy(); } catch { /* ignore */ }
        qrScannerRef.current = null;
      }

      // Create scanner bound to video element
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          // result.data is the decoded string
          try {
            onScan(result.data);
          } catch (e) {
            console.error('onScan handler error', e);
          }
          stopAndCleanup();
          toast.success('QR Code scanned successfully!');
        },
        {
          onDecodeError: (error) => {
            // decode errors are normal while scanning
            // console.debug('decode error', error);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 5
        }
      );

      // start scanning (qr-scanner will call getUserMedia internally but permission already granted)
      await qrScannerRef.current.start();
      setIsScanning(true);
      toast.success('Camera started - point at QR code');
    } catch (error: any) {
      console.error('Error initializing QR scanner:', error);
      const errMsg = (error && error.message) ? error.message : 'Failed to initialize QR scanner';
      setCameraError('Failed to start scanner. ' + errMsg);
      toast.error('Failed to access camera. Please check permissions.');
      // ensure cleanup
      stopAndCleanup();
    }
  };

  const stopAndCleanup = () => {
    // stop qr-scanner
    if (qrScannerRef.current) {
      try { qrScannerRef.current.stop(); } catch {}
      try { qrScannerRef.current.destroy(); } catch {}
      qrScannerRef.current = null;
    }

    // stop any active media tracks attached to the video element
    if (videoRef.current && (videoRef.current.srcObject as MediaStream)) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  };

  const handleClose = () => {
    stopAndCleanup();
    setCameraError(null);
    onClose();
  };

  const handleRetry = () => {
    setCameraError(null);
    initializeScanner();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          {cameraError ? (
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">{cameraError}</p>
                <div className="flex items-center justify-center space-x-2">
                  <button onClick={handleRetry} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Try Again</button>
                  <button onClick={handleClose} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                playsInline
                muted
                autoPlay
              />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-blue-500" />
                <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-blue-500" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-blue-500" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-blue-500" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-400 border-dashed rounded-lg flex items-center justify-center">
                  <div className="text-blue-400 text-sm font-medium">Point camera here</div>
                </div>
              </div>

              <div className="flex items-center justify-center mt-4">
                {isScanning ? (
                  <div className="flex items-center text-green-600">
                    <Camera className="h-5 w-5 mr-2" />
                    <span>Scanning... point camera at QR code</span>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-600">
                    <CameraOff className="h-5 w-5 mr-2" />
                    <span>Initializing camera...</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">Point your camera at the QR code displayed by your teacher</p>
          <p className="text-xs text-gray-500 mt-2">Make sure the QR code is clearly visible and well-lit</p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
       