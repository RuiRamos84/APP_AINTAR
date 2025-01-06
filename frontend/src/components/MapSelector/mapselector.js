/* global google */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

const MapSelector = ({ lat, lng, onLocationSelect }) => {
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);

  const initializeMap = useCallback(() => {
    if (!mapRef.current) {
      console.error("Map container not found");
      setError("Map container not found");
      setIsLoading(false);
      return;
    }

    if (!window.google || !window.google.maps) {
      console.error("Google Maps API not loaded");
      setError("Google Maps API failed to load");
      setIsLoading(false);
      return;
    }

    try {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: parseFloat(lat) || 39.5, lng: parseFloat(lng) || -8.0 },
        zoom: 8,
      });

      setMap(newMap);

      const newMarker = new window.google.maps.Marker({
        position: {
          lat: parseFloat(lat) || 39.5,
          lng: parseFloat(lng) || -8.0,
        },
        map: newMap,
        draggable: true,
      });

      setMarker(newMarker);

      newMap.addListener("click", (e) => {
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        newMarker.setPosition({ lat: clickedLat, lng: clickedLng });
        onLocationSelect(clickedLat, clickedLng);
      });

      newMarker.addListener("dragend", () => {
        const position = newMarker.getPosition();
        onLocationSelect(position.lat(), position.lng());
      });

      setIsLoading(false);
    } catch (err) {
      console.error("Error initializing map:", err);
      setError(`Failed to initialize map: ${err.message}`);
      setIsLoading(false);
    }
  }, [lat, lng, onLocationSelect]);

  function loadGoogleMapsScript() {
    if (!document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        console.error("Failed to load Google Maps script");
      };
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }

  useEffect(() => {
    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (mapRef.current && window.google) {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
      });
      setMap(mapInstance);
    } else {
      console.error("Map container not found or google is not defined");
    }
  }, []);

  return (
    <div>
      <div ref={mapRef} style={{ height: "400px", width: "100%" }}></div>
    </div>
  );
};

export default MapSelector;
