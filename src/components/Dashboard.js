// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import TaskModal from "./TaskModal";
import SpecificTaskModal from "./SpecificTaskModal";
import ExcelPromptModal from "./ExcelPromptModal";
import EditTaskModal from "./EditTaskModal";

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

export default function Dashboard({ onBack }) {
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [calendarTaskOpen, setCalendarTaskOpen] = useState(false);
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [taskDate, setTaskDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [excelPromptOpen, setExcelPromptOpen] = useState(false);

  const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

  const [toast, setToast] = useState(null); // { message: "", type: "success"|"error" }

  const today = dayjs().format("YYYY-MM-DD");

  // ------------------- FETCH DATA -------------------
  useEffect(() => {
    fetchUsers();
    fetchAllLogs();
  }, []);

  useEffect(() => {
    if (!showAllLogs) fetchFilteredLogs();
  }, [selectedUserIds, showAllLogs]);

  async function fetchUsers() {
    const { data, error } = await supabase.from("users").select("*").order("name");
    if (!error) setUsers(data);
  }

  async function fetchFilteredLogs() {
    if (selectedUserIds.length === 0) {
      setLogs([]);
      return;
    }

    const { data, error } = await supabase
      .from("logs")
      .select("*, user_id(name)")
      .in("user_id", selectedUserIds)
      .eq("date", today)
      .order("created_at", { ascending: false });

    if (!error) setLogs(data);
  }

  async function fetchAllLogs() {
    const { data, error } = await supabase
      .from("logs")
      .select("*, user_id(name)")
      .order("date", { ascending: false });

    if (!error) setAllLogs(data);
  }

  // ------------------- TOAST -------------------
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ------------------- ADD TASK -------------------
  async function handleTaskSave(entryList, pickedDate) {
    setLoading(true);

    const inserts = entryList.map((e) => ({
      user_id: selectedUserIds[0],
      date: pickedDate,
      hours_worked: e.hours_worked,
      task_done: e.task_done,
    }));

    const { error } = await supabase.from("logs").insert(inserts);

    setLoading(false);
    setTaskModalOpen(false);
    setCalendarTaskOpen(false);
    fetchFilteredLogs();
    fetchAllLogs();

    if (error) showToast("Error saving tasks", "error");
    else showToast("Tasks saved successfully", "success");
  }

  // ----------------- DELETE LOG -----------------
  const deleteLog = async (logId) => {
    const proceed = window.confirm("Are you sure you want to delete this task?");
    if (!proceed) return;

    const { error } = await supabase.from("logs").delete().eq("id", logId);
    await fetchFilteredLogs();
    await fetchAllLogs();

    if (!error) showToast("Deleted successfully", "success");
    else showToast("Error deleting log", "error");
  };


// ------------------- EDIT LOG -------------------

const openEditTaskModal = (log) => {
  console.log("OPEN EDIT LOG:", log);

  // Supabase returns: log.user_id = { name: "Alex", id: X }
  const user =
    typeof log.user_id === "object"
      ? { id: log.user_id.id, name: log.user_id.name }
      : users.find((u) => u.id === log.user_id) || { id: null, name: "User" };

  console.log("FOUND USER:", user);

  setEditingLog({ ...log, userObj: user });
  setEditTaskModalOpen(true);
};



// Save edits
const handleEditTaskSave = async (updatedEntry) => {
  if (!editingLog) return;

  try {
    const { error } = await supabase
      .from("logs")
      .update({
        task_done: updatedEntry.task_done,
        hours_worked: Number(updatedEntry.hours_worked), // ensure number
      })
      .eq("id", editingLog.id);

    // Close modal
    setEditTaskModalOpen(false);
    setEditingLog(null);

    // Refresh logs
    await fetchFilteredLogs();
    await fetchAllLogs();

    if (!error) showToast("Task updated successfully", "success");
    else showToast("Error updating task", "error");

  } catch (err) {
    console.error("Error updating task:", err);
    showToast("Unexpected error updating task", "error");
  }
};


  // ------------------- EXCEL EXPORT -------------------
  const exportExcel = async (mode, config) => {
  const { moneyFromAlex, hourlyRate, exchangeRate, liveRateInfo } = config;

  const exportLogs =
    mode === "all"
      ? allLogs
      : allLogs.filter((l) =>
          dayjs(l.date).isBetween(startDate, endDate, "day", "[]")
        );

  if (exportLogs.length === 0) {
    showToast("No logs to export", "error");
    return;
  }

  const workbook = new ExcelJS.Workbook();

  // ============================================
  // SHEET 1: COMPANY SUMMARY
  // ============================================
  const totalsSheet = workbook.addWorksheet("Company Summary");
  totalsSheet.columns = [
    { width: 30 },
    { width: 20 },
  ];

  totalsSheet.addRow(["COMPANY PAYROLL SUMMARY"]);
  totalsSheet.addRow([]);

  // Will be filled after user sheet totals
  let summaryTotals = {
    hours: 0,
    aud: 0,
    php: 0
  };

  totalsSheet.addRow(["Exchange Rate (AUD → PHP)", exchangeRate]);
  totalsSheet.addRow([
    "Exchange Rate Source",
    liveRateInfo ? liveRateInfo.date : "Manual Entry"
  ]);
  totalsSheet.addRow([]);

  // ============================================
  // GROUP LOGS
  // ============================================
  const userGroups = {};

  exportLogs.forEach((l) => {
    const user = l.user_id?.name || "Unknown";

    if (!userGroups[user]) userGroups[user] = [];

    userGroups[user].push({
      date: l.date,
      task: l.task_done,
      hours: Number(l.hours_worked),
    });
  });

  const userTotals = {};

  // ============================================
  // SHEET 2: PAYROLL SUMMARY (USER OVERVIEW)
  // ============================================
  const summarySheet = workbook.addWorksheet("Payroll Summary");
  summarySheet.addRow(["User", "Total Hours", "Pay (AUD)", "Pay (PHP)"]);
  summarySheet.columns = [
    { width: 25 },
    { width: 14 },
    { width: 15 },
    { width: 15 },
  ];

  summarySheet.getRow(1).eachCell((c) => {
    c.font = { bold: true };
  });

  // ============================================
  // SHEETS 3+: USER DETAILED PAYROLL
  // ============================================
  for (const user in userGroups) {
    const sheet = workbook.addWorksheet(`${user}`);
    sheet.addRow([`${user} Payroll Statement`]);
    sheet.addRow([]);
    sheet.addRow(["Date", "Task", "Hours", "AUD", "PHP"]);

    sheet.getRow(3).eachCell((c) => (c.font = { bold: true }));

    let totalHours = 0;
    let totalAUD = 0;

    userGroups[user].forEach((log) => {
      const aud = log.hours * hourlyRate;
      const php = aud * exchangeRate;

      totalHours += log.hours;
      totalAUD += aud;

      sheet.addRow([log.date, log.task, log.hours, aud, php]);
    });

    const totalPHP = totalAUD * exchangeRate;

    userTotals[user] = { hours: totalHours, aud: totalAUD, php: totalPHP };

    summarySheet.addRow([user, totalHours, totalAUD, totalPHP]);

    sheet.addRow([]);
    sheet.addRow(["Total Hours", totalHours]);
    sheet.addRow(["Total Pay (AUD)", totalAUD]);
    sheet.addRow(["Total Pay (PHP)", totalPHP]);
  }

  // ============================================
  // FILL MAIN COMPANY SUMMARY
  // ============================================
  summaryTotals.hours = Object.values(userTotals).reduce((a, b) => a + b.hours, 0);
  summaryTotals.aud = Object.values(userTotals).reduce((a, b) => a + b.aud, 0);
  summaryTotals.php = summaryTotals.aud * exchangeRate;

  totalsSheet.addRow(["Total Hours (All Users)", summaryTotals.hours]);
  totalsSheet.addRow(["Total Payroll (AUD)", summaryTotals.aud]);
  totalsSheet.addRow(["Total Payroll (PHP)", summaryTotals.php]);
  totalsSheet.addRow([]);
  totalsSheet.addRow(["Money From Alex (AUD)", moneyFromAlex]);
  totalsSheet.addRow(["Balance Remaining (AUD)", moneyFromAlex - summaryTotals.aud]);
  totalsSheet.addRow([
    "Balance Remaining (PHP)",
    (moneyFromAlex - summaryTotals.aud) * exchangeRate
  ]);

  // ============================================
  // SHEET 4: RAW LOGS
  // ============================================
  const rawSheet = workbook.addWorksheet("Raw Logs");
  rawSheet.addRow(["User", "Date", "Task", "Hours", "Pay AUD", "Pay PHP"]);

  exportLogs.forEach((l) => {
    const hours = Number(l.hours_worked);
    const payAUD = hours * hourlyRate;
    const payPHP = payAUD * exchangeRate;

    rawSheet.addRow([
      l.user_id?.name || "Unknown",
      l.date,
      l.task_done,
      hours,
      payAUD,
      payPHP,
    ]);
  });

  // ============================================
  // Save File
  // ============================================
  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer], { type: "application/vnd.ms-excel" }),
    `Payroll_${dayjs().format("YYYY-MM-DD")}.xlsx`
  );

  setExcelPromptOpen(false);
  showToast("Payroll exported successfully", "success");
};


const totalHoursToday = logs.reduce(
  (sum, l) => sum + Number(l.hours_worked || 0),
  0
);

  // ------------------- RENDER -------------------
  return (
    <div className="container">
      <h1>Projecters Task Management Dashboard</h1>

      <button className="btn-secondary" onClick={onBack}>
        ← Back
      </button>

      <div className="user-select-group">
        <label>Select User(s):</label>
        <select
          multiple
          className="multi-select"
          value={selectedUserIds}
          onChange={(e) =>
            setSelectedUserIds([...e.target.selectedOptions].map((o) => o.value))
          }
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <button
        className="btn-primary"
        disabled={selectedUserIds.length !== 1}
        onClick={() => {
          setTaskDate(today);
          setTaskModalOpen(true);
        }}
      >
        ➕ Add Today's Task (Total Hours: {totalHoursToday})
      </button>

      <button
        className="btn-secondary"
        disabled={selectedUserIds.length !== 1}
        onClick={() => setCalendarTaskOpen(true)}
      >
        📅 Add Task for Specific Date
      </button>

      <button
        className="btn-info"
        onClick={() => {
          setShowAllLogs(!showAllLogs);
          if (!showAllLogs) setLogs(allLogs);
          else fetchFilteredLogs();
        }}
      >
        {showAllLogs ? "📋 Show Selected User(s) Logs" : "📋 Show All Logs"}
      </button>


      {/* LOGS TABLE */}
      <div className="logs-card">
        <h2 className="tasks-title">{showAllLogs ? "All Tasks" : `Today: ${today}`}</h2>
        <span className="logs-count">{logs.length} tasks displayed</span>

        {logs.length === 0 ? <div className="no-logs"><p>📭 No tasks logged {showAllLogs ? "yet." : "for today."}</p></div> :
          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>User</th><th>Date</th><th>Task</th><th>Hours</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>{l.user?.name}</td>
                    <td>{l.date}</td>
                    <td>{l.task_done}</td>
                    <td>{l.hours_worked}</td>
                    <td className="action-buttons">
                      <button className="btn-sm btn-secondary" onClick={() => updateLog(l)}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={() => deleteLog(l.id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>

      <div className="export-section">
        <button className="btn-primary" onClick={() => setExcelPromptOpen(true)}>
          📊 Export All Logs
        </button>

        <div className="range-block">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span>to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button className="btn-primary" onClick={() => setExcelPromptOpen("range")}>
            📊 Export Date Range
          </button>
        </div>
      </div>

      {/* MODALS */}
      <TaskModal
        isOpen={taskModalOpen}
        selectedDate={taskDate}
        existingEntries={[]}
        onSave={handleTaskSave}
        onClose={() => setTaskModalOpen(false)}
        userId={selectedUserIds[0]}
        fullName={users.find((u) => u.id === selectedUserIds[0])?.name || "User"}
      />
      <SpecificTaskModal
        isOpen={calendarTaskOpen}
        selectedDate={taskDate}
        existingEntries={[]}
        onSave={handleTaskSave}
        onClose={() => setCalendarTaskOpen(false)}
        userId={selectedUserIds[0]}
        fullName={users.find((u) => u.id === selectedUserIds[0])?.name || "User"}
      />

<EditTaskModal
  isOpen={editTaskModalOpen}
  task={editingLog}          // <-- must contain userObj now
  users={users}              // <-- needed for matching fallback
  onClose={() => setEditTaskModalOpen(false)}
  onSave={handleEditTaskSave}
/>

<ExcelPromptModal
  isOpen={excelPromptOpen !== false}
  onCancel={() => setExcelPromptOpen(false)}
  onConfirm={(conf) => {
    exportExcel(excelPromptOpen, conf);  // pass correct mode
  }}
/>


      {/* TOAST */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
