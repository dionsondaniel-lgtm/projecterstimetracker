import React from "react";

export default function AdminDashboard({ toRegister, toDashboard }) {
  return (
    <div className="admin-container futuristic-admin-container">
      <h2 className="admin-title futuristic-admin-title">
        🚀 Projecters Time Tracker - Track Your Time Like a Pro! ⏳
      </h2>
      <div className="admin-buttons">
        <button className="btn-primary admin-btn futuristic-btn" onClick={toRegister}>
          🧑‍💼 Register Users
        </button>
        <button className="btn-primary admin-btn futuristic-btn" onClick={toDashboard}>
          📋 View User Logs
        </button>
      </div>
    </div>
  );
}
