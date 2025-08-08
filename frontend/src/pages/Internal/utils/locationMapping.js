// utils/locationMapping.js
export const mapLocationToMunicipality = (location, associates) => {
    return associates?.find(associate =>
        associate.name === `Município de ${location}` ||
        associate.name.replace("Município de ", "") === location
    );
};

export const mapMunicipalityToLocation = (municipalityId, associates) => {
    const associate = associates?.find(a => a.pk === municipalityId);
    return associate ? associate.name.replace("Município de ", "") : null;
};

// Hook para sincronização automática
export const useLocationSync = (selectedLocation, selectedAssociate, metaData, setSelectedAssociate) => {
    // Quando localização muda, actualizar município automaticamente
    React.useEffect(() => {
        if (selectedLocation && metaData?.associates) {
            const matchedAssociate = mapLocationToMunicipality(selectedLocation, metaData.associates);
            if (matchedAssociate && matchedAssociate.pk !== selectedAssociate) {
                setSelectedAssociate(matchedAssociate.pk);
            }
        }
    }, [selectedLocation, metaData?.associates]);
};