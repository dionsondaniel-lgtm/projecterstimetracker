import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const DEFAULT_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function Register({ onBack }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("fetchUsers error:", error);
    else setUsers(data);
  };

  const handleRegister = async () => {
    const { name, email } = newUser;
    if (!name || !email) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("users")
      .insert([{ name, email, image_url: DEFAULT_AVATAR_URL }]);

    if (error) {
      console.error("Insert Error:", error);
      alert("User registration failed.");
    } else {
      setNewUser({ name: "", email: "" });
      fetchUsers();
    }

    setLoading(false);
  };

  const handleDeleteUser = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    const password = prompt("Enter admin password to confirm delete:");
    if (password !== "1234") {
      alert("Incorrect password. Delete canceled.");
      return;
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      alert("Delete failed.");
    } else {
      fetchUsers();
    }
  };

  return (
    <div className="register-container">
      <h2 className="register-title">🏆 Register a New User</h2>

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
          {loading ? "⏳ Registering..." : "✅ Register"}
        </button>
        <button className="back-btn" onClick={onBack}>
          🔙 Back
        </button>
      </div>

      <h3 style={{ color: "#2b6cb0", marginBottom: 20 }}>🧑‍💼 Registered Users</h3>
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
