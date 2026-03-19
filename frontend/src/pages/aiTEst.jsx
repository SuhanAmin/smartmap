import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, LoadScript } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

let assistantActive = false;
let lastContext = null;

export default function RouteIQVoiceAssistant() {
  const [center, setCenter] = useState({ lat: 12.8766, lng: 74.8479 }); // fallback
  const [heading, setHeading] = useState(0);
  const [nearbyRoutes, setNearbyRoutes] = useState([]);
  const recognitionRef = useRef(null);

  /* ===============================
     1️⃣ Get location continuously
     =============================== */
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.watchPosition(
      (pos) => {
        setCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setHeading(pos.coords.heading || 0);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  /* ===============================
     2️⃣ Start wake-word listener
     =============================== */
  useEffect(() => {
    startWakeWordListener();
  }, []);

  const startWakeWordListener = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text =
        event.results[event.results.length - 1][0].transcript
          .toLowerCase()
          .trim();

      console.log("Heard:", text);

      if (text.includes("hello iq")) {
        assistantActive = true;
        speak("Yes, how can I help you?");
        analyzeRoads();
        return;
      }

      if (assistantActive) {
        handleQuery(text);
      }
    };

    recognition.onend = () => recognition.start();
    recognition.start();

    recognitionRef.current = recognition;
  };

  /* ===============================
     3️⃣ Analyze nearby roads (read-only)
     =============================== */
  const analyzeRoads = () => {
    if (!window.google || !center) return;

    const service = new window.google.maps.DirectionsService();

    const testPoints = [
      { lat: center.lat + 0.005, lng: center.lng },
      { lat: center.lat, lng: center.lng + 0.005 },
      { lat: center.lat - 0.005, lng: center.lng },
    ];

    let routes = [];

    testPoints.forEach((dest) => {
      service.route(
        {
          origin: center,
          destination: dest,
          travelMode: "DRIVING",
        },
        (res, status) => {
          if (status === "OK") {
            const leg = res.routes[0].legs[0];
            const bearing =
              window.google.maps.geometry.spherical.computeHeading(
                new window.google.maps.LatLng(center),
                leg.end_location
              );

            routes.push({
              bearing,
              place: leg.end_address.split(",")[0],
              distance: leg.distance.text,
            });

            setNearbyRoutes([...routes]);
          }
        }
      );
    });
  };

  /* ===============================
     4️⃣ Direction logic
     =============================== */
  const getTurn = (roadBearing) => {
    const diff = (roadBearing - heading + 360) % 360;
    if (diff < 45 || diff > 315) return "STRAIGHT";
    if (diff >= 45 && diff < 135) return "RIGHT";
    return "LEFT";
  };

  /* ===============================
     5️⃣ Handle questions
     =============================== */
  const handleQuery = (query) => {
    if (query.includes("right")) answerDirection("RIGHT");
    else if (query.includes("left")) answerDirection("LEFT");
    else if (query.includes("straight")) answerDirection("STRAIGHT");
    else if (query.includes("how far") && lastContext)
      speak(`${lastContext.place} is about ${lastContext.distance} away.`);
    else if (query.includes("traffic"))
      speak("Traffic is currently moderate on this route.");
  };

  /* ===============================
     6️⃣ Speak route info (NO rerouting)
     =============================== */
  const answerDirection = (dir) => {
    for (let r of nearbyRoutes) {
      if (getTurn(r.bearing) === dir) {
        lastContext = r;
        speak(`The ${dir.toLowerCase()} road goes towards ${r.place}.`);
        return;
      }
    }
    speak(`I cannot clearly detect a ${dir.toLowerCase()} route here.`);
  };

  /* ===============================
     7️⃣ Text to Speech
     =============================== */
  const speak = (text) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 0.95;
    speechSynthesis.speak(u);
  };

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={["geometry"]}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={17}
      />
    </LoadScript>
  );
}
