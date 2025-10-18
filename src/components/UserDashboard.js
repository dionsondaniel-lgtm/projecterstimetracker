import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Dashboard({ onBack }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    fetchUsers();
    fetchAllLogs();
  }, []);

  useEffect(() => {
    if (currentUserId) fetchLogs();
    else setLogs([]);
  }, [currentUserId]);

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

  const exportToExcel = () => {
    if (allLogs.length === 0) {
      alert("No logs to export!");
      return;
    }

    const exportData = allLogs.map((log) => ({
      User: log.user_id?.name || log.user_id,
      Date: log.date,
      "Time In": log.time_in ? dayjs(log.time_in).format("HH:mm:ss") : "-",
      "Time Out": log.time_out ? dayjs(log.time_out).format("HH:mm:ss") : "-",
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

  // Your punchIn, punchOut, setBreakTime, formatTime functions remain unchanged

  return (
    <div className="dashboard-container">
      <h1>⏱️ Projecters Time Tracker ⏰</h1>

      <button className="btn-back" onClick={onBack}>
        ← Back to Admin
      </button>

      <div className="select-user-row">
        <label htmlFor="user-select">Select User:</label>
        <select
          id="user-select"
          value={currentUserId}
          onChange={(e) => setCurrentUserId(e.target.value)}
          className="input-select"
        >
          <option value="">-- Select User --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <button
        className="btn-punch"
        onClick={punchIn}
        disabled={!currentUserId || loading}
      >
        🏆 Punch In
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
