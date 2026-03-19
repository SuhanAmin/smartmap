import React, { useState, useCallback } from "react";
import {
  GoogleMap,
  LoadScript,
  DirectionsRenderer,
} from "@react-google-maps/api";
import axios from "axios";

const containerStyle = { width: "100%", height: "100vh" };
// Center map near the main traffic zone
const MAP_CENTER = { lat: 12.8735, lng: 74.8510 };

// Precise Coordinates for Routing
const LOCATIONS = {
  JYOTHI_CIRCLE: { lat: 12.8702, lng: 74.8465 },
  MALLIKATTE_CIRCLE: { lat: 12.8795, lng: 74.8595 },
  BALMATTA_WAYPOINT: { lat: 12.8710, lng: 74.8525 }, // Forces the "South" bypass
};

export default function MapPage() {
  const [directions, setDirections] = useState(null);
  const [status, setStatus] = useState("System Ready");
  const [loadData, setLoadData] = useState({ current: 0, max: 5 });

  const startNewJourney = async () => {
    try {
      // 1. Fetch congestion data from your backend
      const res = await axios.post("http://localhost:3000/get-route");
      const { route, currentLoad, maxCapacity } = res.data;

      setLoadData({ current: currentLoad, max: maxCapacity });

      const service = new window.google.maps.DirectionsService();

      // 2. Define Base Route Options
      let routeOptions = {
        origin: LOCATIONS.JYOTHI_CIRCLE,
        destination: LOCATIONS.MALLIKATTE_CIRCLE,
        travelMode: window.google.maps.TravelMode.DRIVING,
      };

      // 3. Apply Bypass Logic
      if (route === "ALTERNATIVE") {
        console.log("Applying BALMATTA BYPASS");
        routeOptions.waypoints = [
          {
            location: LOCATIONS.BALMATTA_WAYPOINT,
            stopover: false, // ensures a smooth line without a 'stop' marker
          },
        ];
        
        // We set this to true to ensure it doesn't try to snap back to the busy road
        routeOptions.optimizeWaypoints = false; 

        setStatus(`🚨 CONGESTION ALERT: Diverting via Balmatta (${currentLoad}/${maxCapacity})`);
      } else {
        setStatus(`✅ ROUTE CLEAR: Via Bunts Hostel (${currentLoad}/${maxCapacity})`);
      }

      // 4. Request Route
      service.route(routeOptions, (result, status) => {
        if (status === "OK") {
          setDirections(result);
        } else {
          console.error("Directions Error:", status);
          setStatus("❌ Google Maps Routing Failed");
        }
      });
    } catch (err) {
      console.error("Backend Error:", err);
      setStatus("❌ Backend Connection Failed");
    }
  };

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div style={{ position: "relative" }}>
        
        {/* CONTROL PANEL */}
        <div style={styles.panel}>
          <h2 style={styles.title}>RouteIQ <span style={{fontSize: '12px', fontWeight: 'normal'}}>v2.0</span></h2>

          <div style={styles.meterLabel}>
            <span>Junction Load</span>
            <span>{loadData.current} / {loadData.max}</span>
          </div>
          
          <div style={styles.meterContainer}>
            <div
              style={{
                ...styles.meterBar,
                width: `${Math.min((loadData.current / loadData.max) * 100, 100)}%`,
                backgroundColor: loadData.current >= loadData.max ? "#f44336" : "#4caf50",
              }}
            />
          </div>

          <button onClick={startNewJourney} style={styles.btn}>
            🚗 Start New Journey
          </button>

          <div style={{
            ...styles.status, 
            color: status.includes('🚨') ? '#d32f2f' : '#2e7d32',
            backgroundColor: status.includes('🚨') ? '#ffebee' : '#e8f5e9'
          }}>
            {status}
          </div>
        </div>

        {/* MAP COMPONENT */}
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={MAP_CENTER}
          zoom={15}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
          }}
        >
          {directions && (
            <DirectionsRenderer 
              directions={directions} 
              options={{
                polylineOptions: {
                  strokeColor: status.includes('🚨') ? "#ff5722" : "#2196f3",
                  strokeWeight: 6,
                }
              }}
            />
          )}
        </GoogleMap>
      </div>
    </LoadScript>
  );
}

const styles = {
  panel: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    background: "rgba(255, 255, 255, 0.95)",
    padding: "20px",
    borderRadius: "12px",
    width: "280px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    fontFamily: "sans-serif",
  },
  title: { margin: "0 0 15px 0", color: "#333", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
    marginTop: "15px",
    transition: "background 0.2s"
  },
  meterLabel: { display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px", color: "#666" },
  meterContainer: { width: "100%", height: "8px", backgroundColor: "#eee", borderRadius: "4px", overflow: "hidden" },
  meterBar: { height: "100%", transition: "width 0.5s ease-in-out" },
  status: {
    marginTop: "15px",
    fontWeight: "600",
    fontSize: "12px",
    padding: "10px",
    borderRadius: "4px",
    textAlign: "center",
    lineHeight: "1.4"
  },
};