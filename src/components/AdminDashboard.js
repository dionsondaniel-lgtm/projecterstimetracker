import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import { FaBars, FaClock, FaUserPlus, FaChartLine } from "react-icons/fa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "./AdminDashboard.css";

export default function AdminDashboard({ toRegister, toDashboard, toUserDashboard }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [rememberUser, setRememberUser] = useState(false);
  const [todayUserLogs, setTodayUserLogs] = useState([]);
  const [todayAllUserLogs, setTodayAllUserLogs] = useState([]);
  const [weekAllUserLogs, setWeekAllUserLogs] = useState([]);
  const [runningAllUserLogs, setRunningAllUserLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [audToPhp, setAudToPhp] = useState(null);
  const [exchangeError, setExchangeError] = useState("");
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");
  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");

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
    fetchExchangeRate();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchExchangeRate, 600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUserId) fetchTodayUserLogs();
    else setTodayUserLogs([]);

    if (rememberUser) localStorage.setItem("rememberedUserId", currentUserId);
    else localStorage.removeItem("rememberedUserId");
  }, [currentUserId, rememberUser]);

  // ---------------- Supabase Fetchers ----------------
  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("*");
    if (!error) setUsers(data);
  };

  const fetchTodayUserLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", currentUserId)
      .eq("date", today);
    if (!error) setTodayUserLogs(data);
  };

  const fetchTodayAllUserLogs = async () => {
    const { data, error } = await supabase.from("logs").select("*").eq("date", today);
    if (!error) setTodayAllUserLogs(data);
  };

  const fetchWeekAllUserLogs = async () => {
    const { data, error } = await supabase.from("logs").select("*").gte("date", weekStart);
    if (!error) setWeekAllUserLogs(data);
  };

  const fetchRunningAllUserLogs = async () => {
    const { data, error } = await supabase.from("logs").select("*");
    if (!error) setRunningAllUserLogs(data);
  };

  // ---------------- Metrics ----------------
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

    const totalWorkHours = +(totalWorkMs / 3600000).toFixed(2);
    return { workHours: totalWorkHours, breakMins: totalBreakMins };
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

  // ---------------- Punch In/Out ----------------
  const punchIn = async () => {
    if (!currentUserId) return alert("Please select a user.");
    setLoading(true);
    try {
      const { data: existing, error: exErr } = await supabase
        .from("logs")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("date", today)
        .is("time_out", null);
      if (exErr) throw exErr;
      if (existing.length > 0) {
        alert("There is already an open log entry.");
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
      if (error) throw error;

      await Promise.all([
        fetchTodayUserLogs(),
        fetchTodayAllUserLogs(),
        fetchWeekAllUserLogs(),
        fetchRunningAllUserLogs(),
      ]);
    } catch (err) {
      alert("Punch in failed.");
    } finally {
      setLoading(false);
    }
  };

  const punchOut = async (log) => {
    if (!log || log.time_out) return alert("No valid entry to punch out.");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("logs")
        .update({ time_out: new Date().toISOString() })
        .eq("id", log.id);
      if (error) throw error;

      await Promise.all([
        fetchTodayUserLogs(),
        fetchTodayAllUserLogs(),
        fetchWeekAllUserLogs(),
        fetchRunningAllUserLogs(),
      ]);
    } catch (err) {
      alert("Punch out failed.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Exchange Rate ----------------
  const fetchExchangeRate = async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/AUD");
      const data = await res.json();
      if (data?.rates?.PHP) {
        setAudToPhp(data.rates.PHP.toFixed(2));
        setExchangeError("");
      } else {
        setExchangeError("Unable to get current exchange rate.");
      }
    } catch (err) {
      setExchangeError("Failed to fetch exchange rate.");
      console.error("Exchange rate error:", err);
    }
  };

  // ---------------- JSX ----------------
  return (
    <div className="admin-container">
      <h1 className="admin-title">Projecters Time Management Dashboard</h1>

      {/* Dropdown */}
      <div className="dropdown-container" ref={dropdownRef}>
        <button className="btn-primary futuristic-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <FaBars className="icon-left" />
          Actions
        </button>
        {dropdownOpen && (
          <ul className="dropdown-menu">
            <li onClick={() => { toRegister(); setDropdownOpen(false); }}><FaUserPlus className="icon-left" />Register New User</li>
            <li onClick={() => { toUserDashboard(); setDropdownOpen(false); }}><FaChartLine className="icon-left" />Users Dashboard</li>
            <li onClick={() => { toDashboard(); setDropdownOpen(false); }}><FaClock className="icon-left" />View User Logs</li>
          </ul>
        )}
      </div>

      {/* User selection & Punch In */}
      <div className="user-selection">
        <label htmlFor="admin-user-select">Select User:</label>
        <select
          id="admin-user-select"
          value={currentUserId}
          onChange={(e) => setCurrentUserId(e.target.value)}
          className="input-select"
        >
          <option value="">-- Please select a user --</option>
          {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
        </select>

        <button
          className="btn-secondary futuristic-btn"
          onClick={punchIn}
          disabled={!currentUserId || loading}
        >
          <FaClock className="icon-left" />
          Punch In
        </button>

        <label className="remember-user">
          <input type="checkbox" checked={rememberUser} onChange={() => setRememberUser(!rememberUser)} />
          Remember my user
        </label>
      </div>

      {/* Today's User Logs */}
      <div className="logs-section">
        <h4>User Logs for {today}</h4>
        {todayUserLogs.length === 0 ? (
          <p className="empty-row">No log entries for the selected user today.</p>
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
                      <button className="btn-sm btn-danger" onClick={() => punchOut(log)} disabled={loading}>
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

{/* ---------------- Exchange Rate + Performance Metrics ---------------- */}
<div className="metrics-container">
  {/* Exchange Rate */}
  <div className="exchange-card">
    <h3>AUD → PHP Exchange Rate</h3>

    {exchangeError ? (
      <p style={{ color: "red" }}>{exchangeError}</p>
    ) : audToPhp ? (
      <h1 style={{ margin: 0 }}>₱{audToPhp}</h1>
    ) : (
      <p>Loading...</p>
    )}

    <button
      onClick={fetchExchangeRate}
      className="btn-primary admin-btn refresh-btn"
    >
      Refresh Rate
    </button>
    <p className="small-text">Auto-updates every 10 min</p>
  </div>

  {/* Performance Metrics */}
  <div className="performance-card">
    <h2 className="performance-title">Performance Metrics</h2>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <defs>
          <linearGradient id="colorWork" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4e73df" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#1cc88a" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="colorBreak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1cc88a" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#4e73df" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="category" stroke="#555" />
        <YAxis stroke="#555" />
        <Tooltip contentStyle={{ backgroundColor: "#f9f9f9" }} />
        <Legend />
        <Bar dataKey="Work" fill="url(#colorWork)" />
        <Bar dataKey="Break" fill="url(#colorBreak)" />
      </BarChart>
    </ResponsiveContainer>
      </div>
     </div>
    </div>
  );
}
