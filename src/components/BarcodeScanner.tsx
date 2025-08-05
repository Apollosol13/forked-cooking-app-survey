import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, X, Package, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onFoodDetected: (foodItems: string[]) => void;
  onClose: () => void;
}

interface FoodProduct {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  nutriments?: any;
  image_url?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onFoodDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [scannedProduct, setScannedProduct] = useState<FoodProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const initScanner = async () => {
      try {
        // Check if device has camera
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          setError('No camera found on this device');
          return;
        }

        // Initialize barcode reader
        codeReaderRef.current = new BrowserMultiFormatReader();
        setIsScanning(true);

        // Start scanning
        if (videoRef.current) {
          await codeReaderRef.current.decodeFromVideoDevice(
            undefined, // Use default camera
            videoRef.current,
            (result, error) => {
              if (result) {
                console.log('Barcode detected:', result.getText());
                handleBarcodeDetected(result.getText());
              }
              if (error && !(error.name === 'NotFoundException')) {
                console.error('Barcode scan error:', error);
              }
            }
          );
        }
      } catch (err) {
        console.error('Failed to initialize camera:', err);
        setError('Failed to access camera. Please allow camera permissions.');
        setIsScanning(false);
      }
    };

    initScanner();

    // Cleanup
    return () => {
      // ZXing cleanup handled automatically
      console.log('Scanner cleanup completed');
    };
  }, []);

  const handleBarcodeDetected = async (barcode: string) => {
    console.log('🔍 Looking up barcode:', barcode);
    setIsLoading(true);
    
    try {
      // Query Open Food Facts API
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        setScannedProduct(product);
        
        // Extract food name and ingredients
        const foodItems: string[] = [];
        
        if (product.product_name) {
          foodItems.push(product.product_name);
        }
        
        // Parse ingredients if available
        if (product.ingredients_text) {
          const ingredients = product.ingredients_text
            .split(/[,;]/)
            .map((ing: string) => ing.trim().replace(/[()%].*/, '').trim())
            .filter((ing: string) => ing.length > 2 && ing.length < 30)
            .slice(0, 5); // Take first 5 ingredients
          
          foodItems.push(...ingredients);
        }
        
        if (foodItems.length > 0) {
          console.log('✅ Food items extracted:', foodItems);
          onFoodDetected(foodItems);
        } else {
          setError('Could not extract ingredients from this product');
        }
      } else {
        setError('Product not found in database. Try scanning a different barcode.');
      }
    } catch (err) {
      console.error('Failed to lookup product:', err);
      setError('Failed to lookup product. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Stop scanning and close
    setIsScanning(false);
    onClose();
  };

  const handleRetry = () => {
    setError('');
    setScannedProduct(null);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Scan Barcode
        </h2>
        <button
          onClick={handleClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        {isScanning && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white border-dashed w-64 h-32 flex items-center justify-center bg-black bg-opacity-30">
                <p className="text-white text-sm text-center">
                  Position barcode within this frame
                </p>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Looking up product...</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center p-6">
            <div className="text-center text-white max-w-sm">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-bold mb-2">Scanner Error</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Product Found */}
        {scannedProduct && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center p-6">
            <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4 text-center">Product Found!</h3>
              
              {scannedProduct.image_url && (
                <img 
                  src={scannedProduct.image_url} 
                  alt={scannedProduct.product_name}
                  className="w-24 h-24 object-cover rounded-lg mx-auto mb-4"
                />
              )}
              
              <h4 className="font-medium text-white text-center mb-2">
                {scannedProduct.product_name}
              </h4>
              
              {scannedProduct.brands && (
                <p className="text-sm text-gray-400 text-center mb-4">
                  {scannedProduct.brands}
                </p>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Scan Another
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {isScanning && !isLoading && !error && (
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          <div className="flex items-center justify-center text-gray-400 text-sm">
            <Camera className="w-4 h-4 mr-2" />
            Point your camera at a barcode to scan
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner; 