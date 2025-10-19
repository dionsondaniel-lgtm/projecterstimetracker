import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function UsersDashboard({ onBack }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [rememberUser, setRememberUser] = useState(false);
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    const rememberedId = localStorage.getItem("rememberedUserDashboardId");
    if (rememberedId) {
      setCurrentUserId(rememberedId);
      setRememberUser(true);
    }
    fetchUsers();
    fetchAllLogs();
  }, []);

  useEffect(() => {
    if (currentUserId) fetchLogs();
    else setLogs([]);
  }, [currentUserId]);

  useEffect(() => {
    if (rememberUser && currentUserId) {
      localStorage.setItem("rememberedUserDashboardId", currentUserId);
    } else {
      localStorage.removeItem("rememberedUserDashboardId");
    }
  }, [rememberUser, currentUserId]);

  async function fetchUsers() {
    const { data, error } = await supabase.from("users").select("*");
    if (error) console.error("fetchUsers error:", error);
    else setUsers(data);
  }

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("logs")
      .select("*, user_id(name)")
      .eq("user_id", currentUserId)
      .eq("date", today)
      .order("time_in", { ascending: false });
    if (error) console.error("fetchLogs error:", error);
    else setLogs(data);
  }

  async function fetchAllLogs() {
    const { data, error } = await supabase
      .from("logs")
      .select("*, user_id(name)")
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });
    if (error) console.error("fetchAllLogs error:", error);
    else setAllLogs(data);
  }

  const formatTime = (time) => (time ? dayjs(time).format("HH:mm:ss") : "-");

  const setBreakTime = async (log) => {
    const input = prompt("Enter break time in minutes:", log.break_time ?? 0);
    const breakTime = parseInt(input, 10);
    if (isNaN(breakTime) || breakTime < 0) {
      alert("Invalid break time.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("logs")
      .update({ break_time: breakTime })
      .eq("id", log.id);
    if (error) {
      console.error("setBreakTime error:", error);
      alert("Failed to set break time.");
    } else {
      await fetchLogs();
    }
    setLoading(false);
  };

  const punchIn = async () => {
    if (!currentUserId) {
      alert("Please select a user.");
      return;
    }

    setLoading(true);

    try {
      const { data: existing, error: existingError } = await supabase
        .from("logs")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("date", today)
        .is("time_out", null);

      if (existingError) throw existingError;

      if (existing.length > 0) {
        alert("You already have an open session.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("logs").insert([
        {
          user_id: currentUserId,
          date: today,
          time_in: new Date().toISOString(),
          status: "Present",
          break_time: 0,
        },
      ]);

      if (error) throw error;

      await fetchLogs();
    } catch (err) {
      console.error("Punch in error:", err);
      alert("Punch in failed.");
    } finally {
      setLoading(false);
    }
  };

  const punchOut = async (log) => {
    if (!log || log.time_out) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("logs")
        .update({ time_out: new Date().toISOString() })
        .eq("id", log.id);
      if (error) throw error;
      await fetchLogs();
    } catch (err) {
      console.error("Punch out error:", err);
      alert("Punch out failed.");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (allLogs.length === 0) {
      alert("No logs to export!");
      return;
    }

    const exportData = allLogs.map((log) => ({
      User: log.user_id?.name || log.user_id,
      Date: log.date,
      "Time In": formatTime(log.time_in),
      "Time Out": formatTime(log.time_out),
      "Break (mins)": log.break_time ?? 0,
      Status: log.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Logs");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, `projecters_time_logs_${today}.xlsx`);
  };

  return (
    <div className="dashboard-container">
    <h1>Projecters Time Tracking Dashboard</h1>

      <button className="btn-back" onClick={onBack}>
        ← Back to Admin
      </button>

      {/* Select user and remember */}
      <div
        className="select-user-row"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label htmlFor="user-select" style={{ fontWeight: "bold" }}>
            Select User:
          </label>
          <select
            id="user-select"
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="input-select"
            style={{ padding: "6px 10px", fontSize: "1rem" }}
          >
            <option value="">-- Select User --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "0.95rem",
            fontWeight: "500",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={rememberUser}
            onChange={() => setRememberUser(!rememberUser)}
            style={{ marginRight: "8px" }}
          />
          Remember my user
        </label>
      </div>

      <button
        className="btn-punch"
        onClick={punchIn}
        disabled={!currentUserId || loading}
      >
        Punch In
      </button>

      <h3>User Logs for {today}</h3>
      {logs.length === 0 ? (
        <p className="empty-row">No logs today.</p>
      ) : (
        <table className="logs-table futuristic-table">
          <thead>
            <tr>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Break (mins)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatTime(log.time_in)}</td>
                <td>{formatTime(log.time_out)}</td>
                <td>
                  <button
                    className="btn-sm btn-info futuristic-btn-info"
                    onClick={() => setBreakTime(log)}
                    title="Click to update break"
                  >
                    {log.break_time ?? 0}
                  </button>
                </td>
                <td className={`status-badge status-${log.status.toLowerCase()}`}>
                  {log.status}
                </td>
                <td>
                  {!log.time_out ? (
                    <button
                      className="btn-sm btn-danger futuristic-btn-danger"
                      onClick={() => punchOut(log)}
                      disabled={loading}
                    >
                      Punch Out
                    </button>
                  ) : (
                    <span className="done-label">Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr />

      <h3>📊 All Logs</h3>
      <button className="btn-export futuristic-btn-export" onClick={exportToExcel}>
        📥 Export All Logs to XLSX
      </button>

      {allLogs.length === 0 ? (
        <p className="empty-row">No logs available.</p>
      ) : (
        <table className="logs-table futuristic-table" style={{ fontSize: "0.9rem" }}>
          <thead>
            <tr>
              <th>User</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Break (mins)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {allLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.user_id?.name || log.user_id}</td>
                <td>{log.date}</td>
                <td>{formatTime(log.time_in)}</td>
                <td>{formatTime(log.time_out)}</td>
                <td>{log.break_time ?? 0}</td>
                <td className={`status-badge status-${log.status.toLowerCase()}`}>
                  {log.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

