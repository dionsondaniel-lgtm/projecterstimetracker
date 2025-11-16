// src/components/AdminDashboard.js
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { FaBars, FaUserPlus, FaClock, FaPlus } from "react-icons/fa";
import { LineChart, Line, ResponsiveContainer } from "recharts";

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

    if (!error) setAllLogs(data);
    if (!showAllLogs) setLogs(data.filter((l) => l.date === today));
  }

  // ---------- EXCHANGE RATE FETCHER ----------
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
    setPhTime(ph.format("HH:mm:ss"));
    setPhDate(ph.format("YYYY-MM-DD"));

    const other = dayjs().tz(selectedTZ);
    setOtherTime(other.format("HH:mm:ss"));
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

  // ----------------- ADD TODAY'S TASK -----------------
  const addTodaysTask = async () => {
    if (!currentUserId) return alert("Please select a user first");

    const proceed = window.confirm("Do you want to add a new task for today?");
    if (!proceed) return;

    const task = prompt("Enter task description:");
    const hours = prompt("Enter hours worked:");
    if (!task || !hours) return alert("Invalid input");

    const { error } = await supabase.from("logs").insert({
      user_id: currentUserId,
      date: today,
      task_done: task,
      hours_worked: Number(hours),
    });

    await fetchAllLogs();
    if (!error) alert("Task added successfully");
    else alert("Error adding task");
  };

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

      {/* -------- LOGS TABLE -------- */}
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

      <h2 className="tasks-title">{showAllLogs ? "All Tasks" : `Today: ${today}`}</h2>
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
            {logs.map((l) => {
              const payPHP = ratePHP ? Number(l.hours_worked) * ratePHP : 0;
              return (
                <tr key={l.id}>
                  <td>{l.user_id?.name}</td>
                  <td>{l.date}</td>
                  <td>{l.task_done}</td>
                  <td>{l.hours_worked}</td>
                  <td>
                    <button className="btn-sm btn-secondary" onClick={() => updateLog(l)}>Edit</button>
                    <button className="btn-sm btn-danger" onClick={() => deleteLog(l.id)}>Del</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* -------- UNIFIED CLOCK + EXCHANGE CARD -------- */}
      <div className="unified-card">
        <div className="clock-container">
          <div className="clock-section">
            <h3>🇵🇭 Philippines</h3>
            <h1 className="clock-time">{phTime}</h1>
            <p className="clock-date">{phDate}</p>
          </div>

          <hr className="clock-divider" />

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
          {exchangeError ? (
            <p style={{ color: "red" }}>{exchangeError}</p>
          ) : ratePHP ? (
            <h1>₱{ratePHP}</h1>
          ) : (
            <p>Loading...</p>
          )}

          <button className="futuristic-btn" onClick={() => fetchExchangeRate(currency)}>
            Refresh Rate
          </button>

          <div className="exchange-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={
                  ratePHP
                    ? [
                        { value: ratePHP - 0.2 },
                        { value: ratePHP - 0.1 },
                        { value: ratePHP - 0.05 },
                        { value: ratePHP },
                      ]
                    : []
                }
              >
                <Line type="monotone" dataKey="value" stroke="#4e73df" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="small-text">Auto-updates every 10 minutes</p>
        </div>
      </div>
    </div>
  );
}
