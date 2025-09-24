/* global google */
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Box, Typography, Skeleton, Alert } from '@mui/material';

const LocationMap = ({ lat, lng }) => {
    const mapRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setError("A chave da API do Google Maps não está configurada.");
            setLoading(false);
            return;
        }

        const loader = new Loader({
            apiKey: apiKey,
            version: "weekly",
        });

        loader.load().then(async () => {
            const { Map } = await google.maps.importLibrary("maps");
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

            const position = { lat: parseFloat(lat), lng: parseFloat(lng) };

            if (mapRef.current) {
                const map = new Map(mapRef.current, {
                    center: position,
                    zoom: 16,
                    mapId: 'AINTAR_DOCUMENT_MAP',
                    disableDefaultUI: true,
                    zoomControl: true,
                });

                new AdvancedMarkerElement({ map, position, title: 'Localização do Pedido' });
            }
            setLoading(false);
        }).catch(e => {
            console.error("Erro ao carregar o mapa:", e);
            setError("Não foi possível carregar o mapa.");
            setLoading(false);
        });

    }, [lat, lng]);

    if (error) return <Alert severity="warning">{error}</Alert>;

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '250px', borderRadius: 1, overflow: 'hidden', mt: 2 }}>
            {loading && <Skeleton variant="rectangular" width="100%" height="100%" />}
            <div ref={mapRef} style={{ width: '100%', height: '100%', display: loading ? 'none' : 'block' }} />
        </Box>
    );
};

export default LocationMap;