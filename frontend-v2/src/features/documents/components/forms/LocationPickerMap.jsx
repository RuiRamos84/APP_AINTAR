import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Portugal center (fallback when no coordinates)
const DEFAULT_CENTER = [39.5, -8.0];
const DEFAULT_ZOOM = 7;
const MARKER_ZOOM = 15;

/**
 * Component that handles map click events
 */
const MapClickHandler = ({ onLocationSelect }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

/**
 * Component that recenters map when coordinates change
 */
const MapRecenter = ({ lat, lng }) => {
    const map = useMap();
    const prevCoordsRef = useRef(null);

    useEffect(() => {
        if (lat && lng) {
            const key = `${lat},${lng}`;
            if (prevCoordsRef.current !== key) {
                prevCoordsRef.current = key;
                map.flyTo([lat, lng], MARKER_ZOOM, { duration: 0.8 });
            }
        }
    }, [lat, lng, map]);

    return null;
};

/**
 * Interactive map for picking GPS coordinates.
 * Click on the map to set/adjust the pin location.
 *
 * @param {string|number} lat - Latitude
 * @param {string|number} lng - Longitude
 * @param {function} onLocationSelect - Callback(lat, lng) when location is selected
 */
const LocationPickerMap = ({ lat, lng, onLocationSelect }) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const hasCoords = !isNaN(latitude) && !isNaN(longitude);

    const center = hasCoords ? [latitude, longitude] : DEFAULT_CENTER;
    const zoom = hasCoords ? MARKER_ZOOM : DEFAULT_ZOOM;

    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Clique no mapa para definir ou ajustar a localização.
            </Typography>
            <Box sx={{
                height: 280,
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                '& .leaflet-container': {
                    height: '100%',
                    width: '100%',
                    zIndex: 1,
                    cursor: 'crosshair',
                },
            }}>
                <MapContainer
                    center={center}
                    zoom={zoom}
                    scrollWheelZoom
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onLocationSelect={onLocationSelect} />
                    <MapRecenter lat={hasCoords ? latitude : null} lng={hasCoords ? longitude : null} />
                    {hasCoords && (
                        <Marker position={[latitude, longitude]}>
                            <Popup>
                                Lat: {latitude.toFixed(6)}<br />
                                Lng: {longitude.toFixed(6)}
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </Box>
        </Box>
    );
};

export default LocationPickerMap;
