// src/App.js

import { useState, useEffect } from 'react';
import './App.css';
import NationalTrendChart from './components/NationalTrendChart';
import USHeatMap from './components/USHeatMap';
import RiskProfileSection from './components/RiskProfileSection';
import InfoButton from './components/InfoButton';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StateTrendPage from './components/StateTrendPage';

function App() {
  const [trendData, setTrendData] = useState([]);
  const [heatmapData, setHeatmapData] = useState(null);
  const [riskProfile, setRiskProfile] = useState(null);
  const [year, setYear] = useState(2023);
  const [heatmapType, setHeatmapType] = useState("percentage");
  const [selectedStatesIds, setSelectedStatesIds] = useState([]);
  const [statesData, setStatesData] = useState([]);
  const [loadingStates, setLoadingStates] = useState([]);

  const years = Array.from({ length: 2023 - 2010 + 1 }, (_, i) => 2010 + i);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/national_trend');
        const result = await response.json();
        setTrendData(result.data || []);
      } catch (error) {
        console.error("Error fetching national trend:", error);
      }
    };
    fetchTrendData();
  }, []);

  useEffect(() => {
    setHeatmapData(null);
    const fetchHeatmapData = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/state_heatmap/${year}`);
        const result = await response.json();
        setHeatmapData(result || []);
      } catch (error) {
        console.error("Error fetching heatmap:", error);
      }
    };
    fetchHeatmapData();
  }, [year]);

  useEffect(() => {
    const fetchRiskProfile = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/national_risk_profile/${year}`);
        if (response.ok) {
          const data = await response.json();
          setRiskProfile(data);
        } else {
          setRiskProfile(null);
        }
      } catch (error) {
        console.error("Error fetching risk profile:", error);
        setRiskProfile(null);
      }
    };
    fetchRiskProfile();
  }, [year]);

  const fetchStateTrend = async (stateId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/state_trend/${stateId}`);
      const result = await response.json();
      return { ...result, state: Number(result.state) };
    } catch (error) {
      console.error("Error fetching state trend:", error);
      return null;
    }
  };

  const toggleStateLine = (stateMeta) => {
    const stateId = Number(stateMeta.state);
    if (selectedStatesIds.includes(stateId)) {
      setSelectedStatesIds(prev => prev.filter(id => id !== stateId));
      setStatesData(prev => prev.filter(s => Number(s.state) !== stateId));
    } else {
      setLoadingStates(prev => [...prev, stateId]);
      fetchStateTrend(stateId).then(fullTrend => {
        setLoadingStates(prev => prev.filter(id => id !== stateId));
        if (fullTrend) {
          setSelectedStatesIds(prev => [...prev, stateId]);
          setStatesData(prev => [...prev, fullTrend]);
        } else {
          alert(`Failed to load data for ${stateMeta.state_name}`);
        }
      });
    }
  };

  const stateIdToName = {};
  if (heatmapData) {
    heatmapData.forEach(s => {
      stateIdToName[s.state] = s.state_name;
    });
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              {/* Glavni naslov */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                margin: '12px 0 28px'
              }}>
                <h1>FARS Alcohol-Impaired Fatality Analytics</h1>
                <InfoButton />
              </div>

              {/* Tri-kolonski layout */}
              <div className="flex flex-wrap justify-center" style={{ gap: '24px' }}>
                {/* Lijevo: Trendovi */}
                <div style={{ flex: '0 0 360px', maxWidth: '100%' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h2>National & State Trends</h2>
                    <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', margin: '6px 0' }}>
                      Click any state on the map to add its trend here.
                    </p>
                  </div>
                  <NationalTrendChart
                    key={`trend-${statesData.map(s => s.state).sort().join('-')}`}
                    nationalData={trendData}
                    statesData={statesData}
                  />
                  {loadingStates.length > 0 && (
                    <div style={{
                      marginTop: '10px',
                      color: 'var(--color-warning)',
                      fontSize: '0.9rem',
                      textAlign: 'center'
                    }}>
                      Loading: {loadingStates.map(id => stateIdToName[id] || `State ${id}`).join(', ')}
                    </div>
                  )}
                </div>

                {/* Sredina: Heatmap */}
                <div style={{
                  flex: '1',
                  minWidth: '500px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h2>State Heatmap ({year})</h2>
                    <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', margin: '6px 0' }}>
                      <strong>Click</strong> a state to compare with national trend.<br/>
                      <strong>Double-click</strong> to open its detailed page.
                    </p>
                  </div>

                  <div style={{
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <div>
                      <label style={{ fontWeight: 600, marginRight: '8px' }}>Year:</label>
                      <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, margin: '0 12px' }}>View:</label>
                      <select value={heatmapType} onChange={(e) => setHeatmapType(e.target.value)}>
                        <option value="percentage">Percentage</option>
                        <option value="difference">Difference from Avg</option>
                      </select>
                    </div>
                  </div>

                  {heatmapData ? (
                    <USHeatMap
                      data={heatmapData}
                      type={heatmapType}
                      onStateClick={toggleStateLine}
                      selectedStatesIds={selectedStatesIds}
                    />
                  ) : (
                    <p style={{ color: 'var(--color-text-secondary)' }}>Loading map...</p>
                  )}

                  {heatmapData?.[0] && (
                    <p style={{
                      textAlign: 'center',
                      fontSize: '0.92rem',
                      color: 'var(--color-text-secondary)',
                      fontStyle: 'italic',
                      marginTop: '12px'
                    }}>
                      National avg: <strong>{heatmapData[0].national_avg.toFixed(1)}%</strong>
                    </p>
                  )}
                </div>

                {/* Desno: Risk Profile */}
                <div style={{ flex: '0 0 340px', maxWidth: '100%' }}>
                  {riskProfile && <RiskProfileSection data={riskProfile} />}
                </div>
              </div>
            </div>
          }
        />

        <Route path="/state/:stateId" element={<StateTrendPage />} />
      </Routes>
    </Router>
  );
}

export default App;