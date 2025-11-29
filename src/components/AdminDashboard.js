// src/components/AdminDashboard.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { FaBars, FaUserPlus, FaClock, FaPlus } from "react-icons/fa";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
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

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDate, setTaskDate] = useState(dayjs().format("YYYY-MM-DD"));

  const [runningHours, setRunningHours] = useState([]);
  const [editTask, setEditTask] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "", visible: false });

  // FILTER INPUT STATES
  const [inputUser, setInputUser] = useState("");
  const [inputTask, setInputTask] = useState("");
  const [inputDate, setInputDate] = useState("");

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

  useEffect(() => {
    selectedTZRef.current = selectedTZ;
  }, [selectedTZ]);

  // INITIAL LOAD
  useEffect(() => {
    fetchUsers();
    fetchAllLogs();
    fetchExchangeRate(currency);

    const clockInterval = setInterval(updateClockTimes, 1000);
    const exchangeInterval = setInterval(() => fetchExchangeRate(currency), 600000);

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

  // FETCH USERS
  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("name");
    if (data) setUsers(data);
  };

  // FETCH LOGS
  const fetchAllLogs = async () => {
    const { data } = await supabase
      .from("logs")
      .select("*, user:user_id(name)")
      .order("date", { ascending: false });

    if (data) {
      setAllLogs(data);
      setLogs(showAllLogs ? data : data.filter(l => l.date === today));
      calculateRunningHours(data);
    }
  };

  // RUNNING HOURS (BAR CHART)
  const calculateRunningHours = (logData) => {
    const month = dayjs().month();
    const year = dayjs().year();

    const filtered = logData.filter(
      l => dayjs(l.date).month() === month && dayjs(l.date).year() === year
    );

    const hoursMap = {};
    filtered.forEach(l => {
      hoursMap[l.date] = (hoursMap[l.date] || 0) + Number(l.hours_worked);
    });

    const days = dayjs().daysInMonth();
    const result = [];

    for (let i = 1; i <= days; i++) {
      const date = dayjs().date(i).format("YYYY-MM-DD");
      result.push({
        date,
        day: dayjs(date).format("DD"),
        hours: hoursMap[date] || 0,
      });
    }

    setRunningHours(result);
  };

  // EXCHANGE RATE
  const fetchExchangeRate = async (currencyCode) => {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${currencyCode}`);
      const data = await res.json();
      if (data?.rates?.PHP) {
        setRatePHP(data.rates.PHP.toFixed(2));
        setExchangeError("");
      } else setExchangeError("Unable to fetch exchange rate.");
    } catch {
      setExchangeError("Failed to fetch exchange rate.");
    }
  };

  // CLOCK UPDATE
  const updateClockTimes = () => {
    const ph = dayjs().tz("Asia/Manila");
    setPhTime(ph.format("hh:mm:ss A"));
    setPhDate(ph.format("YYYY-MM-DD"));

    const other = dayjs().tz(selectedTZRef.current);
    setOtherTime(other.format("hh:mm:ss A"));
    setOtherDate(other.format("YYYY-MM-DD"));
  };

  const handleTimezoneChange = (tz) => {
    setSelectedTZ(tz);
    const newCur = timezoneCurrencyMap[tz] || "AUD";
    setCurrency(newCur);
    fetchExchangeRate(newCur);
  };

  // UPDATE LOG
  const updateLog = (log) => {
    const user = users.find(u => u.id === log.user_id) || null;
    setEditTask({ ...log, userObj: user });
    setEditModalOpen(true);
  };

  // DELETE
  const deleteLog = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await supabase.from("logs").delete().eq("id", id);
    fetchAllLogs();
    showToast("Deleted", "success");
  };

  const addTodaysTask = () => {
    if (!currentUserId) return showToast("Select user first", "error");
    setTaskDate(today);
    setTaskModalOpen(true);
  };

  const handleTaskSave = async (list, pickedDate) => {
    const inserts = list.map(e => ({
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

  // REMEMBER USER
  useEffect(() => {
    if (rememberUser && currentUserId)
      localStorage.setItem("rememberUserId", currentUserId);
    else localStorage.removeItem("rememberUserId");
  }, [rememberUser, currentUserId]);

  // ------------------- FILTERS -------------------
  const applyFilters = () => {
  let filtered = [...allLogs];

  // Compare inputUser with user_id in logs
  if (inputUser) {
    filtered = filtered.filter(l => String(l.user_id) === String(inputUser));
  }
  if (inputTask) {
    filtered = filtered.filter(l => l.task_done.toLowerCase().includes(inputTask.toLowerCase()));
  }
  if (inputDate) {
    filtered = filtered.filter(l => l.date === inputDate);
  }

  // If no filters and not show all, default to today
  if (!inputUser && !inputTask && !inputDate && !showAllLogs) {
    filtered = filtered.filter(l => l.date === today);
  }

  setLogs(filtered);
};

  const clearFilters = () => {
    setInputUser("");
    setInputTask("");
    setInputDate("");
    setLogs(showAllLogs ? allLogs : allLogs.filter(l => l.date === today));
  };

  return (
    <div className="page-wrapper">
      {/* HEADER */}
      <header className="header">
        <h1>Projecters Time Tracking System</h1>
        <button className="btn-icon" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <FaBars />
        </button>
        {dropdownOpen && (
          <ul className="dropdown">
            <li onClick={() => { toRegister(); setDropdownOpen(false); }}>
              <FaUserPlus /> Register New User
            </li>
            <li onClick={() => { toDashboard(); setDropdownOpen(false); }}>
              <FaClock /> Manage Time Logs
            </li>
          </ul>
        )}
      </header>

      {/* USER AREA */}
      <section className="card">
        <h2>User Tools</h2>
        <div className="row">
          <select
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="input"
          >
            <option value="">-- Select user --</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="btn-primary" onClick={addTodaysTask}>
            <FaPlus /> Add Today's Task
          </button>
        </div>
        <label className="remember">
          <input
            type="checkbox"
            checked={rememberUser}
            onChange={() => setRememberUser(!rememberUser)}
          />
          Remember my user
        </label>
      </section>

      {/* CHART */}
      <section className="card">
        <h2>Monthly Man-Hours</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={runningHours}>
              <XAxis dataKey="day" />
              <Tooltip />
              <Bar dataKey="hours" fill="#4e73df" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* SHOW LOGS BUTTON */}
      <button
        className="btn-info full"
        onClick={() => {
          setShowAllLogs(!showAllLogs);
          setLogs(!showAllLogs ? allLogs : allLogs.filter(l => l.date === today));
        }}
      >
        {showAllLogs ? "Show Today's Logs" : "Show All Logs"}
      </button>

      {/* LOGS */}
      <section className="card">
        <div className="row space-between">
          {/* USER FILTER */}
          <select
            className="input"
            value={inputUser}
            onChange={(e) => setInputUser(e.target.value)}
          >
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          {/* TASK FILTER */}
          <input
            type="text"
            placeholder="Search by task..."
            className="input"
            value={inputTask}
            onChange={(e) => setInputTask(e.target.value)}
          />

          {/* DATE PICKER */}
          <input
            type="date"
            className="input"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
          />

          <button className="btn-primary" onClick={applyFilters}>Filter</button>
          <button className="btn-secondary" onClick={clearFilters}>Clear</button>

          <span className="small-muted">{logs.length} tasks</span>
        </div>

        {logs.length === 0 ? (
          <p className="empty">No tasks found</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Date</th>
                  <th>Task</th>
                  <th>Hours</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{log.user?.name}</td>
                    <td>{log.date}</td>
                    <td>{log.task_done}</td>
                    <td>{log.hours_worked}</td>
                    <td className="actions">
                      <button className="btn-sm" onClick={() => updateLog(log)}>Edit</button>
                      <button className="btn-sm danger" onClick={() => deleteLog(log.id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CLOCK & EXCHANGE */}
      <section className="card">
        <h2>World Clock & Rate</h2>
        <div className="grid-2">
          <div className="clock-box">
            <h3>🇵🇭 Philippines</h3>
            <h1>{phTime}</h1>
            <p>{phDate}</p>
          </div>

          <div className="clock-box">
            <h3>🌍 Other Country</h3>
            <select
              className="input"
              value={selectedTZ}
              onChange={(e) => handleTimezoneChange(e.target.value)}
            >
              {timezones.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <h1>{otherTime}</h1>
            <p>{otherDate}</p>
          </div>
        </div>

        <hr />

        <h3>Exchange Rate ({currency} → PHP)</h3>
        {exchangeError ? (
          <p className="error">{exchangeError}</p>
        ) : ratePHP ? (
          <h1 className="rate">₱{ratePHP}</h1>
        ) : <p>Loading…</p>}

        <button className="btn-primary" onClick={() => fetchExchangeRate(currency)}>Refresh Rate</button>
      </section>

      {/* MODALS */}
      <TaskModal
        isOpen={taskModalOpen}
        selectedDate={taskDate}
        existingEntries={[]}
        onSave={handleTaskSave}
        onClose={() => setTaskModalOpen(false)}
        userId={currentUserId}
        fullName={users.find(u => u.id === currentUserId)?.name || ""}
      />

      <EditTaskModal
        isOpen={editModalOpen}
        task={editTask}
        onClose={() => setEditModalOpen(false)}
        onSave={async (update) => {
          await supabase.from("logs").update({
            task_done: update.task_done,
            hours_worked: Number(update.hours_worked),
          }).eq("id", update.id);

          fetchAllLogs();
          showToast("Updated!", "success");
        }}
      />

      {toast.visible && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
