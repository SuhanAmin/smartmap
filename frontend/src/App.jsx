import { useState } from 'react'
import Register from   './pages/Register.jsx'
//import Admin from './pages/Admin.jsx'
//import AmbulanceDriver from './pages/ambulances.jsx';
import AdminDashboard from './pages/admin.jsx';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MapPage from './pages/HomePage.jsx';
import AmbMapPage from './pages/AmbulanceRoute.jsx';
import RouteIQVoiceAssistant from './pages/aiTEst.jsx'; 


function App() {
  return(
 <>
 <Router>
  <Routes>
    <Route path="/" element={<MapPage />} />
    <Route path="/register" element={<Register />} />
    <Route path="/ambulance" element={<AmbMapPage />} />
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="/ai" element={<RouteIQVoiceAssistant />} />
  </Routes>
 </Router>
 

 
 </>
)
}

export default App
