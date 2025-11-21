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

    const daysInMonth = dayjs().daysInMonth();
    const running = [];
    const maxHours = Math.max(...Object.values(hoursMap), 1); // prevent divide by zero

    for (let i = 1; i <= daysInMonth; i++) {
      const date = dayjs().date(i).format("YYYY-MM-DD");
      const hours = hoursMap[date] || 0;
      running.push({
        date,
        hours,
        day: dayjs(date).format("ddd"),
        percent: Math.round((hours / maxHours) * 100)
      });
    }
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
    const newCurrency = timezoneCurrencyMap[tz] || "AUD";
    setCurrency(newCurrency);
    fetchExchangeRate(newCurrency);
  };

  const updateLog = (log) => {
    const user = users.find(u => u.id === log.user_id) || { id: null, name: "User" };
    setEditTask({ ...log, userObj: user });
    setEditModalOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteLog = async (logId) => {
    if (!window.confirm("Delete this task?")) return;
    await supabase.from("logs").delete().eq("id", logId);
    fetchAllLogs();
    showToast("Deleted", "success");
  };

  const addTodaysTask = () => {
    if (!currentUserId) return showToast("Select user first", "error");
    setTaskDate(today);
    setTaskModalOpen(true);
  };

  const handleTaskSave = async (entryList, pickedDate) => {
    const inserts = entryList.map(e => ({
      user_id: currentUserId,
      date: pickedDate,
      hours_worked: e.hours_worked,
      task_done: e.task_done,
    }));
    await supabase.from("logs").insert(inserts);
    setTaskModalOpen(false);
    fetchAllLogs();
    showToast("Tasks saved");
  };

  // Remember user
  useEffect(() => {
    if (rememberUser && currentUserId) localStorage.setItem("rememberUserId", currentUserId);
    else localStorage.removeItem("rememberUserId");
  }, [rememberUser, currentUserId]);

  const handleSearch = (query) => {
    const q = query.toLowerCase();
    setLogs(allLogs.filter(l =>
      l.user?.name.toLowerCase().includes(q) ||
      l.task_done.toLowerCase().includes(q) ||
      l.date.includes(q)
    ));
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Projecters Time Tracking System</h1>

      {/* DROPDOWN */}
      <div className="dropdown-container" ref={dropdownRef}>
        <button className="futuristic-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <FaBars /> Actions
        </button>
        {dropdownOpen && (
          <ul className="dropdown-menu">
            <li onClick={() => { toRegister(); setDropdownOpen(false); }}><FaUserPlus /> Register New User</li>
            <li onClick={() => { toDashboard(); setDropdownOpen(false); }}><FaClock /> Manage Time Logs</li>
          </ul>
        )}
      </div>

      {/* USER SELECTION */}
      <div className="user-selection">
        <label>Select User:</label>
        <select value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)} className="input-select">
          <option value="">-- Select user --</option>
          {users.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
        </select>

        <button className="futuristic-btn" onClick={addTodaysTask}>
          <FaPlus /> Add Today's Task
        </button>

        <label className="remember-user">
          <input type="checkbox" checked={rememberUser} onChange={() => setRememberUser(!rememberUser)} /> Remember my user
        </label>
      </div>

      {/* RUNNING HOURS */}
      <div className="running-hours-card">
        <h2 className="tasks-title">Running Hours This Month</h2>
        <div className="running-hours-grid">
          {runningHours.map((item, index) => (
            <div className="hours-card" key={index}>
              <div className="hours-day">{item.day}</div>
              <div className="hours-date">{item.date}</div>
              <div className="hours-total">{item.hours}h</div>
              <div className="hours-progress-bar-bg">
                <div className="hours-progress-bar-fill" style={{ width: `${item.percent}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SHOW ALL LOGS */}
      <button className="btn-info" onClick={() => {
        setShowAllLogs(prev => !prev);
        setLogs(!showAllLogs ? allLogs : allLogs.filter(l => l.date === today));
      }}>
        {showAllLogs ? "📋 Show Today's Logs" : "📋 Show All Logs"}
      </button>

      {/* LOGS TABLE */}
      <div className="logs-card">
        <div className="logs-header">
          <div className="search-counter-container">
            <input type="text" placeholder="Search by user, date, or task..." className="input-search" onChange={(e) => handleSearch(e.target.value)} />
            <span className="logs-count">{logs.length} tasks displayed</span>
          </div>
        </div>

        <h2 className="tasks-title">{showAllLogs ? "All Tasks" : `Today: ${today}`}</h2>

        {logs.length === 0 ? (
          <div className="no-logs"><p>📭 No tasks logged</p></div>
        ) : (
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
        )}
      </div>

      {/* CLOCK + EXCHANGE */}
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
          {exchangeError ? (
            <p style={{ color: "red" }}>{exchangeError}</p>
          ) : ratePHP ? (
            <h1>₱{ratePHP}</h1>
          ) : (
            <p>Loading...</p>
          )}

          <button className="futuristic-btn" onClick={() => fetchExchangeRate(currency)}>Refresh Rate</button>

          <div className="exchange-chart">
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={ratePHP ? [
                { value: ratePHP - 0.2 },
                { value: ratePHP - 0.1 },
                { value: ratePHP - 0.05 },
                { value: ratePHP }
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
        onSave={async (update) => {
          await supabase
            .from("logs")
            .update({ task_done: update.task_done, hours_worked: Number(update.hours_worked) })
            .eq("id", update.id);

          fetchAllLogs();
          showToast("Updated!", "success");
        }}
        showToast={showToast}
      />

      {/* TOAST */}
      {toast.visible && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
