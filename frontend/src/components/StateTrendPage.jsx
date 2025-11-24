import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import NationalTrendChart from "./NationalTrendChart";
import FilteredTrendChart from "./FilteredTrendChart";
import RiskProfileSection from "./RiskProfileSection";

// Inline CSS za spinner animaciju
const spinnerStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

function MonthlyBarChart({ data, year, isFiltered = false }) {
  const monthOrder = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const shortLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const values = monthOrder.map(month => data[month] || 0);
  const max = Math.max(...values, 1);
  const maxBarHeight = 140;

  return (
    <div>
      <h3>{isFiltered ? `Filtered Fatalities by Month (${year})` : `Fatalities by Month (${year})`}</h3>
      <div style={{ 
        display: "flex", 
        height: "160px", 
        gap: "4px", 
        alignItems: "flex-end",
        padding: "0 4px"
      }}>
        {values.map((v, i) => {
          const barHeight = max > 0 ? (v / max) * maxBarHeight : 0;
          return (
            <div key={i} style={{ 
              flex: 1, 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center" 
            }}>
              <div style={{
                width: "100%",
                backgroundColor: "#3b82f6",
                height: `${Math.max(2, barHeight)}px`,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                paddingBottom: "2px",
                borderRadius: "2px 2px 0 0"
              }}>
                {v > 0 && <span style={{ color: "white", fontSize: "10px", fontWeight: "bold" }}>{v}</span>}
              </div>
              <span style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>{shortLabels[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StateTrendPage() {
  const { stateId } = useParams();
  const navigate = useNavigate();
  const id = parseInt(stateId, 10);

  const [stateData, setStateData] = useState(null);
  const [nationalData, setNationalData] = useState([]);
  const [riskProfile, setRiskProfile] = useState(null);
  const [filters, setFilters] = useState({ minAge: "", maxAge: "", sex: "" });
  const [selectedYear, setSelectedYear] = useState(null);
  const [filteredTrendData, setFilteredTrendData] = useState(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [isLoadingFilteredTrend, setIsLoadingFilteredTrend] = useState(false);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false); // ✅ novo stanje

  useEffect(() => {
    Promise.all([
      fetch(`http://127.0.0.1:8000/api/state_trend/${id}`).then(r => r.json()),
      fetch(`http://127.0.0.1:8000/api/national_trend`).then(r => r.json())
    ]).then(([state, nat]) => {
      setStateData(state);
      setNationalData(nat.data);
      if (state.data && state.data.length > 0) {
        const latest = Math.max(...state.data.map(d => d.YEAR));
        setSelectedYear(latest);
      }
    });
  }, [id]);

  const loadRisk = () => {
    if (selectedYear === null) return;
    setIsLoadingRisk(true);
    const p = new URLSearchParams();
    if (filters.minAge) p.append("min_age", filters.minAge);
    if (filters.maxAge) p.append("max_age", filters.maxAge);
    if (filters.sex) p.append("sex", filters.sex);
    const url = `http://127.0.0.1:8000/api/state_risk_profile/${id}/${selectedYear}${p.toString() ? "?" + p : ""}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setRiskProfile(data);
        setIsLoadingRisk(false);
      })
      .catch(() => {
        setRiskProfile(null);
        setIsLoadingRisk(false);
      });
  };

  const loadFilteredTrend = () => {
    // Ako nema filtera, ne učitavaj ništa
    if (!filters.minAge && !filters.maxAge && !filters.sex) {
      setFilteredTrendData(null);
      setIsLoadingFilteredTrend(false);
      return;
    }

    setIsLoadingFilteredTrend(true);
    const p = new URLSearchParams();
    if (filters.minAge) p.append("min_age", filters.minAge);
    if (filters.maxAge) p.append("max_age", filters.maxAge);
    if (filters.sex) p.append("sex", filters.sex);

    fetch(`http://127.0.0.1:8000/api/state_trend_filtered/${id}${p.toString() ? "?" + p : ""}`)
      .then(r => r.json())
      .then(data => {
        setFilteredTrendData(data);
        setIsLoadingFilteredTrend(false);
      })
      .catch(err => {
        console.error("Error loading filtered trend:", err);
        setFilteredTrendData(null);
        setIsLoadingFilteredTrend(false);
      });
  };

  // ✅ Učitaj risk profile kad god se promijeni godina ILI ID
  useEffect(() => {
    if (selectedYear !== null) {
      loadRisk();
    }
  }, [id, selectedYear]);

  // ✅ Gumb "Apply" pokreće i risk i trend
  const handleApplyFilters = () => {
    setHasAppliedFilters(true);
    loadRisk();
    loadFilteredTrend();
  };

  // ✅ Gumb "Clear" resetira sve
  const handleClearFilters = () => {
    setFilters({ minAge: "", maxAge: "", sex: "" });
    setFilteredTrendData(null);
    setRiskProfile(null);
    setHasAppliedFilters(false);
  };

  if (!stateData || selectedYear === null) return <div style={{ padding: "20px" }}>Loading state data...</div>;

  const selectedYearData = stateData.data.find(d => d.YEAR === selectedYear) || {};
  const totalCrashesSelected = selectedYearData.total_accidents || "–";
  const alcoholCrashesSelected = selectedYearData.alcohol_accidents || "–";
  const alcoholShareSelected = selectedYearData.percentage !== undefined 
    ? `${selectedYearData.percentage.toFixed(1)}%` 
    : "–";

  const totalAlcoholAllYears = stateData.data.reduce((sum, d) => sum + (d.alcohol_accidents || 0), 0);
  const totalCrashesAllYears = stateData.data.reduce((sum, d) => sum + (d.total_accidents || 0), 0);

  const availableYears = [...new Set(stateData.data.map(d => d.YEAR))].sort((a, b) => b - a);
  const hasActiveFilters = filters.minAge || filters.maxAge || filters.sex;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <style>{spinnerStyles}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{stateData.state_name}</h1>
        <button onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div style={{ margin: "16px 0" }}>
        <label>
          <strong>Select Year:</strong>{" "}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            style={{ padding: "6px", fontSize: "14px", marginLeft: "8px" }}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: "16px", marginTop: "20px", flexWrap: "wrap" }}>
        <div style={{ border: "1px solid #ccc", padding: "12px", borderRadius: "4px", minWidth: "220px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#555" }}>2010–2023 (Total)</p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}>
            <strong>Alcohol:</strong> {totalAlcoholAllYears.toLocaleString()}
          </p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}>
            <strong>All Crashes:</strong> {totalCrashesAllYears.toLocaleString()}
          </p>
        </div>

        <div style={{ border: "1px solid #3b82f6", padding: "12px", borderRadius: "4px", backgroundColor: "#f0f9ff", minWidth: "220px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#1d4ed8", fontWeight: "bold" }}>
            {selectedYear} (Selected Year)
          </p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}>
            <strong>Alcohol:</strong> {alcoholCrashesSelected !== "–" ? alcoholCrashesSelected.toLocaleString() : "–"}
          </p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}>
            <strong>All Crashes:</strong> {totalCrashesSelected !== "–" ? totalCrashesSelected.toLocaleString() : "–"}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#1e40af", fontWeight: "bold" }}>
            Alcohol Share: {alcoholShareSelected}
          </p>
        </div>

        <div style={{ border: "1px solid #9ca3af", padding: "12px", borderRadius: "4px", minWidth: "200px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#4b5563" }}>
            {selectedYear} ({hasActiveFilters && hasAppliedFilters ? "Filtered" : "No filters"})
          </p>
          {isLoadingRisk ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40px" }}>
              <span style={{ fontSize: "14px", color: "#666", marginRight: "8px" }}>Loading...</span>
              <div style={{
                width: "16px",
                height: "16px",
                border: "2px solid #e5e7eb",
                borderTop: "2px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
            </div>
          ) : (
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              Alcohol Fatalities:{" "}
              <strong>
                {riskProfile?.total_alcohol_fatalities !== undefined
                  ? riskProfile.total_alcohol_fatalities.toLocaleString()
                  : "–"}
              </strong>
            </p>
          )}
          {hasActiveFilters && hasAppliedFilters && !isLoadingRisk ? (
            <p style={{ fontSize: "12px", color: "#1e40af", marginTop: "6px", fontWeight: "bold" }}>
              Based on applied filters
            </p>
          ) : (!hasActiveFilters || !hasAppliedFilters) && !isLoadingRisk ? (
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
              No demographic filters
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: "20px", padding: "16px", border: "1px solid #eee", borderRadius: "4px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <label>Min Age</label>
            <input type="number" value={filters.minAge} onChange={e => setFilters({...filters, minAge: e.target.value})} />
          </div>
          <div>
            <label>Max Age</label>
            <input type="number" value={filters.maxAge} onChange={e => setFilters({...filters, maxAge: e.target.value})} />
          </div>
          <div>
            <label>Sex</label>
            <select value={filters.sex} onChange={e => setFilters({...filters, sex: e.target.value})}>
              <option value="">All</option>
              <option value="1">Male</option>
              <option value="2">Female</option>
            </select>
          </div>
          <button onClick={handleApplyFilters}>Apply</button>
          <button onClick={handleClearFilters}>Clear</button>
        </div>
      </div>

      {/* ✅ DVA GRAFIKONA — filtrirani se učitava SAMO nakon Apply */}
      <div style={{ display: "flex", gap: "24px", marginTop: "24px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px" }}>
          <h3>Trend Over Time (All Persons)</h3>
          <NationalTrendChart nationalData={nationalData} statesData={[stateData]} />
        </div>
        <div style={{ flex: 1, minWidth: "300px" }}>
          {isLoadingFilteredTrend ? (
            <div style={{ height: "350px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#1d4ed8", fontSize: "16px" }}>
              Updating filtered trend...
              <div style={{
                width: "24px",
                height: "24px",
                border: "3px solid #e5e7eb",
                borderTop: "3px solid #3b82f6",
                borderRadius: "50%",
                marginTop: "12px",
                animation: "spin 1s linear infinite"
              }} />
            </div>
          ) : hasAppliedFilters && filteredTrendData ? (
            <>
              <h3>Trend Over Time (Filtered Group)</h3>
              <FilteredTrendChart
                filteredData={filteredTrendData.data}
                stateName={stateData.state_name}
                nationalData={null}
              />
            </>
          ) : (
            <div style={{ height: "350px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
              Apply filters to see trend for selected group
            </div>
          )}
        </div>
      </div>

      {/* ✅ MJESEČNI GRAF — prikazuje se samo ako je risk učitan */}
      <div style={{ marginTop: "24px" }}>
        {isLoadingRisk ? (
          <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
            Loading monthly data...
          </div>
        ) : riskProfile?.by_month ? (
          <MonthlyBarChart 
            data={riskProfile.by_month} 
            year={selectedYear} 
            isFiltered={hasActiveFilters && hasAppliedFilters} 
          />
        ) : (
          <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
            No monthly data available
          </div>
        )}
      </div>

      {/* ✅ RISK PROFILE */}
      <div style={{ marginTop: "24px" }}>
        {isLoadingRisk ? (
          <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
            Loading risk profile...
          </div>
        ) : riskProfile ? (
          <RiskProfileSection 
            data={riskProfile} 
            title={`Who is at Most Risk? (${selectedYear})${hasActiveFilters && hasAppliedFilters ? ' — Based on Applied Filters' : ''}`} 
          />
        ) : (
          <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
            No risk profile data available
          </div>
        )}
      </div>
    </div>
  );
}