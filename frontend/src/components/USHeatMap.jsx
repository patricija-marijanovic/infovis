import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useNavigate } from "react-router-dom";
import usStates from "../data/us-states-5m.json";

const USHeatMap = ({ data, type, onStateClick, selectedStatesIds }) => {
  const svgRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (!data || data.length === 0) return;

    d3.select(svgRef.current).selectAll("*").remove();
    d3.selectAll(".heatmap-tooltip").remove();

    const width = 600;   // može se prilagoditi
    const height = 550;  // dovoljno visoko za SAD kartu

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const projection = d3.geoAlbersUsa().fitSize([width, height], usStates);
    const path = d3.geoPath().projection(projection);

    const valueAccessor = d => (type === "difference" ? d.difference : d.percentage);

    let colorScale;
    if (type === "difference") {
        const absMax = d3.max(data, d => Math.abs(d.difference));
        colorScale = d3.scaleDiverging()
            .domain([-absMax, 0, absMax])
            .interpolator(t => d3.interpolateRdBu(1 - t))
    } else {
    colorScale = d3.scaleSequential()
        .domain([0, d3.max(data, valueAccessor)])
        .interpolator(d3.interpolateBlues);
    }

    const tooltip = d3.select("body").append("div").attr("class", "heatmap-tooltip");

    svg.append("g")
      .selectAll("path")
      .data(usStates.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("stroke", "#333")
      .attr("stroke-width", d => {
        const stateNum = parseInt(d.properties.STATE, 10);
        return selectedStatesIds.includes(stateNum) ? 4 : 1;
      })
      .attr("fill", d => {
        const stateNum = parseInt(d.properties.STATE, 10);
        const stateData = data.find(s => s.state === stateNum);
        return stateData ? colorScale(valueAccessor(stateData)) : "#eee";
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        const stateNum = parseInt(d.properties.STATE, 10);
        const stateData = data.find(s => s.state === stateNum);
        if (stateData) {
          onStateClick(stateData);
        }
      })
      .on("dblclick", (event, d) => {
        event.stopPropagation();
        const stateNum = parseInt(d.properties.STATE, 10);
        navigate(`/state/${stateNum}`);
      })
      .on("mouseover", (event, d) => {
        const stateNum = parseInt(d.properties.STATE, 10);
        const stateData = data.find(s => s.state === stateNum);
        if (stateData) {
            let tooltipContent = `<strong>${stateData.state_name}</strong><br>`;

        if (type === "difference") {
        const diff = stateData.difference;
        const sign = diff >= 0 ? '+' : '';
        const color = diff >= 0 ? 'red' : 'blue';
        tooltipContent += `
            State: <strong>${stateData.percentage.toFixed(1)}%</strong><br>
            National avg: <strong>${stateData.national_avg.toFixed(1)}%</strong><br>
            <span style="color: ${color}; font-weight: bold;">
            Δ: ${sign}${Math.abs(diff).toFixed(1)}%
            </span><br>
            <em style="font-size: 0.9em; color: #aaa;">
            ${diff >= 0 ? 'Above' : 'Below'} national average
            </em>
        `;
        } else {
        tooltipContent += `
            Alcohol crashes: ${stateData.alcohol_accidents.toLocaleString()}<br>
            Total crashes: ${stateData.total_accidents.toLocaleString()}<br>
            Percentage: <strong>${stateData.percentage.toFixed(1)}%</strong>
        `;
        }

        tooltip.style("opacity", 1).html(tooltipContent);
    }

    const isSelected = selectedStatesIds.includes(stateNum);
    d3.select(event.currentTarget)
        .attr("stroke-width", isSelected ? 6 : 3);
    })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseout", (event, d) => {
        tooltip.style("opacity", 0);
        const stateNum = parseInt(d.properties.STATE, 10);
        const isSelected = selectedStatesIds.includes(stateNum);
        d3.select(event.currentTarget)
          .attr("stroke-width", isSelected ? 4 : 1);
      });

    return () => {
      tooltip.remove();
    };

  }, [data, type, selectedStatesIds, navigate, onStateClick]);

  return <svg ref={svgRef}></svg>;
};

export default USHeatMap;