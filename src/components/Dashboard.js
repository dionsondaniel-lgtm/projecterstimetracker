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

  // ---------------- NEW DATE RANGE STATES ----------------
  const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));
  // --------------------------------------------------------

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

  // ---------------- NEW DATE RANGE EXPORT FUNCTION ----------------
  const exportDateRangeToExcel = async () => {
    if (!startDate || !endDate) {
      alert("Please select both a start and end date.");
      return;
    }

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (end.isBefore(start)) {
      alert("End date must be after start date.");
      return;
    }

    const rangeLogs = allLogs.filter((log) =>
      dayjs(log.date).isBetween(start, end, "day", "[]")
    );

    if (rangeLogs.length === 0) {
      alert("No logs found in this date range.");
      return;
    }

    const label = `${start.format("MMM_D")}-${end.format("MMM_D")}`;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Logs ${label}`);

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
    rangeLogs.forEach((log, i) => {
      const rowNumber = startRow + i;
      const row = worksheet.getRow(rowNumber);

      row.getCell(1).value = log.user_id?.name || log.user_id;
      row.getCell(2).value = log.date;
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
      name: `DateRange_${start.format("MMDD")}`,
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium13",
        showRowStripes: true,
      },
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
      `projecters_logs_${label}.xlsx`
    );
  };
  // -----------------------------------------------------------------

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

    if (existing?.length > 0) {
      alert("You already punched in without punching out.");
      setLoading(false);
      return;
    }

    await supabase.from("logs").insert([
      {
        user_id: currentUserId,
        date: today,
        time_in: new Date().toISOString(),
        status: "Present",
        break_time: 0,
      },
    ]);

    await fetchLogs();
    await fetchAllLogs();
    setLoading(false);
  };

  const punchOut = async (log) => {
    if (!log || log.time_out) return alert("Already punched out");

    setLoading(true);
    await supabase
      .from("logs")
      .update({ time_out: new Date().toISOString() })
      .eq("id", log.id);

    await fetchLogs();
    await fetchAllLogs();
    setLoading(false);
  };

  const setBreakTime = async (log) => {
    const mins = prompt("Enter break minutes:", log.break_time ?? "0");
    if (mins === null) return;

    const m = parseInt(mins);
    if (isNaN(m) || m < 0) return alert("Invalid break time");

    await supabase.from("logs").update({ break_time: m }).eq("id", log.id);

    fetchLogs();
    fetchAllLogs();
  };

  const deleteLog = async (logId) => {
    const pass = prompt("Enter admin password to delete:");
    if (pass !== "1234") return alert("❌ Incorrect password!");

    if (!window.confirm("Are you sure you want to delete this log?")) return;

    await supabase.from("logs").delete().eq("id", logId);

    fetchAllLogs();
    fetchLogs();
  };

  const formatTime = (iso) => (iso ? dayjs(iso).format("HH:mm:ss") : "-");

  const updateLog = async (log) => {
    const pass = prompt("Enter admin password to update:");
    if (pass !== "1234") return alert("❌ Incorrect password!");

    const newTimeIn = prompt(
      "Enter new Time In (YYYY-MM-DD HH:mm:ss)",
      log.time_in ? dayjs(log.time_in).format("YYYY-MM-DD HH:mm:ss") : ""
    );

    const newTimeOut = prompt(
      "Enter new Time Out (YYYY-MM-DD HH:mm:ss)",
      log.time_out ? dayjs(log.time_out).format("YYYY-MM-DD HH:mm:ss") : ""
    );

    const newBreak = prompt("Enter new Break minutes:", log.break_time ?? "0");

    const updates = {};
    if (newTimeIn) updates.time_in = dayjs(newTimeIn).toISOString();
    if (newTimeOut) updates.time_out = dayjs(newTimeOut).toISOString();
    if (newBreak) updates.break_time = parseInt(newBreak);

    await supabase.from("logs").update(updates).eq("id", log.id);

    fetchAllLogs();
    fetchLogs();
    alert("Updated!");
  };

  return (
    <div className="container">
      <h1>Projecters Time Management Dashboard</h1>

      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 20 }}>
        ← Back to Main
      </button>

      {/* Select User */}
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

      {/* Punch In */}
      <button
        className="btn-primary"
        onClick={punchIn}
        disabled={!currentUserId || loading}
        style={{ marginBottom: 20 }}
      >
        Punch In
      </button>

      {/* Today's Logs */}
      <h3>Today's Logs — {today}</h3>
      {logs.length === 0 ? (
        <p className="empty-row">No logs recorded for today.</p>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Break</th>
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
                  <button className="btn-sm btn-info" onClick={() => setBreakTime(log)}>
                    {log.break_time ?? 0}
                  </button>
                </td>
                <td>{log.status}</td>
                <td>
                  {!log.time_out ? (
                    <button className="btn-sm btn-danger" onClick={() => punchOut(log)}>
                      Punch Out
                    </button>
                  ) : (
                    "Completed"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr style={{ margin: "40px 0" }} />

      {/* Buttons + Date Range */}
      <div style={{ marginBottom: 25 }}>
        {/* First Row */}
        <div style={{ marginBottom: 10 }}>
          <button
            className="btn-secondary"
            onClick={async () => {
              const nextState = !showAllLogs;
              setShowAllLogs(nextState);
              nextState ? fetchAllLogs() : fetchLogs();
            }}
            style={{ marginRight: 10 }}
          >
            {showAllLogs ? "Hide All Logs" : "View All Logs"}
          </button>

          <button className="btn-primary" onClick={exportToExcel} style={{ marginRight: 10 }}>
            Export All Logs
          </button>
        </div>

        {/* ---------------- NEW DATE RANGE UI ---------------- */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontWeight: "bold" }}>Select Date Range:</label>

          <input
            type="date"
            className="input-select"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <span style={{ fontWeight: "bold" }}>to</span>

          <input
            type="date"
            className="input-select"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <button className="btn-primary" onClick={exportDateRangeToExcel}>
            Export Selected Date Range
          </button>
        </div>
        {/* ----------------------------------------------------- */}
      </div>

      {/* All Logs Table */}
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
                  <th>Break</th>
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
                        style={{ marginRight: 8 }}
                        onClick={() => deleteLog(log.id)}
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
