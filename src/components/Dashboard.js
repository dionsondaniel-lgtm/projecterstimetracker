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
  const [showAllLogs, setShowAllLogs] = useState(false);

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

  const punchIn = async () => {
    if (!currentUserId) {
      alert("Select a user");
      return;
    }
    setLoading(true);

    const { data: existing, error: exErr } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", currentUserId)
      .eq("date", today)
      .is("time_out", null);

    if (exErr) {
      console.error("existing check error:", exErr);
      setLoading(false);
      return;
    }
    if (existing.length > 0) {
      alert("You already punched in without punching out.");
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
    if (error) console.error("punchIn error:", error);
    await fetchLogs();
    setLoading(false);
  };

  const punchOut = async (log) => {
    if (!log || log.time_out) {
      alert("Already punched out");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("logs")
      .update({ time_out: new Date().toISOString() })
      .eq("id", log.id);
    if (error) console.error("punchOut error:", error);
    await fetchLogs();
    setLoading(false);
  };

  const setBreakTime = async (log) => {
    if (!log) return;
    const mins = prompt("Enter break minutes:", log.break_time ?? "0");
    if (mins === null) return;
    const m = parseInt(mins);
    if (isNaN(m) || m < 0) {
      alert("Invalid break time");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("logs")
      .update({ break_time: m })
      .eq("id", log.id);
    if (error) console.error("setBreakTime error:", error);
    await fetchLogs();
    setLoading(false);
  };

  const deleteLog = async (logId) => {
    const pass = prompt("Enter admin password to delete:");
    if (pass !== "1234") {
      alert("❌ Incorrect password!");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this log?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("logs").delete().eq("id", logId);
    if (error) {
      console.error("deleteLog error:", error);
      alert("Failed to delete log.");
      return;
    }

    await fetchAllLogs(); // Refresh logs
    alert("✅ Log deleted successfully.");
  };

  const formatTime = (iso) => {
    if (!iso) return "-";
    return dayjs(iso).format("HH:mm:ss");
  };
// Add this new function inside Dashboard component:

const updateLog = async (log) => {
  const pass = prompt("Enter admin password to update:");
  if (pass !== "1234") {
    alert("❌ Incorrect password!");
    return;
  }

  // Prompt for new Time In, Time Out and Break (minutes)
  const newTimeIn = prompt(
    "Enter new Time In (YYYY-MM-DD HH:mm:ss) or leave blank to keep current:",
    log.time_in ? dayjs(log.time_in).format("YYYY-MM-DD HH:mm:ss") : ""
  );
  if (newTimeIn !== null && newTimeIn !== "") {
    if (!dayjs(newTimeIn, "YYYY-MM-DD HH:mm:ss", true).isValid()) {
      alert("Invalid Time In format!");
      return;
    }
  }

  const newTimeOut = prompt(
    "Enter new Time Out (YYYY-MM-DD HH:mm:ss) or leave blank to keep current:",
    log.time_out ? dayjs(log.time_out).format("YYYY-MM-DD HH:mm:ss") : ""
  );
  if (newTimeOut !== null && newTimeOut !== "") {
    if (!dayjs(newTimeOut, "YYYY-MM-DD HH:mm:ss", true).isValid()) {
      alert("Invalid Time Out format!");
      return;
    }
  }

  const newBreak = prompt(
    "Enter new Break minutes or leave blank to keep current:",
    log.break_time ?? "0"
  );
  if (newBreak !== null && newBreak !== "") {
    const b = parseInt(newBreak);
    if (isNaN(b) || b < 0) {
      alert("Invalid Break time!");
      return;
    }
  }

  setLoading(true);

  const updates = {};
  if (newTimeIn !== null && newTimeIn !== "") updates.time_in = dayjs(newTimeIn).toISOString();
  if (newTimeOut !== null && newTimeOut !== "") updates.time_out = dayjs(newTimeOut).toISOString();
  if (newBreak !== null && newBreak !== "") updates.break_time = parseInt(newBreak);

  const { error } = await supabase.from("logs").update(updates).eq("id", log.id);
  setLoading(false);

  if (error) {
    console.error("updateLog error:", error);
    alert("Failed to update log.");
  } else {
    alert("✅ Log updated successfully.");
    fetchAllLogs();
  }
};

  return (
    <div className="container">
      <h1>⏱️ Projecters Time Tracker ⏰</h1>

      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 20 }}>
        ← Back to Admin
      </button>

      <div style={{ marginBottom: 15 }}>
        <label htmlFor="user-select" style={{ fontWeight: "bold" }}>
          Select User:
        </label>
        <select
          id="user-select"
          value={currentUserId}
          onChange={(e) => setCurrentUserId(e.target.value)}
          className="input-select"
          style={{ marginLeft: 10 }}
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
        className="btn-primary"
        onClick={punchIn}
        disabled={!currentUserId || loading}
        style={{ marginBottom: 20 }}
      >
        🏆 Punch In
      </button>

      <h3>User Logs for {today}</h3>
      {logs.length === 0 ? (
        <p className="empty-row">No logs today.</p>
      ) : (
        <table className="logs-table">
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
                    className="btn-sm btn-info"
                    onClick={() => setBreakTime(log)}
                    title="Click to update break"
                  >
                    {log.break_time ?? 0}
                  </button>
                </td>
                <td>{log.status}</td>
                <td>
                  {!log.time_out ? (
                    <button
                      className="btn-sm btn-danger"
                      onClick={() => punchOut(log)}
                      disabled={loading}
                    >
                      Punch Out
                    </button>
                  ) : (
                    <span>Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr style={{ margin: "40px 0" }} />

      <div style={{ marginBottom: 15 }}>
        <button
          className="btn-secondary"
          onClick={() => setShowAllLogs((prev) => !prev)}
          style={{ marginRight: 10 }}
        >
          {showAllLogs ? "🙈 Hide All Logs" : "👁️ View All Logs"}
        </button>

        <button className="btn-primary" onClick={exportToExcel}>
          📥 Download All Logs (Excel)
        </button>
      </div>

      {showAllLogs && (
        <>
          {allLogs.length === 0 ? (
            <p className="empty-row">No logs available.</p>
          ) : (
            <table className="logs-table" style={{ fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Break (mins)</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                    <td>{log.status}</td>
                    <td>
			  <button
			    className="btn-sm btn-danger"
			    onClick={() => deleteLog(log.id)}
			    style={{ marginRight: 8 }}
			  >
			    🗑 Delete
			  </button>
			  <button
			    className="btn-sm btn-secondary"
			    onClick={() => updateLog(log)}
			  >
			    ✏️ Update
			  </button>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
