// src/components/AdminDashboard.js
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import { FaBars, FaClock, FaUserPlus, FaChartLine } from "react-icons/fa";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import "./AdminDashboard.css";

export default function AdminDashboard({ toRegister, toDashboard }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [rememberUser, setRememberUser] = useState(false);

  const [todayUserLogs, setTodayUserLogs] = useState([]);
  const [todayAllUserLogs, setTodayAllUserLogs] = useState([]);
  const [weekAllUserLogs, setWeekAllUserLogs] = useState([]);
  const [runningAllUserLogs, setRunningAllUserLogs] = useState([]);

  const [loading, setLoading] = useState(false);

  // EXCHANGE RATE
  const [ratePHP, setRatePHP] = useState(null);
  const [exchangeError, setExchangeError] = useState("");

  const [currency, setCurrency] = useState("AUD"); // default (PH clock static)
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ---------- CLOCK STATES ----------
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
  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");

  // ---------- INIT LOAD ----------
  useEffect(() => {
    const storedUserId = localStorage.getItem("rememberedUserId");
    if (storedUserId) {
      setCurrentUserId(storedUserId);
      setRememberUser(true);
    }

    fetchUsers();
    fetchTodayAllUserLogs();
    fetchWeekAllUserLogs();
    fetchRunningAllUserLogs();

    // Fetch exchange for default timezone
    fetchExchangeRate(currency);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-refresh exchange every 10 min
  useEffect(() => {
    const interval = setInterval(() => fetchExchangeRate(currency), 600000);
    return () => clearInterval(interval);
  }, [currency]);

  // Load user logs when user changes
  useEffect(() => {
    if (currentUserId) fetchTodayUserLogs();
    else setTodayUserLogs([]);

    if (rememberUser) localStorage.setItem("rememberedUserId", currentUserId);
    else localStorage.removeItem("rememberedUserId");
  }, [currentUserId, rememberUser]);

  // ---------- CLOCK UPDATER ----------
  useEffect(() => {
    const updateClocks = () => {
      setPhTime(
        new Date().toLocaleString("en-US", {
          timeZone: "Asia/Manila",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );

      setPhDate(
        new Date().toLocaleDateString("en-US", {
          timeZone: "Asia/Manila",
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      );

      setOtherTime(
        new Date().toLocaleString("en-US", {
          timeZone: selectedTZ,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );

      setOtherDate(
        new Date().toLocaleDateString("en-US", {
          timeZone: selectedTZ,
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      );
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [selectedTZ]);

  // ---------- SUPABASE FETCHERS ----------
  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("*");
    if (data) setUsers(data);
  };

  const fetchTodayUserLogs = async () => {
    const { data } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", currentUserId)
      .eq("date", today);
    if (data) setTodayUserLogs(data);
  };

  const fetchTodayAllUserLogs = async () => {
    const { data } = await supabase.from("logs").select("*").eq("date", today);
    if (data) setTodayAllUserLogs(data);
  };

  const fetchWeekAllUserLogs = async () => {
    const { data } = await supabase.from("logs").select("*").gte("date", weekStart);
    if (data) setWeekAllUserLogs(data);
  };

  const fetchRunningAllUserLogs = async () => {
    const { data } = await supabase.from("logs").select("*");
    if (data) setRunningAllUserLogs(data);
  };

  // ---------- METRICS ----------
  const computeMetrics = (logs) => {
    let totalWorkMs = 0;
    let totalBreakMins = 0;

    logs.forEach((log) => {
      if (log.time_in && log.time_out) {
        const inTime = new Date(log.time_in).getTime();
        const outTime = new Date(log.time_out).getTime();
        const breakMs = (log.break_time ?? 0) * 60000;
        totalWorkMs += Math.max(0, outTime - inTime - breakMs);
      }
      totalBreakMins += log.break_time ?? 0;
    });

    return {
      workHours: +(totalWorkMs / 3600000).toFixed(2),
      breakMins: totalBreakMins,
    };
  };

  const userTodayMetrics = computeMetrics(todayUserLogs);
  const allTodayMetrics = computeMetrics(todayAllUserLogs);
  const weekMetrics = computeMetrics(weekAllUserLogs);
  const runningMetrics = computeMetrics(runningAllUserLogs);

  const chartData = [
    {
      category: "User Today",
      Work: userTodayMetrics.workHours,
      Break: +(userTodayMetrics.breakMins / 60).toFixed(2),
    },
    {
      category: "All Users Today",
      Work: allTodayMetrics.workHours,
      Break: +(allTodayMetrics.breakMins / 60).toFixed(2),
    },
    {
      category: "This Week",
      Work: weekMetrics.workHours,
      Break: +(weekMetrics.breakMins / 60).toFixed(2),
    },
    {
      category: "Total",
      Work: runningMetrics.workHours,
      Break: +(runningMetrics.breakMins / 60).toFixed(2),
    },
  ];

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

  // On timezone change → update currency → fetch rate
  const handleTimezoneChange = (value) => {
    setSelectedTZ(value);

    const newCurrency = timezoneCurrencyMap[value];
    setCurrency(newCurrency);

    fetchExchangeRate(newCurrency);
  };

  // ---------- PUNCH IN ----------
  const punchIn = async () => {
    if (!currentUserId) return alert("Please select a user.");
    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from("logs")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("date", today)
        .is("time_out", null);

      if (existing.length > 0) {
        alert("There is already an open log entry.");
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

      await fetchTodayUserLogs();
      await fetchTodayAllUserLogs();
      await fetchWeekAllUserLogs();
      await fetchRunningAllUserLogs();
    } finally {
      setLoading(false);
    }
  };

  // ---------- PUNCH OUT ----------
  const punchOut = async (log) => {
    if (!log || log.time_out) return;

    setLoading(true);
    try {
      await supabase.from("logs").update({ time_out: new Date().toISOString() }).eq("id", log.id);

      await fetchTodayUserLogs();
      await fetchTodayAllUserLogs();
      await fetchWeekAllUserLogs();
      await fetchRunningAllUserLogs();
    } finally {
      setLoading(false);
    }
  };

  // ---------- HEATMAP DATA ----------
  const allUsers = users.map((u) => ({
    ...u,
    logs: runningAllUserLogs.filter((log) => log.user_id === u.id) || [],
  }));

  // ---------- JSX ----------
  return (
    <div className="admin-container">
      <h1 className="admin-title">Projecters Time Tracking System</h1>

      {/* -------- Dropdown -------- */}
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

      {/* -------- USER SELECTION -------- */}
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

        <button
          className="futuristic-btn"
          onClick={punchIn}
          disabled={!currentUserId || loading}
        >
          <FaClock className="icon-left" /> Punch In
        </button>

        <label className="remember-user">
          <input type="checkbox" checked={rememberUser} onChange={() => setRememberUser(!rememberUser)} />
          Remember my user
        </label>
      </div>

      {/* -------- USER LOGS SECTION (MOVED ABOVE CLOCKS) -------- */}
      <div className="logs-section">
        <h4>User Logs for {today}</h4>

        {todayUserLogs.length === 0 ? (
          <p className="empty-row">No log entries today.</p>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Break (mins)</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {todayUserLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.time_in ? dayjs(log.time_in).format("HH:mm:ss") : "-"}</td>
                  <td>{log.time_out ? dayjs(log.time_out).format("HH:mm:ss") : "-"}</td>
                  <td>{log.break_time ?? 0}</td>
                  <td>
                    {!log.time_out && (
                      <button
                        className="btn-sm btn-danger"
                        disabled={loading}
                        onClick={() => punchOut(log)}
                      >
                        Punch Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}
      </div>

      {/* -------- UNIFIED CLOCK + EXCHANGE CARD -------- */}
      <div className="unified-card">

        {/* LEFT — CLOCKS */}
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

        {/* RIGHT — EXCHANGE RATE */}
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
                data={[
                  { value: ratePHP - 0.2 },
                  { value: ratePHP - 0.1 },
                  { value: ratePHP - 0.05 },
                  { value: ratePHP },
                ]}
              >
                <Line type="monotone" dataKey="value" stroke="#4e73df" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="small-text">Auto-updates every 10 minutes</p>
        </div>
      </div>

      {/* -------- PERFORMANCE METRICS -------- */}
      <div className="metrics-container">
        <div className="performance-card">
          <h2>Performance Metrics</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d0d0d0" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Bar dataKey="Work" fill="#4e73df" />
              <Bar dataKey="Break" fill="#1cc88a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* -------- HEATMAP -------- */}
        <div className="heatmap-card performance-card">
          <h2 className="heatmap-title">User Activity Heatmap</h2>

          <div className="heatmap-grid-container">
            {allUsers.map((user) => (
              <div className="heatmap-row" key={user.id}>
                <div className="heatmap-user">{user.name}</div>
                <div className="heatmap-row-cells">
                  {Array.from({ length: 14 }).map((_, dayIdx) => {
                    const date = dayjs().subtract(dayIdx, "day");
                    const logs = user.logs.filter((l) => dayjs(l.date).isSame(date, "day")) || [];

                    const hoursWorked = logs.reduce((total, log) => {
                      if (log.time_in && log.time_out) {
                        const inTime = new Date(log.time_in).getTime();
                        const outTime = new Date(log.time_out).getTime();
                        const breakMs = (log.break_time ?? 0) * 60000;
                        return total + Math.max(0, outTime - inTime - breakMs);
                      }
                      return total;
                    }, 0);

                    const hoursWorkedDisplay = (hoursWorked / 3600000).toFixed(2);

                    const level =
                      logs.length >= 6 ? 4 :
                      logs.length >= 4 ? 3 :
                      logs.length >= 2 ? 2 :
                      logs.length >= 1 ? 1 : 0;

                    return (
                      <div
                        key={dayIdx}
                        className={`heatmap-cell level-${level}`}
                        title={`${date.format("MMM DD, YYYY")} — ${logs.length} log(s), ${hoursWorkedDisplay}h worked`}
                      ></div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="heatmap-legend">
            <span>Less</span>
            <div className="legend-box level-0"></div>
            <div className="legend-box level-1"></div>
            <div className="legend-box level-2"></div>
            <div className="legend-box level-3"></div>
            <div className="legend-box level-4"></div>
            <span>More</span>
          </div>

          <p className="heatmap-subtext">Past 14 days</p>
        </div>
      </div>
    </div>
  );
}
