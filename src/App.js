// src/App.js
import React, { useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import "./App.css";

export default function App() {
  const [view, setView] = useState("admin"); // admin, register, dashboard

  return (
    <>
      {view === "admin" && (
        <AdminDashboard
          toRegister={() => setView("register")}
          toDashboard={() => setView("dashboard")}
        />
      )}

      {view === "register" && (
        <Register onBack={() => setView("admin")} />
      )}

      {view === "dashboard" && (
        <Dashboard onBack={() => setView("admin")} />
      )}
    </>
  );
}
