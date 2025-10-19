// src/components/AdminDashboard.js

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import { FaBars } from "react-icons/fa";
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

export default function AdminDashboard({ toRegister, toDashboard, toUserDashboard }) {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [rememberUser, setRememberUser] = useState(false);
  const [todayUserLogs, setTodayUserLogs] = useState([]);
  const [todayAllUserLogs, setTodayAllUserLogs] = useState([]);
  const [weekAllUserLogs, setWeekAllUserLogs] = useState([]);
  const [runningAllUserLogs, setRunningAllUserLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
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

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchTodayUserLogs();
    } else {
      setTodayUserLogs([]);
    }

    if (rememberUser) {
      localStorage.setItem("rememberedUserId", currentUserId);
    } else {
      localStorage.removeItem("rememberedUserId");
    }
  }, [currentUserId, rememberUser]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("*");
    if (!error) setUsers(data);
    else console.error("fetchUsers error:", error);
  };

  const fetchTodayUserLogs = async () => {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", currentUserId)
      .eq("date", today);
    if (!error) setTodayUserLogs(data);
    else console.error("fetchTodayUserLogs error:", error);
  };

  const fetchTodayAllUserLogs = async () => {
    const { data, error } = await supabase.from("logs").select("*").eq("date", today);
    if (!error) setTodayAllUserLogs(data);
    else console.error("fetchTodayAllUserLogs error:", error);
  };

  const fetchWeekAllUserLogs = async () => {
    const { data, error } = await supabase.from("logs").select("*").gte("date", weekStart);
    if (!error) setWeekAllUserLogs(data);
    else console.error("fetchWeekAllUserLogs error:", error);
  };

  const fetchRunningAllUserLogs = async () => {
    const { data, error } = await supabase.from("logs").select("*");
    if (!error) setRunningAllUserLogs(data);
    else console.error("fetchRunningAllUserLogs error:", error);
  };

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
    { category: "User Today", Work: userTodayMetrics.workHours, Break: userTodayMetrics.breakMins },
    { category: "All Users Today", Work: allTodayMetrics.workHours, Break: allTodayMetrics.breakMins },
    { category: "This Week", Work: weekMetrics.workHours, Break: weekMetrics.breakMins },
    { category: "Total", Work: runningMetrics.workHours, Break: runningMetrics.breakMins },
  ];

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
      await fetchTodayUserLogs();
    } catch (err) {
      console.error("punchIn error:", err);
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
      await fetchTodayUserLogs();
    } catch (err) {
      console.error("punchOut error:", err);
      alert("Punch out failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container futuristic-admin-container">
      <h1 className="admin-title futuristic-admin-title">Projecters Time Management Dashboard</h1>

	{/* Dropdown for navigation */}
	<div className="dropdown-container" ref={dropdownRef} style={{ position: "relative", marginBottom: 30 }}>
	  <button
	    className="btn-primary admin-btn futuristic-btn"
	    onClick={() => setDropdownOpen(!dropdownOpen)}
	    aria-haspopup="true"
	    aria-expanded={dropdownOpen}
	  >
	    <FaBars size={18} style={{ marginRight: 8 }} />
	    Actions
	  </button>
	  {dropdownOpen && (
	    <ul
	      className="dropdown-menu"
	      style={{
	        position: "absolute",
	        top: "100%",
	        left: 0,
	        backgroundColor: "#fff",
	        borderRadius: "8px",
	        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
	        listStyle: "none",
	        padding: "10px 0",
	        margin: 0,
	        width: "200px",
	        zIndex: 10,
	      }}
	    >
	      <li
	        style={{
	          padding: "10px 20px",
	          cursor: "pointer",
	          color: "#1976d2",
	          fontWeight: "600",
	          borderBottom: "1px solid #eee",
	        }}
	        onClick={() => {
	          toRegister();
	          setDropdownOpen(false);
	        }}
	        tabIndex={0}
	      >
	        Register New User
	      </li>
	      <li
	        style={{
	          padding: "10px 20px",
	          cursor: "pointer",
	          color: "#1976d2",
	          fontWeight: "600",
	          borderBottom: "1px solid #eee",
	        }}
	        onClick={() => {
	          toUserDashboard();
	          setDropdownOpen(false);
	        }}
	        tabIndex={0}
	      >
	        Users Dashboard
	      </li>
	      <li
	        style={{
	          padding: "10px 20px",
	          cursor: "pointer",
	          color: "#1976d2",
	          fontWeight: "600",
	        }}
	        onClick={() => {
	          toDashboard();
	          setDropdownOpen(false);
	        }}
	        tabIndex={0}
	      >
	        View User Logs
	      </li>
	    </ul>
	  )}
	</div>

      {/* User selection */}
      <div style={{ margin: "30px 0", width: "100%", maxWidth: "600px", textAlign: "center" }}>
        <label htmlFor="admin-user-select" style={{ fontWeight: "bold" }}>
          Select User:
        </label>
        <select
          id="admin-user-select"
          value={currentUserId}
          onChange={(e) => setCurrentUserId(e.target.value)}
          className="input-select"
          style={{ marginLeft: 10, padding: "6px 12px" }}
        >
          <option value="">-- Please select a user --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <button
          className="btn-secondary admin-btn futuristic-btn"
          onClick={punchIn}
          disabled={!currentUserId || loading}
          style={{ marginLeft: 20, padding: "12px 24px", fontSize: "1rem" }}
        >
          Punch In
        </button>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <label style={{ fontSize: "0.95rem" }}>
            <input
              type="checkbox"
              checked={rememberUser}
              onChange={() => setRememberUser(!rememberUser)}
              style={{ marginRight: 6 }}
            />
            Remember my user
          </label>
        </div>
      </div>

      {/* Today's user logs */}
      <div style={{ width: "100%", maxWidth: "800px", marginBottom: "40px" }}>
        <h4>User Logs for {today}</h4>
        {todayUserLogs.length === 0 ? (
          <p className="empty-row">No log entries for the selected user today.</p>
        ) : (
          <table className="logs-table" style={{ width: "100%" }}>
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
                        onClick={() => punchOut(log)}
                        disabled={loading}
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

      {/* Charts */}
      <div className="charts-grid" style={{ width: "100%", maxWidth: "900px", marginBottom: "60px" }}>
        <h2
          style={{
            width: "100%",
            textAlign: "center",
            marginBottom: "20px",
            color: "#212121",
            fontWeight: "700",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
        >
          Performance Metrics
        </h2>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis label={{ value: "Hours/Minutes", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Work" fill="#4e73df" name="Total Work Hours" />
              <Bar dataKey="Break" fill="#1cc88a" name="Total Break Minutes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
