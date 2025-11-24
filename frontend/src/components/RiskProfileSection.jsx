// src/components/RiskProfileSection.jsx
import React, { useState } from "react";
import { createPortal } from "react-dom";

const RiskProfileSection = ({ data }) => {
  const { year, total_alcohol_fatalities, by_sex, by_age_group, by_time_of_day } = data;

  const malePct = (by_sex.male / total_alcohol_fatalities) * 100;
  const femalePct = (by_sex.female / total_alcohol_fatalities) * 100;
  const nightPct = (by_time_of_day.night / total_alcohol_fatalities) * 100;
  const dayPct = (by_time_of_day.day / total_alcohol_fatalities) * 100;

  const sortedAgeGroups = Object.entries(by_age_group)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const maxCount = Math.max(...Object.values(by_age_group));

  const colorMale = '#4f46e5';
  const colorFemale = '#ec4899';
  const colorNight = '#1e40af';
  const colorDay = '#3b82f6';
  const colorAge = '#0d9488';

  const [tooltip, setTooltip] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const showTooltip = (e, content) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 6,
      content,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const row = { display: "flex", alignItems: "center", marginBottom: "12px", gap: "12px" };
  const barContainer = { flex: 1, height: "12px", background: "#f1f5f9", borderRadius: "6px", cursor: "pointer" };
  const bar = (v, color) => ({ width: `${v}%`, background: color, height: "100%", borderRadius: "6px" });

  return (
    <div style={{
      background: "white",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      padding: "20px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
      height: "530px",
      position: "relative"
    }}>
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
        <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Who Is at Most Risk in {year}?</h3>
        <span
          style={{ cursor: "pointer", fontSize: "1rem", color: "#64748b" }}
          onClick={() => setInfoOpen(!infoOpen)}
        >
          ℹ️
        </span>
      </div>

      {infoOpen && (
        <div style={{
          fontSize: "0.8rem",
          color: "#475569",
          background: "#f8fafc",
          padding: "8px 10px",
          borderRadius: "8px",
          margin: "10px 0 18px"
        }}>
          Percentages show share of total fatalities — categories do not sum to 100%.
        </div>
      )}

      {/* By Sex */}
      <div style={{ marginTop: "18px", fontWeight: 600, color: "#475569" }}>By Sex</div>

      {[
        { label: "Male", icon: "♂", pct: malePct, count: by_sex.male, color: colorMale },
        { label: "Female", icon: "♀", pct: femalePct, count: by_sex.female, color: colorFemale }
      ].map(({ label, icon, pct, count, color }) => (
        <div style={row} key={label}>
          <div style={{ width: "32px", textAlign: "center" }}>{icon}</div>
          <div style={{ width: "80px", fontWeight: 600 }}>{label}</div>
          <div
            style={barContainer}
            onMouseEnter={(e) => showTooltip(e, `${count.toLocaleString()} fatalities • ${pct.toFixed(1)}%`)}
            onMouseLeave={hideTooltip}
          >
            <div style={bar(pct, color)} />
          </div>
          <div style={{ width: "55px", textAlign: "right", fontSize: "0.85rem", color: "#64748b" }}>
            {pct.toFixed(1)}%
          </div>
        </div>
      ))}

      {/* By Time */}
      <div style={{ margin: "18px 0 8px", fontWeight: 600, color: "#475569" }}>By Time of Day</div>

      {[
        { label: "Night", icon: "🌙", pct: nightPct, count: by_time_of_day.night, color: colorNight },
        { label: "Day", icon: "☀️", pct: dayPct, count: by_time_of_day.day, color: colorDay }
      ].map(({ label, icon, pct, count, color }) => (
        <div style={row} key={label}>
          <div style={{ width: "32px", textAlign: "center" }}>{icon}</div>
          <div style={{ width: "80px", fontWeight: 600 }}>{label}</div>
          <div
            style={barContainer}
            onMouseEnter={(e) => showTooltip(e, `${count.toLocaleString()} fatalities • ${pct.toFixed(1)}%`)}
            onMouseLeave={hideTooltip}
          >
            <div style={bar(pct, color)} />
          </div>
          <div style={{ width: "55px", textAlign: "right", fontSize: "0.85rem", color: "#64748b" }}>
            {pct.toFixed(1)}%
          </div>
        </div>
      ))}

      {/* Age Groups */}
      <div style={{ margin: "22px 0 8px", fontWeight: 600, color: "#475569" }}>Top Age Groups</div>

      {sortedAgeGroups.map(([age, count]) => {
        const pct = (count / total_alcohol_fatalities) * 100;
        const width = (count / maxCount) * 100;
        return (
          <div style={row} key={age}>
            <div style={{ width: "80px", fontWeight: 600 }}>{age}</div>
            <div
              style={barContainer}
              onMouseEnter={(e) => showTooltip(e, `${count.toLocaleString()} fatalities • ${pct.toFixed(1)}%`)}
              onMouseLeave={hideTooltip}
            >
              <div style={bar(width, colorAge)} />
            </div>
            <div style={{ width: "55px", textAlign: "right", fontSize: "0.85rem", color: "#64748b" }}>
              {pct.toFixed(1)}%
            </div>
          </div>
        );
      })}

      <p style={{
        textAlign: "center",
        marginTop: "16px",
        fontSize: "0.82rem",
        color: "#94a3b8"
      }}>
        Based on {total_alcohol_fatalities.toLocaleString()} fatalities
      </p>

      {tooltip && createPortal(
        <div style={{
          position: "fixed",
          left: tooltip.x,
          top: tooltip.y,
          transform: "translateX(-50%)",
          background: "black",
          color: "white",
          padding: "6px 10px",
          borderRadius: "6px",
          fontSize: "0.85rem",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 9999
        }}>
          {tooltip.content}
        </div>,
        document.body
      )}
    </div>
  );
};

export default RiskProfileSection;
