// src/components/AdminDashboard.js
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { FaBars, FaUserPlus, FaClock, FaPlus } from "react-icons/fa";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import TaskModal from "./TaskModal";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekOfYear);

export default function AdminDashboard({ toRegister, toDashboard, onBack }) {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [currentUserId, setCurrentUserId] = useState("");
  const [rememberUser, setRememberUser] = useState(false);

  const [ratePHP, setRatePHP] = useState(null);
  const [exchangeError, setExchangeError] = useState("");
  const [currency, setCurrency] = useState("AUD");

  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [phTime, setPhTime] = useState("");
  const [phDate, setPhDate] = useState("");
  const [selectedTZ, setSelectedTZ] = useState("Australia/Sydney");
  const [otherTime, setOtherTime] = useState("");
  const [otherDate, setOtherDate] = useState("");

  // ---- NEW: TaskModal states ----
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDate, setTaskDate] = useState(dayjs().format("YYYY-MM-DD"));

  // ---- NEW: Running hours per day ----
  const [runningHours, setRunningHours] = useState([]);

  const timezoneCurrencyMap = {
    "Australia/Sydney": "AUD",
    "America/New_York": "USD",
    "Asia/Dubai": "AED",
    "Europe/London": "GBP",
    "Asia/Tokyo": "JPY",
  };

  const timezones = [
    { label: "Australia (Sydney)", value: "Australia/Sydney" },
    { label: "USA (New York)", value: "America/New_York" },
    { label: "UAE (Dubai)", value: "Asia/Dubai" },
    { label: "UK (London)", value: "Europe/London" },
    { label: "Japan (Tokyo)", value: "Asia/Tokyo" },
  ];

  const today = dayjs().format("YYYY-MM-DD");

  // ----------------- INITIAL LOAD -----------------
  useEffect(() => {
    fetchUsers();
    fetchAllLogs();
    updateClocks();
    fetchExchangeRate(currency); // fetch immediately
    const clockInterval = setInterval(updateClocks, 1000);
    const exchangeInterval = setInterval(() => fetchExchangeRate(currency), 10 * 60 * 1000);

    const savedUser = localStorage.getItem("rememberUserId");
    if (savedUser) {
      setCurrentUserId(savedUser);
      setRememberUser(true);
    }

    return () => {
      clearInterval(clockInterval);
      clearInterval(exchangeInterval);
    };
  }, []);

  // ----------------- FETCH USERS -----------------
  async function fetchUsers() {
    const { data, error } = await supabase.from("users").select("*").order("name");
    if (!error) setUsers(data);
  }

  // ----------------- FETCH LOGS -----------------
  async function fetchAllLogs() {
    const { data, error } = await supabase
      .from("logs")
      .select("*, user_id(name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error) {
      setAllLogs(data);
      if (!showAllLogs) setLogs(data.filter((l) => l.date === today));
      calculateRunningHours(data);
    }
  }

  // ---------- CALCULATE RUNNING HOURS PER DAY ----------
  const calculateRunningHours = (logData) => {
    const month = dayjs().month();
    const year = dayjs().year();
    const filteredLogs = logData.filter((l) => dayjs(l.date).month() === month && dayjs(l.date).year() === year);

    const hoursMap = {};
    filteredLogs.forEach((l) => {
      if (!hoursMap[l.date]) hoursMap[l.date] = 0;
      hoursMap[l.date] += Number(l.hours_worked);
    });

    const sortedDates = Object.keys(hoursMap).sort((a, b) => dayjs(a).diff(dayjs(b)));

    const running = sortedDates.map((date) => ({ date, hours: hoursMap[date] }));
    setRunningHours(running);
  };

  // ---------- EXCHANGE RATE ----------
  const fetchExchangeRate = async (currencyCode) => {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${currencyCode}`);
      const data = await res.json();

      if (data?.rates?.PHP) {
        setRatePHP(data.rates.PHP.toFixed(2));
        setExchangeError("");
      } else {
        setExchangeError("Unable to fetch exchange rate.");
      }
    } catch {
      setExchangeError("Failed to fetch exchange rate.");
    }
  };

  // ----------------- CLOCKS -----------------
  function updateClocks() {
    const ph = dayjs().tz("Asia/Manila");
    setPhTime(ph.format("hh:mm:ss A"));
    setPhDate(ph.format("YYYY-MM-DD"));

    const other = dayjs().tz(selectedTZ);
    setOtherTime(other.format("hh:mm:ss A"));
    setOtherDate(other.format("YYYY-MM-DD"));
  }

  function handleTimezoneChange(tz) {
    const curr = timezoneCurrencyMap[tz] || "AUD";
    setSelectedTZ(tz);
    setCurrency(curr);
    updateClocks();
    fetchExchangeRate(curr);
  }

  // ----------------- UPDATE LOG -----------------
  const updateLog = async (log) => {
    const proceed = window.confirm("Do you want to edit this task?");
    if (!proceed) return;

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

    await fetchAllLogs();
    if (!error) alert("Updated successfully");
    else alert("Error updating log");
  };

  // ----------------- DELETE LOG -----------------
  const deleteLog = async (logId) => {
    const proceed = window.confirm("Are you sure you want to delete this task?");
    if (!proceed) return;

    const { error } = await supabase.from("logs").delete().eq("id", logId);
    await fetchAllLogs();
    if (!error) alert("Deleted successfully");
    else alert("Error deleting log");
  };

  // ----------------- ADD TASK USING MODAL -----------------
  const addTodaysTask = () => {
    if (!currentUserId) return alert("Please select a user first");

    setTaskDate(today);
    setTaskModalOpen(true);
  };

  // ----------------- SAVE TASKS (modal callback) -----------------
  async function handleTaskSave(entryList, pickedDate) {
    const inserts = entryList.map((e) => ({
      user_id: currentUserId,
      date: pickedDate,
      hours_worked: e.hours_worked,
      task_done: e.task_done,
    }));

    const { error } = await supabase.from("logs").insert(inserts);

    setTaskModalOpen(false);
    fetchAllLogs();

    if (error) alert("Error saving tasks");
    else alert("Tasks saved successfully");
  }

  // ----------------- REMEMBER USER -----------------
  useEffect(() => {
    if (rememberUser && currentUserId) {
      localStorage.setItem("rememberUserId", currentUserId);
    } else {
      localStorage.removeItem("rememberUserId");
    }
  }, [rememberUser, currentUserId]);

  // ----------------- RENDER -----------------
  return (
    <div className="admin-container">
      <h1 className="admin-title">Projecters Time Tracking System</h1>

      {/* -------- DROPDOWN -------- */}
      <div className="dropdown-container" ref={dropdownRef}>
        <button className="futuristic-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <FaBars className="icon-left" /> Actions
        </button>
        {dropdownOpen && (
          <ul className="dropdown-menu">
            <li onClick={() => { toRegister(); setDropdownOpen(false); }}>
              <FaUserPlus className="icon-left" /> Register New User
            </li>
            <li onClick={() => { toDashboard(); setDropdownOpen(false); }}>
              <FaClock className="icon-left" /> Manage Time Logs
            </li>
          </ul>
        )}
      </div>

      {/* -------- USER SELECTION + ADD TASK -------- */}
      <div className="user-selection">
        <label>Select User:</label>
        <select
          value={currentUserId}
          onChange={(e) => setCurrentUserId(e.target.value)}
          className="input-select"
        >
          <option value="">-- Select user --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <button className="futuristic-btn" onClick={addTodaysTask}>
          <FaPlus /> Add Today's Task
        </button>

        <label className="remember-user">
          <input
            type="checkbox"
            checked={rememberUser}
            onChange={() => setRememberUser(!rememberUser)}
          />
          Remember my user
        </label>
      </div>

      {/* -------- RUNNING HOURS CARD -------- */}
      <div className="running-hours-card">
        <h3>Running Hours This Month</h3>
        {runningHours.length === 0 ? (
          <p>No logs yet this month</p>
        ) : (
          <div className="hours-chart-container">
            {(() => {
              const maxHours = Math.max(...runningHours.map(r => r.hours)) || 1;
              const maxBarHeight = 140;
              return runningHours.map((item) => {
                const height = (item.hours / maxHours) * maxBarHeight;
                return (
                  <div key={item.date} className="hours-bar-wrapper">
                    <div
                      className="hours-bar"
                      style={{ height: `${height}px` }}
                      title={`${dayjs(item.date).format("DD MMM")}: ${item.hours} hrs`}
                    >
                      <span className="hours-value">{item.hours}</span>
                    </div>
                    <span className="bar-label">{dayjs(item.date).format("DD MMM")}</span>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* -------- SHOW ALL LOGS BUTTON -------- */}
<button
  className="btn-info"
  onClick={() => {
    setShowAllLogs(!showAllLogs);
    if (!showAllLogs) setLogs(allLogs);
    else setLogs(allLogs.filter((l) => l.date === today));
  }}
>
  {showAllLogs ? "📋 Show Today's Logs" : "📋 Show All Logs"}
</button>

{/* -------- LOGS CARD (DARK UI) -------- */}
<div className="logs-card">
  {/* -------- LOGS SEARCH + COUNT -------- */}
  <div className="logs-header">
    <input
      type="text"
      placeholder="Search by user, date, or task..."
      className="input-search"
      onChange={(e) => {
        const q = e.target.value.toLowerCase();
        const filtered = allLogs.filter(
          l =>
            l.user_id?.name.toLowerCase().includes(q) ||
            l.task_done.toLowerCase().includes(q) ||
            l.date.includes(q)
        );
        setLogs(filtered);
      }}
    />
    <span className="logs-count">{logs.length} {logs.length === 1 ? 'task' : 'tasks'} displayed</span>
  </div>

  <h2 className="tasks-title">{showAllLogs ? "All Tasks" : `Today: ${today}`}</h2>

  {logs.length === 0 ? (
    <div className="no-logs">
      <p>📭 No tasks logged {showAllLogs ? "yet." : "for today."}</p>
    </div>
  ) : (
    <div className="logs-table-container">
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
              <td className="action-buttons">
                <button className="btn-sm btn-secondary" onClick={() => updateLog(l)}>Edit</button>
                <button className="btn-sm btn-danger" onClick={() => deleteLog(l.id)}>Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>


      {/* -------- UNIFIED CLOCK + EXCHANGE CARD (HORIZONTAL) -------- */}
      <div className="unified-card horizontal">
        <div className="clock-container">
          <div className="clock-section">
            <h3>🇵🇭 Philippines</h3>
            <h1 className="clock-time">{phTime}</h1>
            <p className="clock-date">{phDate}</p>
          </div>

          <div className="clock-section">
            <h3>🌍 Other Country</h3>
            <select
              className="input-select small"
              value={selectedTZ}
              onChange={(e) => handleTimezoneChange(e.target.value)}
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <h1 className="clock-time">{otherTime}</h1>
            <p className="clock-date">{otherDate}</p>
          </div>
        </div>

        <div className="rate-container">
          <h3>{currency} → PHP</h3>
          {exchangeError ? <p style={{ color: "red" }}>{exchangeError}</p> : ratePHP ? <h1>₱{ratePHP}</h1> : <p>Loading...</p>}
          <button className="futuristic-btn" onClick={() => fetchExchangeRate(currency)}>Refresh Rate</button>
          <div className="exchange-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ratePHP ? [
                { value: ratePHP - 0.2 },
                { value: ratePHP - 0.1 },
                { value: ratePHP - 0.05 },
                { value: ratePHP },
              ] : []}>
                <Line type="monotone" dataKey="value" stroke="#4e73df" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="small-text">Auto-updates every 10 minutes</p>
        </div>
      </div>

      {/* ---------------- TASK MODAL ---------------- */}
      <TaskModal
        isOpen={taskModalOpen}
        selectedDate={taskDate}
        existingEntries={[]}
        onSave={handleTaskSave}
        onClose={() => setTaskModalOpen(false)}
        userId={currentUserId}
        fullName={users.find(u => u.id === currentUserId)?.name || "User"}
        bottomButton={true} // optional prop to place save button at bottom
      />
    </div>
  );
}
