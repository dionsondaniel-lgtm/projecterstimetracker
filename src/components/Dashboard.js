import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import TaskModal from "./TaskModal";
import ExcelPromptModal from "./ExcelPromptModal";
import SpecificTaskModal from "./SpecificTaskModal";

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
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [taskDate, setTaskDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [excelPromptOpen, setExcelPromptOpen] = useState(false);

  const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

  const today = dayjs().format("YYYY-MM-DD");

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
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error) setAllLogs(data);
  }

  // ------------------- ADD TASK -------------------
  async function handleTaskSave(entryList, pickedDate) {
  setLoading(true);

  const inserts = entryList.map((e) => ({
    user_id: selectedUserIds[0],
    date: pickedDate,               // <<< Use selected date!!!
    hours_worked: e.hours_worked,
    task_done: e.task_done,
  }));

  const { error } = await supabase.from("logs").insert(inserts);

  setLoading(false);
  setTaskModalOpen(false);
  setCalendarTaskOpen(false);
  fetchFilteredLogs();
  fetchAllLogs();

  if (error) alert("Error saving tasks");
  else alert("Tasks saved successfully");
}

  // ----------------- DELETE LOG -----------------
  const deleteLog = async (logId) => {
    const proceed = window.confirm("Are you sure you want to delete this task?");
    if (!proceed) return;

    const { error } = await supabase.from("logs").delete().eq("id", logId);
    await fetchFilteredLogs();
    await fetchAllLogs();
    if (!error) alert("Deleted successfully");
    else alert("Error deleting log");
  };

  // ------------------- UPDATE LOG -------------------
  const updateLog = async (log) => {
    const newTask = prompt("Task description:", log.task_done);
    const newHours = prompt("Hours worked:", log.hours_worked);

    if (!newTask || !newHours) return alert("Invalid input");

    const { error } = await supabase
      .from("logs")
      .update({
        task_done: newTask,
        hours_worked: Number(newHours),
      })
      .eq("id", log.id);

    fetchFilteredLogs();
    fetchAllLogs();
    if (!error) alert("Updated successfully");
    else alert("Error updating log");
  };

  // ------------------- EXCEL EXPORT -------------------
  const exportExcel = async (mode, config) => {
    const { moneyFromAlex, hourlyRate, exchangeRate } = config;

    const exportLogs =
      mode === "all"
        ? allLogs
        : allLogs.filter((l) =>
            dayjs(l.date).isBetween(startDate, endDate, "day", "[]")
          );

    if (exportLogs.length === 0) {
      alert("No logs to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Work Logs");

    sheet.addRow(["Work Log Export"]);
    sheet.addRow([]);
    sheet.addRow(["Money From Alex (AUD)", moneyFromAlex]);
    sheet.addRow(["Hourly Rate (AUD)", hourlyRate]);
    sheet.addRow(["Exchange Rate (AUD→PHP)", exchangeRate]);

    let workDays = countWeekdays(startDate, endDate);
    sheet.addRow(["Working Days (Mon–Fri)", workDays]);

    sheet.addRow([]);
    sheet.addRow([
      "User",
      "Date",
      "Task",
      "Hours",
      "Daily Total",
      "Weekly Total",
      "Pay AUD",
      "Pay PHP",
    ]);

    const grouped = groupLogs(exportLogs);

    grouped.forEach((entry) => {
      entry.rows.forEach((r) => {
        const payAUD = r.hours_worked * hourlyRate;
        const payPHP = payAUD * exchangeRate;

        sheet.addRow([
          entry.user,
          r.date,
          r.task,
          r.hours_worked,
          entry.dailyTotals[r.date],
          entry.weeklyTotals[r.week],
          payAUD,
          payPHP,
        ]);
      });
    });

    sheet.columns.forEach((col) => (col.width = 20));

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/vnd.ms-excel" }),
      `logs_export_${dayjs().format("YYYY-MM-DD")}.xlsx`
    );

    setExcelPromptOpen(false);
  };

  function groupLogs(logs) {
    const grouped = {};

    logs.forEach((l) => {
      const user = l.user_id?.name;
      const week = dayjs(l.date).week();

      if (!grouped[user]) {
        grouped[user] = {
          user,
          rows: [],
          dailyTotals: {},
          weeklyTotals: {},
        };
      }

      grouped[user].rows.push({
        date: l.date,
        task: l.task_done,
        hours_worked: Number(l.hours_worked),
        week,
      });

      grouped[user].dailyTotals[l.date] =
        (grouped[user].dailyTotals[l.date] || 0) + Number(l.hours_worked);
      grouped[user].weeklyTotals[week] =
        (grouped[user].weeklyTotals[week] || 0) + Number(l.hours_worked);
    });

    return Object.values(grouped);
  }

  function countWeekdays(start, end) {
    let day = dayjs(start);
    const last = dayjs(end);
    let count = 0;

    while (day.isBefore(last) || day.isSame(last)) {
      const weekday = day.day();
      if (weekday >= 1 && weekday <= 5) count++;
      day = day.add(1, "day");
    }

    return count;
  }

  // ------------------- TOTAL HOURS TODAY -------------------
  const totalHoursToday = logs.reduce((sum, l) => sum + Number(l.hours_worked), 0);

  // ------------------- RENDER -------------------
  return (
    <div className="container">
      <h1>Projecters Task Management Dashboard</h1>

      <button className="btn-secondary" onClick={onBack}>
        ← Back
      </button>

      {/* MULTI-SELECT */}
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

      {/* ADD TASK TODAY */}
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

      {/* ADD TASK SPECIFIC DATE */}
      <button
        className="btn-secondary"
        disabled={selectedUserIds.length !== 1}
        onClick={() => setCalendarTaskOpen(true)}
      >
        📅 Add Task for Specific Date
      </button>

      {/* SHOW/HIDE ALL TASKS */}
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
      <h2>{showAllLogs ? "All Tasks" : `Today: ${today}`}</h2>
      {logs.length === 0 ? (
        <p>No tasks logged.</p>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Date</th>
              <th>Task</th>
              <th>Hours</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.user_id?.name}</td>
                <td>{l.date}</td>
                <td>{l.task_done}</td>
                <td>{l.hours_worked}</td>
                <td>
                  <button className="btn-sm btn-secondary" onClick={() => updateLog(l)}>
                    Edit
                  </button>
                  <button className="btn-sm btn-danger" onClick={() => deleteLog(l.id)}>
                    Del
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* EXPORT */}
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
        fullName={users.find(u => u.id === selectedUserIds[0])?.name || "User"}
      />
      <SpecificTaskModal
        isOpen={calendarTaskOpen}
        selectedDate={taskDate}
        existingEntries={[]}
        onSave={handleTaskSave}
        onClose={() => setCalendarTaskOpen(false)}
        userId={selectedUserIds[0]}
        fullName={users.find(u => u.id === selectedUserIds[0])?.name || "User"}
      />

      <ExcelPromptModal
        isOpen={excelPromptOpen !== false}
        onCancel={() => setExcelPromptOpen(false)}
        onConfirm={(conf) =>
          exportExcel(excelPromptOpen === true ? "all" : "range", conf)
        }
      />
    </div>
  );
}
