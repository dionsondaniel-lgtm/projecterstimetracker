import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";

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
      await fetchAllLogs();
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
      await fetchAllLogs();
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
      await fetchAllLogs();
    } catch (err) {
      console.error("Punch out error:", err);
      alert("Punch out failed.");
    } finally {
      setLoading(false);
    }
  };

const exportToExcel = async () => {
  if (allLogs.length === 0) {
    alert("No logs to export!");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("All Logs");

  worksheet.columns = [
    { header: "User", key: "user", width: 20 },
    { header: "Date", key: "date", width: 15 },
    { header: "Time In", key: "timeIn", width: 15 },
    { header: "Time Out", key: "timeOut", width: 15 },
    { header: "Break (mins)", key: "breakTime", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Hours Worked", key: "hoursWorked", width: 18 },
  ];

  let startRow = 2;

  allLogs.forEach((log, i) => {
    const rowNumber = startRow + i;
    const row = worksheet.getRow(rowNumber);

    row.getCell(1).value = log.user_id?.name || log.user_id;
    row.getCell(2).value = log.date;
    row.getCell(3).value = log.time_in ? dayjs(log.time_in).format("HH:mm:ss") : "";
    row.getCell(4).value = log.time_out ? dayjs(log.time_out).format("HH:mm:ss") : "";
    row.getCell(5).value = log.break_time ?? 0;
    row.getCell(6).value = log.status;

    // Auto hours worked
    row.getCell(7).value = {
      formula: `IF(D${rowNumber}="",0,(D${rowNumber}-C${rowNumber})*24-E${rowNumber}/60)`
    };

    row.commit();
  });

  const lastRow = worksheet.lastRow.number;

  worksheet.addTable({
    name: `AllLogs`,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium13", showRowStripes: true },
    columns: worksheet.columns.map((col) => ({
      name: col.header,
      filterButton: true,
    })),
    rows: worksheet.getRows(2, lastRow - 1).map((r) => r.values.slice(1)),
  });

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `projecters_all_logs_${dayjs().format("YYYY-MM-DD")}.xlsx`
  );
};

  return (
    <div className="dashboard-container">
    <h1>Projecters Time Tracking Dashboard</h1>

      <button className="btn-back" onClick={onBack}>
        ← Back to Main
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

