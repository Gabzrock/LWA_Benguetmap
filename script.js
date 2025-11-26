// --- 1. CONFIGURATION ---

// IMPORTANT: Replace this with your actual Google Sheet CSV public URL
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSosfBP3StMyRUzwI0tUZPsLjPVH1zePCz8gZbTMOzjOvnonbmNCoy5VT46UxO0qdqb-Wm9EqTpXp8y/pub?gid=536600083&single=true&output=csv";

// Map initialization
const map = L.map("map").setView([14.1672, 121.2464], 10); // Example initial center (Los Baños, PH)

// --- 2. BASE MAP LAYER (Satellite View) ---

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 18
  }
).addTo(map);

// --- 3. HELPER FUNCTION TO DETERMINE COLOR ---

/**
 * Returns the color code based on the warning level.
 * @param {number} level - The warning level (1, 2, or 3).
 * @returns {string} The hex color code.
 */
function getColor(level) {
  switch (String(level).trim()) {
    case "1":
      return "#FFFF00"; // Yellow
    case "2":
      return "#FFA500"; // Orange
    case "3":
      return "#FF0000"; // Red
    default:
      return "#808080"; // Default to Grey for unknown
  }
}

// --- 4. DATA FETCHING AND MAPPING LOGIC ---

Papa.parse(CSV_URL, {
  download: true,
  header: true, // Assuming the first row contains 'lat, lng, warning_level, icon_url'
  skipEmptyLines: true,
  complete: function (results) {
    console.log("Parsed Data:", results.data);

    results.data.forEach(function (row) {
      const lat = parseFloat(row.lat);
      const lng = parseFloat(row.lng);
      const warningLevel = row.warning_level;
      const iconUrl = row.icon_url;

      // Skip rows where coordinates are invalid
      if (isNaN(lat) || isNaN(lng)) {
        console.warn("Invalid coordinates for row:", row);
        return;
      }

      // A. Create the Buffer (using Turf.js)
      try {
        const point = turf.point([lng, lat]);
        // Create a 20 km buffer. Turf buffer expects (point, distance, units)
        const buffer = turf.buffer(point, 20, { units: "kilometers" });
        const geoJson = buffer.geometry;
        const bufferColor = getColor(warningLevel);

        // Add the buffer as a GeoJSON layer to the map
        L.geoJSON(geoJson, {
          style: {
            color: bufferColor,
            fillColor: bufferColor,
            fillOpacity: 0.3, // Semi-transparent fill
            weight: 2 // Border thickness
          }
        }).addTo(map);
      } catch (e) {
        console.error("Turf.js Buffer Error:", e, "for row:", row);
      }

      // B. Add the Marker (with custom icon)

      let markerIcon;
      if (iconUrl) {
        // Create a custom icon if icon_url is provided
        markerIcon = L.icon({
          iconUrl: iconUrl,
          iconSize: [32, 32], // size of the icon
          iconAnchor: [16, 32], // point of the icon which will correspond to marker's location
          popupAnchor: [0, -30] // point from which the popup should open relative to the iconAnchor
        });
      } else {
        // Fallback to Leaflet's default icon if no icon_url is given
        markerIcon = new L.DivIcon({
          className: "custom-div-icon",
          html: `<div style="background-color: ${getColor(
            warningLevel
          )}; width: 10px; height: 10px; border-radius: 50%; border: 1px solid #333;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
      }

      L.marker([lat, lng], { icon: markerIcon })
        .bindPopup(
          `<b>Warning Level:</b> ${warningLevel}<br>Lat: ${lat.toFixed(
            4
          )}, Lng: ${lng.toFixed(4)}`
        )
        .addTo(map);
    });
  },
  error: function (err) {
    console.error("PapaParse Error:", err);
    alert("Failed to load CSV data. Check the console for details.");
  }
});