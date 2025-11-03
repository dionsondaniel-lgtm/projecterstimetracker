import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isBetween from "dayjs/plugin/isBetween";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import ExcelJS from "exceljs";

dayjs.extend(weekOfYear);
dayjs.extend(isBetween);

export default function Dashboard({ onBack }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");
  const [selectedWeek, setSelectedWeek] = useState(dayjs().week());

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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("All Logs");

    worksheet.columns = Object.keys(exportData[0]).map((key) => ({
      header: key,
      key,
      width: 15,
    }));

    exportData.forEach((data) => worksheet.addRow(data));

    workbook.xlsx.writeBuffer().then((buffer) => {
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `projecters_time_logs_${today}.xlsx`
      );
    });
  };

const exportCurrentWeekToExcel = async () => {
  if (!allLogs || allLogs.length === 0) {
    alert("No logs to export!");
    return;
  }

  const now = dayjs();
  const weekStart = now.startOf("week");
  const weekEnd = now.endOf("week");

  const weekLogs = allLogs.filter((log) =>
    dayjs(log.date).isBetween(weekStart, weekEnd, "day", "[]")
  );

  if (weekLogs.length === 0) {
    alert("No logs found for the current week!");
    return;
  }

  // Format label for sheet and file
  const weekLabel = `${weekStart.format("MMM D")} - ${weekEnd.format("MMM D")}`;
  const safeLabel = `${weekStart.format("MMM_D")}-${weekEnd.format("MMM_D")}`; // safe for file name

  // Create a new workbook and sheet with week name
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(weekLabel);

  // Define columns
  worksheet.columns = [
    { header: "User", key: "user", width: 20 },
    { header: "Date", key: "date", width: 15 },
    { header: "Time In", key: "timeIn", width: 15 },
    { header: "Time Out", key: "timeOut", width: 15 },
    { header: "Break (mins)", key: "breakTime", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Hours Worked", key: "hoursWorked", width: 18 },
  ];

  // Add log data
  let startRow = 2;
  weekLogs.forEach((log, i) => {
    const rowNumber = startRow + i;
    const row = worksheet.getRow(rowNumber);

    row.getCell(1).value = log.user_id?.name || log.user_id; // A: User
    row.getCell(2).value = dayjs(log.date).format("YYYY-MM-DD"); // B: Date
    row.getCell(3).value = log.time_in ? dayjs(log.time_in).format("HH:mm:ss") : ""; // C: Time In
    row.getCell(4).value = log.time_out ? dayjs(log.time_out).format("HH:mm:ss") : ""; // D: Time Out
    row.getCell(5).value = log.break_time ?? 0; // E: Break (mins)
    row.getCell(6).value = log.status; // F: Status

    // Formula for Hours Worked (G)
    row.getCell(7).value = {
      formula: `IF(D${rowNumber}="",0,(D${rowNumber}-C${rowNumber})*24-E${rowNumber}/60)`,
    };

    row.commit();
  });

  // Apply table style (Medium 13)
  const lastRow = worksheet.lastRow.number;
  worksheet.addTable({
    name: `Week_${weekStart.format("MMDD")}`,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium13",
      showRowStripes: true,
    },
    columns: worksheet.columns.map((col) => ({ name: col.header, filterButton: true })),
    rows: worksheet.getRows(2, lastRow - 1).map((r) => r.values.slice(1)),
  });

  // Export file with week date range
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `projecters_time_logs_${safeLabel}.xlsx`
  );
};

const exportSelectedWeekToExcel = async () => {
  if (!allLogs || allLogs.length === 0) {
    alert("No logs to export!");
    return;
  }

  const year = dayjs().year();
  const weekNum = parseInt(selectedWeek);
  const weekStart = dayjs().year(year).week(weekNum).startOf("week");
  const weekEnd = dayjs().year(year).week(weekNum).endOf("week");

  const weekLogs = allLogs.filter((log) =>
    dayjs(log.date).isBetween(weekStart, weekEnd, "day", "[]")
  );

  if (weekLogs.length === 0) {
    alert(`No logs found for Week ${weekNum} (${weekStart.format("MMM D")} - ${weekEnd.format("MMM D")})`);
    return;
  }

  const weekLabel = `${weekStart.format("MMM D")} - ${weekEnd.format("MMM D")}`;
  const safeLabel = `${weekStart.format("MMM_D")}-${weekEnd.format("MMM_D")}`;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(weekLabel);

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
  weekLogs.forEach((log, i) => {
    const rowNumber = startRow + i;
    const row = worksheet.getRow(rowNumber);

    row.getCell(1).value = log.user_id?.name || log.user_id;
    row.getCell(2).value = dayjs(log.date).format("YYYY-MM-DD");
    row.getCell(3).value = log.time_in ? dayjs(log.time_in).format("HH:mm:ss") : "";
    row.getCell(4).value = log.time_out ? dayjs(log.time_out).format("HH:mm:ss") : "";
    row.getCell(5).value = log.break_time ?? 0;
    row.getCell(6).value = log.status;

    row.getCell(7).value = {
      formula: `IF(D${rowNumber}="",0,(D${rowNumber}-C${rowNumber})*24-E${rowNumber}/60)`,
    };

    row.commit();
  });

  const lastRow = worksheet.lastRow.number;
  worksheet.addTable({
    name: `Week_${weekStart.format("MMDD")}`,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium13",
      showRowStripes: true,
    },
    columns: worksheet.columns.map((col) => ({ name: col.header, filterButton: true })),
    rows: worksheet.getRows(2, lastRow - 1).map((r) => r.values.slice(1)),
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `projecters_time_logs_${safeLabel}.xlsx`
  );
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
    await fetchAllLogs();
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
    await fetchAllLogs();
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
    await fetchAllLogs();
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

    await fetchAllLogs();
    await fetchLogs();
    alert("✅ Log deleted successfully.");
  };

  const formatTime = (iso) => {
    if (!iso) return "-";
    return dayjs(iso).format("HH:mm:ss");
  };

  const updateLog = async (log) => {
    const pass = prompt("Enter admin password to update:");
    if (pass !== "1234") {
      alert("❌ Incorrect password!");
      return;
    }

    const newTimeIn = prompt(
      "Enter new Time In (YYYY-MM-DD HH:mm:ss) or leave blank:",
      log.time_in ? dayjs(log.time_in).format("YYYY-MM-DD HH:mm:ss") : ""
    );
    if (newTimeIn && !dayjs(newTimeIn, "YYYY-MM-DD HH:mm:ss", true).isValid()) {
      alert("Invalid Time In format!");
      return;
    }

    const newTimeOut = prompt(
      "Enter new Time Out (YYYY-MM-DD HH:mm:ss) or leave blank:",
      log.time_out ? dayjs(log.time_out).format("YYYY-MM-DD HH:mm:ss") : ""
    );
    if (newTimeOut && !dayjs(newTimeOut, "YYYY-MM-DD HH:mm:ss", true).isValid()) {
      alert("Invalid Time Out format!");
      return;
    }

    const newBreak = prompt("Enter new Break minutes or leave blank:", log.break_time ?? "0");
    if (newBreak && (isNaN(parseInt(newBreak)) || parseInt(newBreak) < 0)) {
      alert("Invalid Break time!");
      return;
    }

    setLoading(true);
    const updates = {};
    if (newTimeIn) updates.time_in = dayjs(newTimeIn).toISOString();
    if (newTimeOut) updates.time_out = dayjs(newTimeOut).toISOString();
    if (newBreak) updates.break_time = parseInt(newBreak);

    const { error } = await supabase.from("logs").update(updates).eq("id", log.id);
    setLoading(false);

    if (error) {
      console.error("updateLog error:", error);
      alert("Failed to update log.");
    } else {
      alert("✅ Log updated successfully.");
      fetchAllLogs();
      fetchLogs();
    }
  };

  return (
    <div className="container">
      <h1>Projecters Time Tracking Dashboard</h1>

      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 20 }}>
        ← Return to Admin Panel
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
          <option value="">-- Please select a user --</option>
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
        Punch In
      </button>

      <h3>Today's Logs — {today}</h3>
      {logs.length === 0 ? (
        <p className="empty-row">No logs recorded for today.</p>
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
                    title="Edit break duration"
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
                    <span>Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr style={{ margin: "40px 0" }} />

<div style={{ marginBottom: 25 }}>
  {/* First row */}
  <div style={{ marginBottom: 10 }}>
    <button
      className="btn-secondary"
      onClick={async () => {
        const nextState = !showAllLogs;
        setShowAllLogs(nextState);

        if (nextState) {
          await fetchAllLogs();
          await fetchLogs();
        } else {
          if (currentUserId) await fetchLogs();
        }
      }}
      style={{ marginRight: 10 }}
    >
      {showAllLogs ? "Hide All Logs" : "View All Logs"}
    </button>

    <button
      className="btn-primary"
      onClick={exportToExcel}
      style={{ marginRight: 10 }}
    >
      Export All Logs to Excel
    </button>

    <button className="btn-primary" onClick={exportCurrentWeekToExcel}>
      Export Current Week Logs
    </button>
  </div>

  {/* Second row */}
  <div style={{ marginTop: 10 }}>
    <label
      htmlFor="week-select"
      style={{ marginRight: 10, fontWeight: "bold" }}
    >
      Select Week:
    </label>

    <select
      id="week-select"
      className="week-select"
      value={selectedWeek}
      onChange={(e) => setSelectedWeek(e.target.value)}
      style={{ marginRight: 10 }}
    >
      {Array.from({ length: 52 }, (_, i) => (
        <option key={i + 1} value={i + 1}>
          Week {i + 1}
        </option>
      ))}
    </select>

    <button className="btn-primary" onClick={exportSelectedWeekToExcel}>
      Export Selected Week Logs
    </button>
  </div>
</div>

      {showAllLogs && (
        <>
          {allLogs.length === 0 ? (
            <p className="empty-row">No log entries available.</p>
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
                        Delete
                      </button>
                      <button className="btn-sm btn-secondary" onClick={() => updateLog(log)}>
                        Update
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
