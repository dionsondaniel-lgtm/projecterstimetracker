import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./Dashboard.css";
import "./AdminDashboard.css";

export default function EditTaskModal({
  isOpen,
  onClose,
  task,
  onSave,
  maxHours = 8,
}) {
  const [taskDesc, setTaskDesc] = useState("");
  const [hours, setHours] = useState("");
  const [hoursUsed, setHoursUsed] = useState(0);
  const [taskDate, setTaskDate] = useState("");
  const [taskUser, setTaskUser] = useState({ id: null, name: "User" });

  useEffect(() => {
    if (!task) return;

    // Set basic task info
    setTaskDesc(task.task_done || "");
    setHours(task.hours_worked?.toString() || "");
    setTaskDate(task.date || "");

    // Always set user from task.userObj, fallback to default
    setTaskUser(task.userObj || { id: null, name: "User" });

    // Fetch total hours for this date excluding current task
    if (task.date) fetchDateHours(task.date, task.id);
  }, [task]); // ✅ run whenever `task` changes

  // Fetch total hours for the date excluding this task
  const fetchDateHours = async (date, excludeTaskId) => {
    try {
      const { data, error } = await supabase
        .from("logs")
        .select("hours_worked")
        .eq("date", date)
        .neq("id", excludeTaskId);

      if (!error && data) {
        const total = data.reduce((sum, entry) => sum + Number(entry.hours_worked), 0);
        setHoursUsed(total);
      }
    } catch (err) {
      console.error("Error fetching hours:", err);
    }
  };

  if (!isOpen) return null;

  const hoursNum = Number(hours);
  const totalToday = hoursUsed + (hoursNum || 0);

  const formattedDate = taskDate
    ? new Date(taskDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const handleSave = async () => {
    if (!taskDesc.trim()) return alert("Task description is required.");
    if (!hours || isNaN(hoursNum) || hoursNum <= 0)
      return alert("Enter a valid positive number for hours.");

    if (totalToday > maxHours) {
      if (!window.confirm(`This edit will exceed the daily limit of ${maxHours} hours. Continue?`))
        return;
    }

    try {
      await onSave({ ...task, task_done: taskDesc, hours_worked: hoursNum });
      onClose();
    } catch (err) {
      console.error("EditTaskModal save error:", err);
      alert("Error updating task");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Edit Task</h2>

        <div style={{ marginBottom: "8px", color: "#555" }}>
          <div>User: {taskUser.name}</div>
          {formattedDate && <div>Date: {formattedDate}</div>}
        </div>

        <div className="battery-container" style={{ marginBottom: "12px" }}>
          <div className="battery-label">
            Hours used: {totalToday.toFixed(2)} / {maxHours}
          </div>
          <div
            className="battery-bar"
            style={{
              height: "12px",
              width: "100%",
              background: "#ddd",
              borderRadius: "6px",
            }}
          >
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
                height: "100%",
                borderRadius: "6px",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        <label>Task Description:</label>
        <textarea
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
          rows={5}
          style={{ width: "100%", fontSize: "1rem", padding: "8px", marginBottom: "12px" }}
        />

        <label>Hours Worked:</label>
        <input
          type="number"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          min="0"
          step="0.1"
          style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
        />

        <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between" }}>
          <button className="btn-primary" onClick={handleSave}>Save</button>
          <button className="btn-danger" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
