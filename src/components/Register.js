import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./Register.css";

const DEFAULT_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function Register({ onBack }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // toast message { type: 'success'|'error', message: '' }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      showToast("error", "Failed to fetch users");
      console.error("fetchUsers error:", error);
    } else setUsers(data);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500); // auto hide
  };

  const handleRegister = async () => {
    const { name, email } = newUser;
    if (!name || !email) {
      showToast("error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("users")
      .insert([{ name, email, image_url: DEFAULT_AVATAR_URL }]);

    if (error) {
      console.error("Insert Error:", error);
      showToast("error", "User registration failed");
    } else {
      setNewUser({ name: "", email: "" });
      fetchUsers();
      showToast("success", "User registered successfully");
    }

    setLoading(false);
  };

  const handleDeleteUser = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    const password = prompt("Enter admin password to confirm delete:");
    if (password !== "1234") {
      showToast("error", "Incorrect password. Delete canceled");
      return;
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      showToast("error", "Delete failed");
    } else {
      fetchUsers();
      showToast("success", "User deleted successfully");
    }
  };

  return (
    <div className="register-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <h2 className="register-title">Register a New User</h2>

      <div className="input-row">
        <input
          type="text"
          placeholder="Full Name"
          value={newUser.name}
          onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
          autoComplete="off"
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
          autoComplete="off"
        />
      </div>

      <div className="buttons-row">
        <button className="register-btn" onClick={handleRegister} disabled={loading}>
          {loading ? "⏳ Registering..." : "Register"}
        </button>
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
      </div>

      <h3 style={{ color: "#2b6cb0", marginBottom: 20 }}>Registered Users</h3>
      <ul className="users-list">
        {users.map((u) => (
          <li key={u.id} className="user-item">
            <img
              src={u.image_url || DEFAULT_AVATAR_URL}
              alt={u.name}
              className="profile-pic"
            />
            <div className="user-info">
              <strong>{u.name}</strong>
              <small>{u.email}</small>
            </div>
            <button className="delete-btn" onClick={() => handleDeleteUser(u.id)} title="Delete User">
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
