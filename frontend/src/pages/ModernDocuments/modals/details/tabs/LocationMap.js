import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Box, Alert, CircularProgress, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './leaflet-fix.css';

// Fix ícones do Leaflet - fora do componente
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LocationMap = ({ lat, lng }) => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef();

    useEffect(() => {
        // Simular carregamento
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // Validar coordenadas
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Debug
    console.log('LocationMap - Coordenadas:', { lat, lng, latitude, longitude });

    if (isNaN(latitude) || isNaN(longitude)) {
        return <Alert severity="warning">Coordenadas inválidas: lat={lat}, lng={lng}</Alert>;
    }

    if (error) return <Alert severity="warning">{error}</Alert>;

    if (loading) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '250px',
                borderRadius: 1,
                border: '1px solid #ddd',
                mt: 2,
            }}>
                <CircularProgress size={24} sx={{ mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                    A carregar mapa...
                </Typography>
            </Box>
        );
    }

    try {
        return (
            <Box sx={{
                position: 'relative',
                width: '100%',
                height: '250px',
                borderRadius: 1,
                overflow: 'hidden',
                mt: 2,
                border: '1px solid #ddd',
                backgroundColor: '#f5f5f5',
                '& .leaflet-container': {
                    height: '100% !important',
                    width: '100% !important',
                    borderRadius: 1,
                },
                '& .leaflet-tile': {
                    maxWidth: 'none !important',
                    maxHeight: 'none !important',
                }
            }}>
                <MapContainer
                    ref={mapRef}
                    center={[latitude, longitude]}
                    zoom={15}
                    style={{
                        height: '100%',
                        width: '100%',
                        zIndex: 1
                    }}
                    zoomControl={true}
                    scrollWheelZoom={false}
                    key={`${latitude}-${longitude}`} // Force re-render when coordinates change
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={18}
                        subdomains={['a', 'b', 'c']}
                    />
                    <Marker position={[latitude, longitude]}>
                        <Popup>
                            Localização do Pedido<br />
                            Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </Popup>
                    </Marker>
                </MapContainer>
            </Box>
        );
    } catch (error) {
        console.error('Erro ao renderizar mapa:', error);
        return <Alert severity="error">Erro ao carregar o mapa: {error.message}</Alert>;
    }
};

export default LocationMap;