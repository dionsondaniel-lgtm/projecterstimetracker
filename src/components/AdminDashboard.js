// src/components/AdminDashboard.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { FaBars, FaUserPlus, FaClock, FaPlus } from "react-icons/fa";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import TaskModal from "./TaskModal";
import EditTaskModal from "./EditTaskModal";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekOfYear);

export default function AdminDashboard({ toRegister, toDashboard }) {
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

  const selectedTZRef = useRef(selectedTZ);
  useEffect(() => { selectedTZRef.current = selectedTZ; }, [selectedTZ]);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDate, setTaskDate] = useState(dayjs().format("YYYY-MM-DD"));

  const [runningHours, setRunningHours] = useState([]);

  const [editTask, setEditTask] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Toast messages
  const [toast, setToast] = useState({ message: "", type: "", visible: false });
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  }, []);

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
    fetchExchangeRate(currency);

    const clockInterval = setInterval(updateClockTimes, 1000);
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
  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("*").order("name");
    if (!error) setUsers(data);
  };

  // ----------------- FETCH LOGS -----------------
  const fetchAllLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("*, user:user_id(name)")
      .order("date", { ascending: false });

    if (!error) {
      setAllLogs(data);
      setLogs(showAllLogs ? data : data.filter(l => l.date === today));
      calculateRunningHours(data);
    }
  };

  // ---------- CALCULATE RUNNING HOURS PER DAY ----------
  const calculateRunningHours = (logData) => {
    const month = dayjs().month();
    const year = dayjs().year();
    const filteredLogs = logData.filter(l => dayjs(l.date).month() === month && dayjs(l.date).year() === year);

    const hoursMap = {};
    filteredLogs.forEach(l => { hoursMap[l.date] = (hoursMap[l.date] || 0) + Number(l.hours_worked); });

    // Fill missing days
    const daysInMonth = dayjs().daysInMonth();
    const running = Array.from({ length: daysInMonth }, (_, i) => {
      const date = dayjs().date(i + 1).format("YYYY-MM-DD");
      return { date, hours: hoursMap[date] || 0 };
    });

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
  const updateClockTimes = () => {
    const ph = dayjs().tz("Asia/Manila");
    setPhTime(ph.format("hh:mm:ss A"));
    setPhDate(ph.format("YYYY-MM-DD"));

    const tz = selectedTZRef.current;
    const other = dayjs().tz(tz);
    setOtherTime(other.format("hh:mm:ss A"));
    setOtherDate(other.format("YYYY-MM-DD"));
  };

  const handleTimezoneChange = (tz) => {
    setSelectedTZ(tz);
    const curr = timezoneCurrencyMap[tz] || "AUD";
    setCurrency(curr);
    fetchExchangeRate(curr);
  };

  // ----------------- UPDATE LOG -----------------
  const updateLog = (log) => {
    const user = users.find(u => u.id === log.user_id) || { id: null, name: "User" };
    setEditTask({ ...log, userObj: user });
    setEditModalOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ----------------- HANDLE EDIT SAVE -----------------
  const handleEditSave = async (updatedTask) => {
    try {
      const { error } = await supabase
        .from("logs")
        .update({ task_done: updatedTask.task_done, hours_worked: Number(updatedTask.hours_worked) })
        .eq("id", updatedTask.id);

      await fetchAllLogs();
      if (!error) showToast("Updated successfully", "success");
      else showToast("Error updating task", "error");
    } catch {
      showToast("Unexpected error updating task", "error");
    }
  };

  // ----------------- DELETE LOG -----------------
  const deleteLog = async (logId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    const { error } = await supabase.from("logs").delete().eq("id", logId);
    await fetchAllLogs();
    if (!error) showToast("Deleted successfully", "success");
    else showToast("Error deleting log", "error");
  };

  // ----------------- ADD TASK -----------------
  const addTodaysTask = () => {
    if (!currentUserId) return showToast("Please select a user first", "error");
    setTaskDate(today);
    setTaskModalOpen(true);
  };

  // ----------------- SAVE TASKS -----------------
  const handleTaskSave = async (entryList, pickedDate) => {
    const inserts = entryList.map(e => ({
      user_id: currentUserId,
      date: pickedDate,
      hours_worked: e.hours_worked,
      task_done: e.task_done,
    }));

    const { error } = await supabase.from("logs").insert(inserts);
    setTaskModalOpen(false);
    fetchAllLogs();
    if (!error) showToast("Tasks saved successfully", "success");
    else showToast("Error saving tasks", "error");
  };

  // ----------------- REMEMBER USER -----------------
  useEffect(() => {
    if (rememberUser && currentUserId) localStorage.setItem("rememberUserId", currentUserId);
    else localStorage.removeItem("rememberUserId");
  }, [rememberUser, currentUserId]);

  // ----------------- SEARCH -----------------
  const handleSearch = (query) => {
    const q = query.toLowerCase();
    setLogs(allLogs.filter(l =>
      l.user?.name.toLowerCase().includes(q) ||
      l.task_done.toLowerCase().includes(q) ||
      l.date.includes(q)
    ));
  };

  // ----------------- RENDER -----------------
  return (
    <div className="admin-container">
      <h1 className="admin-title">Projecters Time Tracking System</h1>

      {/* DROPDOWN */}
      <div className="dropdown-container" ref={dropdownRef}>
        <button className="futuristic-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <FaBars className="icon-left" /> Actions
        </button>
        {dropdownOpen && (
          <ul className="dropdown-menu">
            <li onClick={() => { toRegister(); setDropdownOpen(false); }}><FaUserPlus className="icon-left" /> Register New User</li>
            <li onClick={() => { toDashboard(); setDropdownOpen(false); }}><FaClock className="icon-left" /> Manage Time Logs</li>
          </ul>
        )}
      </div>

      {/* USER SELECTION + ADD TASK */}
      <div className="user-selection">
        <label>Select User:</label>
        <select value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)} className="input-select">
          <option value="">-- Select user --</option>
          {users.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
        </select>

        <button className="futuristic-btn" onClick={addTodaysTask}><FaPlus /> Add Today's Task</button>

        <label className="remember-user">
          <input type="checkbox" checked={rememberUser} onChange={() => setRememberUser(!rememberUser)} /> Remember my user
        </label>
      </div>

      <div className="running-hours-card">
  <h3>Running Hours This Month</h3>

  {runningHours.length === 0 ? (
    <p>No logs yet this month</p>
  ) : (
    <div className="running-hours-scroll">
      {(() => {
        const rows = [];
        const chunkSize = 10; // 10 days per row
        for (let i = 0; i < runningHours.length; i += chunkSize) {
          const rowItems = runningHours.slice(i, i + chunkSize);
          rows.push(
            <div key={i} className="hours-row">
              {rowItems.map(item => {
                const maxHours = Math.max(...runningHours.map(r => r.hours)) || 1;
                const height = (item.hours / maxHours) * 140;

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
              })}
            </div>
          );
        }
        return rows;
      })()}
    </div>
  )}
</div>

      {/* SHOW ALL LOGS BUTTON */}
      <button className="btn-info" onClick={() => {
        setShowAllLogs(prev => !prev);
        setLogs(prev => !showAllLogs ? allLogs : allLogs.filter(l => l.date === today));
      }}>{showAllLogs ? "📋 Show Today's Logs" : "📋 Show All Logs"}</button>

      {/* LOGS TABLE */}
      <div className="logs-card">
        <div className="logs-header">
          <div className="search-counter-container">
            <input type="text" placeholder="Search by user, date, or task..." className="input-search" onChange={(e) => handleSearch(e.target.value)} />
            <span className="logs-count">{logs.length} {logs.length === 1 ? "task" : "tasks"} displayed</span>
          </div>
        </div>

        <h2 className="tasks-title">{showAllLogs ? "All Tasks" : `Today: ${today}`}</h2>

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

      {/* CLOCK + EXCHANGE RATE */}
      <div className="unified-card horizontal">
        <div className="clock-container">
          <div className="clock-section">
            <h3>🇵🇭 Philippines</h3>
            <h1 className="clock-time">{phTime}</h1>
            <p className="clock-date">{phDate}</p>
          </div>
          <div className="clock-section">
            <h3>🌍 Other Country</h3>
            <select className="input-select small" value={selectedTZ} onChange={(e) => handleTimezoneChange(e.target.value)}>
              {timezones.map(tz => (<option key={tz.value} value={tz.value}>{tz.label}</option>))}
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

      {/* TASK MODAL */}
      <TaskModal
        isOpen={taskModalOpen}
        selectedDate={taskDate}
        existingEntries={[]}
        onSave={handleTaskSave}
        onClose={() => setTaskModalOpen(false)}
        userId={currentUserId}
        fullName={users.find(u => u.id === currentUserId)?.name || "User"}
        bottomButton={true}
      />

      {/* EDIT TASK MODAL */}
      <EditTaskModal
        isOpen={editModalOpen}
        task={editTask}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEditSave}
        showToast={showToast}
      />

      {/* TOAST */}
      {toast.visible && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
