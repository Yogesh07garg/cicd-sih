import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface LocationData {
  latitude: number;
  longitude: number;
}

interface LocationState {
  location: LocationData | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => Promise<void>;
}

export const useLocation = (): LocationState => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = async (): Promise<void> => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by this browser';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);

    // First check if permission is already granted
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        const errorMsg = 'Location access denied. Please enable in browser settings.';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }
    } catch (permError) {
      console.log('Permission API not supported, continuing with geolocation request');
    }

    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000, // 15 seconds
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(newLocation);
          setError(null);
          setLoading(false);
          toast.success('Location access granted ✅');
          resolve();
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your device settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'An unknown error occurred while retrieving location.';
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
          toast.error(errorMessage);
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  // Auto-request location on hook initialization
  useEffect(() => {
    requestLocation();
  }, []);

  return {
    location,
    error,
    loading,
    requestLocation
  };
};
