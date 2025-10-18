// src/App.js
import React, { useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserDashboard from "./components/UserDashboard"; // ✅ NEW
import "./App.css";

export default function App() {
  const [view, setView] = useState("admin"); // admin, register, dashboard, userDashboard

  return (
    <>
      {view === "admin" && (
        <AdminDashboard
          toRegister={() => setView("register")}
          toDashboard={() => setView("dashboard")}
          toUserDashboard={() => setView("userDashboard")} // ✅ Add handler
        />
      )}

      {view === "register" && (
        <Register onBack={() => setView("admin")} />
      )}

      {view === "dashboard" && (
        <Dashboard onBack={() => setView("admin")} />
      )}

      {view === "userDashboard" && (
        <UserDashboard onBack={() => setView("admin")} /> // ✅ Add component
      )}
    </>
  );
}
