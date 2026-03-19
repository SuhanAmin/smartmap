import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from "@react-google-maps/api";
import mqtt from "mqtt";

const containerStyle = { width: "100%", height: "100vh" };
const BUNTS_HOSTEL = { lat: 12.8765957, lng: 74.8478694 };
const MQTT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const MQTT_TOPIC = "routeiq/ambulance/junction";

export default function AmbMapPage() {
  const [directions, setDirections] = useState(null);
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [status, setStatus] = useState("SYSTEM READY");
  
  const mqttRef = useRef(null);
  const intervalRef = useRef(null);
  const currentAction = useRef("IDLE"); // IDLE, EN_ROUTE, PASSED

  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);
    client.on("connect", () => console.log("✅ MQTT Connected"));
    mqttRef.current = client;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      client.end();
    };
  }, []);

  const runSimulation = (originPoint, routeName) => {
    // Cleanup previous run
    if (intervalRef.current) clearInterval(intervalRef.current);
    currentAction.current = "IDLE";
    setStatus(`STARTING ROUTE: ${routeName}`);

    const service = new window.google.maps.DirectionsService();
    service.route({
      origin: originPoint,
      destination: "Mallikatte Circle, Mangalore",
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (res, status) => {
      if (status === "OK") {
        setDirections(res);
        animateAmbulance(res, routeName);
      }
    });
  };

  const animateAmbulance = (routeResult, routeName) => {
    const path = routeResult.routes[0].overview_path;
    let i = 0;

    intervalRef.current = setInterval(() => {
      if (i >= path.length) {
        clearInterval(intervalRef.current);
        return;
      }

      const pos = path[i];
      setAmbulancePos({ lat: pos.lat(), lng: pos.lng() });

      // Calculate distance to Bunts Hostel
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        pos, new window.google.maps.LatLng(BUNTS_HOSTEL)
      );

      // --- LOGIC: TRIGGER ONLY ONCE ---
      
      // 1. Entering the Route (within 400m of junction, heading toward it)
      if (distance < 400 && distance > 50 && currentAction.current === "IDLE") {
        currentAction.current = "EN_ROUTE";
        setStatus(`EMERGENCY: CLEARING ${routeName} ROUTE`);
        mqttRef.current.publish(MQTT_TOPIC, `ENTER_${routeName}`);
      } 
      
      // 2. Passing the Junction (more than 50m away after being close)
      else if (distance > 60 && currentAction.current === "EN_ROUTE" && i > (path.length / 2)) {
        currentAction.current = "PASSED";
        setStatus("NORMAL MODE RESUMED");
        mqttRef.current.publish(MQTT_TOPIC, "EXIT");
      }

      i++;
    }, 600);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Control Panel */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10, background: "white", padding: "15px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
        <h4 style={{ margin: "0 0 10px 0" }}>Ambulance Controls</h4>
        <button onClick={() => runSimulation("Jyothi Circle, Mangalore", "JYOTHI")} style={btnStyle}>From Jyothi</button>
        <button onClick={() => runSimulation("PVS Circle, Mangalore", "PVS")} style={btnStyle}>From PVS</button>
        <div style={{ marginTop: "10px", fontSize: "12px", color: "red", fontWeight: "bold" }}>{status}</div>
      </div>

      <LoadScript googleMapsApiKey={import .meta.env.VITE_GOOGLE_MAPS_API_KEY} libraries={["geometry"]}>
        <GoogleMap mapContainerStyle={containerStyle} center={BUNTS_HOSTEL} zoom={16}>
          {directions && <DirectionsRenderer directions={directions} />}
          {ambulancePos && <Marker position={ambulancePos} label="🚑" />}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}

const btnStyle = { display: "block", width: "100%", marginBottom: "5px", padding: "8px", cursor: "pointer" };