"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle, XCircle, Scan, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRScannerProps {
  onScanSuccess: (decodedText: string, scanData?: any) => void;
  onScanFailure?: (error: string) => void;
  roomId?: string;
  roomName?: string;
  purpose?: 'attendance' | 'equipment';
}

export default function QRScanner({ 
  onScanSuccess, 
  onScanFailure, 
  roomId, 
  roomName,
  purpose = 'attendance' 
}: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string>('');

  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) {
          setHasCamera(false);
          setCameraError('Camera API not supported');
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(videoDevices.length > 0);
        
        if (videoDevices.length === 0) {
          setCameraError('No camera found on this device');
        }
      } catch (error) {
        console.error('Error checking camera:', error);
        setHasCamera(false);
        setCameraError('Cannot access camera');
      }
    };

    checkCamera();
  }, []);

  const startScanner = async () => {
    if (!hasCamera) {
      onScanFailure?.('Camera not available');
      return;
    }

    setIsLoading(true);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 10,
        aspectRatio: 1.0,
        supportedScanTypes: [],
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText, decodedResult) => {
        setLastScanResult({ 
          success: true, 
          message: `${purpose === 'attendance' ? 'Attendance' : 'Equipment'} recorded successfully!` 
        });
        
        onScanSuccess(decodedText, decodedResult);
        
        setTimeout(() => {
          stopScanner();
          setLastScanResult(null);
        }, 2000);
      },
      (error) => {
        if (!error.includes('NotFoundException')) {
          console.log('Scan error:', error);
          setLastScanResult({ 
            success: false, 
            message: `Scan failed: ${error}` 
          });
          onScanFailure?.(error);
        }
      }
    );

    setIsScanning(true);
    setIsLoading(false);
    setCameraError('');
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Scan className="h-5 w-5" />
          QR Scanner
        </CardTitle>
        <CardDescription className="text-sm">
          {purpose === 'attendance' 
            ? `Scan QR code to mark attendance${roomName ? ` in ${roomName}` : ''}`
            : 'Scan QR code to manage equipment'
          }
        </CardDescription>
        {roomId && roomId !== 'all' && (
          <Badge variant="secondary" className="w-fit">
            Room: {roomName || roomId}
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Scanner Container */}
        <div className="relative border-2 border-dashed border-border rounded-lg min-h-[300px] flex items-center justify-center bg-muted/20">
          <div id="qr-reader" className="w-full h-full">
            {!isScanning && (
              <div className="text-center text-muted-foreground p-6">
                <CameraOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">Scanner Ready</p>
                <p className="text-xs">Click start to begin scanning</p>
                {cameraError && (
                  <p className="text-xs text-destructive mt-2">{cameraError}</p>
                )}
              </div>
            )}
          </div>
          
          {/* Scan Result Overlay */}
          {lastScanResult && (
            <div className={`absolute inset-0 flex items-center justify-center rounded-lg ${
              lastScanResult.success 
                ? 'bg-green-50 border-2 border-green-200 text-green-700' 
                : 'bg-destructive/10 border-2 border-destructive/20 text-destructive'
            }`}>
              <div className="text-center p-4">
                {lastScanResult.success ? (
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                ) : (
                  <XCircle className="h-12 w-12 mx-auto mb-2" />
                )}
                <p className="font-medium text-sm">{lastScanResult.message}</p>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Initializing scanner...</p>
              </div>
            </div>
          )}
        </div>

        {/* Camera Status Alert */}
        {!hasCamera && !cameraError && (
          <Alert variant="destructive" className="py-3">
            <AlertDescription className="text-sm">
              Camera not available. Please check your device permissions.
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button 
              onClick={startScanner} 
              className="flex-1" 
              disabled={!hasCamera || isLoading}
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Starting...' : 'Start Scanner'}
            </Button>
          ) : (
            <Button 
              onClick={stopScanner} 
              variant="outline" 
              className="flex-1"
              size="lg"
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanner
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>• Position QR code within the frame</p>
          <p>• Ensure good lighting for better detection</p>
          <p>• Hold steady until scan completes</p>
        </div>
      </CardContent>
    </Card>
  );
}