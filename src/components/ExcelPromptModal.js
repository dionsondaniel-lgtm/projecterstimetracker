import React, { useState } from "react";
import "./Dashboard.css";

export default function ExcelPromptModal({ isOpen, onCancel, onConfirm }) {
  const [moneyFromAlex, setMoneyFromAlex] = useState("");
  const [hourlyRate, setHourlyRate] = useState("32"); // default
  const [exchangeRate, setExchangeRate] = useState("");

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Excel Export Details</h2>

        <div className="modal-input-group">
          <label>Money from Alex</label>
          <input
            type="number"
            value={moneyFromAlex}
            onChange={(e) => setMoneyFromAlex(e.target.value)}
            placeholder="Amount in AUD"
          />
        </div>

        <div className="modal-input-group">
          <label>Hourly Rate (AUD)</label>
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
        </div>

        <div className="modal-input-group">
          <label>Exchange Rate AUD → PHP</label>
          <input
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            placeholder="e.g. 38.5"
          />
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() =>
              onConfirm({
                moneyFromAlex,
                hourlyRate,
                exchangeRate,
              })
            }
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
