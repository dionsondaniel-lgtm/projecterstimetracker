import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./Dashboard.css";
import "./AdminDashboard.css";

export default function SpecificTaskModal({
  isOpen,
  onClose,
  onSave,
  existingEntries = [],
  selectedDate: initialDate,
  maxHours = 8,
  userId,
  fullName = "User" // Greeting name
}) {
  const [task, setTask] = useState("");
  const [hours, setHours] = useState("");
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hoursUsed, setHoursUsed] = useState(0);

  // Format date into something readable: January 25, 2025
  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  useEffect(() => {
    if (isOpen) {
      setEntries([...existingEntries]);
      setTask("");
      setHours("");
      setSelectedDate(initialDate);
      fetchDateHours(initialDate);
    }
  }, [isOpen, initialDate]);

  const fetchDateHours = async (date) => {
    const { data, error } = await supabase
      .from("logs")
      .select("hours_worked")
      .eq("date", date);

    if (!error) {
      const total = data.reduce((sum, e) => sum + Number(e.hours_worked), 0);
      setHoursUsed(total);
    }
  };

  const totalToday =
    Number(entries.reduce((sum, e) => sum + Number(e.hours_worked), 0)) +
    hoursUsed;

  const addEntry = () => {
    if (!task.trim()) return alert("Task is required.");
    if (!hours || isNaN(hours)) return alert("Enter valid hours.");

    const hoursNum = Number(hours);
    if (hoursNum <= 0) return alert("Hours must be positive.");

    const newTotal = totalToday + hoursNum;

    // Updated warning message with selected date
    if (newTotal > maxHours) {
      if (
        !window.confirm(
          `You are exceeding the limit for ${formattedSelectedDate}. Continue?`
        )
      ) {
        return;
      }
    }

    setEntries([...entries, { task_done: task, hours_worked: hoursNum }]);
    setTask("");
    setHours("");
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">

        {/* Greeting */}
        <h2 style={{ marginBottom: "5px" }}>
          Hi <strong>{fullName}</strong>!
        </h2>

        <h3 style={{ marginTop: "0", marginBottom: "20px", color: "#555" }}>
          Select a date and add a task(s)
        </h3>

        {/* ENABLED DATE PICKER */}
        <div className="modal-input-group">
          <label>Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              fetchDateHours(e.target.value);
            }}
          />
        </div>

        {/* Battery */}
        <div className="battery-container">
          <div className="battery-label">
            Hours used: {totalToday.toFixed(2)} / {maxHours}
          </div>
          <div className="battery-bar">
            <div
              className="battery-fill"
              style={{
                width: `${(totalToday / maxHours) * 100}%`,
                background:
                  totalToday > maxHours
                    ? "#ff4444"
                    : totalToday > 6
                    ? "#ffa500"
                    : "#4caf50",
              }}
            />
          </div>
        </div>

        {/* Task input */}
        <div className="modal-input-group">
          <label>Task Done</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what you worked on"
          />
        </div>

        <div className="modal-input-group">
          <label>Hours Worked</label>
          <input
            type="number"
            step="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 1.5"
          />
        </div>

        <button className="btn-primary" onClick={addEntry}>
          ➕ Add Entry
        </button>

        <h3 style={{ marginTop: 20 }}>Entries to Save</h3>

        <table className="summary-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => (
              <tr key={idx}>
                <td>{e.task_done}</td>
                <td>{e.hours_worked}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Save / Cancel */}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            ✖ Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => onSave(entries, selectedDate)}
            disabled={entries.length === 0}
          >
            ✅ Save All
          </button>
        </div>

      </div>
    </div>
  );
}
