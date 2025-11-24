// src/components/NationalTrendChart.jsx
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const NationalTrendChart = ({ nationalData, statesData }) => {
  const svgRef = useRef();

  useEffect(() => {
    if ((!nationalData || nationalData.length === 0) && (!statesData || statesData.length === 0)) return;

    // Očisti prethodni sadržaj
    d3.select(svgRef.current).selectAll("*").remove();
    d3.selectAll(".trend-tooltip").remove();

    // Dimenzije
    const width = 350;
    const height = 350;
    const margin = { top: 50, right: 60, bottom: 90, left: 70 };

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Kreiraj G grupu — OVO MORA BITI PRIJE SVIH KORIŠTENJA 'g'
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "trend-tooltip")
      .style("position", "absolute")
      .style("background-color", "rgba(0,0,0,0.85)")
      .style("color", "white")
      .style("padding", "10px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-size", "14px")
      .style("line-height", "1.4");

    // Sve godine
    const allYears = [
      ...nationalData.map(d => d.YEAR),
      ...statesData.flatMap(s => s.data?.map(d => d.YEAR) || [])
    ];
    const xDomain = allYears.length > 0
      ? [d3.min(allYears), d3.max(allYears)]
      : [2010, 2023];

    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([0, innerWidth]);

    // Svi postoci
    const allPercentages = [
      ...nationalData.map(d => d.percentage),
      ...statesData.flatMap(s => s.data?.map(d => d.percentage) || [])
    ];
    const yMax = allPercentages.length > 0 ? d3.max(allPercentages) : 10;

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0]);

    // Boje
    const nationalColor = "steelblue";
    const stateColorScale = d3.scaleOrdinal()
      .domain(statesData.map(s => s.state))
      .range(d3.schemeCategory10.slice(1));

    // === OSI ===
    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    g.append("g")
      .call(d3.axisLeft(yScale));

    // Oznaka za X os (dolje)
    g.append("text")
      .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + 60})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#333")
      .text("Year");

    // Oznaka za Y os (lijevo, okomito)
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 16)
      .attr("x", -innerHeight / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#333")
      .text("Alcohol-Impaired Fatalities (%)");

    // === NATIONALNA LINIJA ===
    if (nationalData.length > 0) {
      const nationalLine = d3.line()
        .x(d => xScale(d.YEAR))
        .y(d => yScale(d.percentage));

      g.append("path")
        .datum(nationalData)
        .attr("fill", "none")
        .attr("stroke", nationalColor)
        .attr("stroke-width", 3)
        .attr("d", nationalLine);

      const lastNat = nationalData[nationalData.length - 1];
      g.append("text")
        .attr("x", xScale(lastNat.YEAR) + 6)
        .attr("y", yScale(lastNat.percentage))
        .attr("dy", "0.35em")
        .attr("font-size", "12px")
        .attr("fill", nationalColor)
        .text("National");
    }

    // === STATE LINIJE ===
    statesData.forEach(state => {
      if (!state.data || state.data.length === 0) return;

      const color = stateColorScale(state.state);
      const stateLine = d3.line()
        .x(d => xScale(d.YEAR))
        .y(d => yScale(d.percentage));

      g.append("path")
        .datum(state.data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", stateLine);

      const lastPoint = state.data[state.data.length - 1];
      g.append("text")
        .attr("x", xScale(lastPoint.YEAR) + 6)
        .attr("y", yScale(lastPoint.percentage))
        .attr("dy", "0.35em")
        .attr("font-size", "12px")
        .attr("fill", color)
        .text(state.state_name);
    });

    // === INTERAKCIJA ===
    const focusLine = g.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#ccc")
      .attr("stroke-dasharray", "4,2")
      .style("opacity", 0);

    const overlay = g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        focusLine.style("opacity", 1);
        tooltip.style("opacity", 1);
      })
      .on("mouseout", () => {
        focusLine.style("opacity", 0);
        tooltip.style("opacity", 0);
      })
      .on("mousemove", (event) => {
        const mouseX = d3.pointer(event)[0];
        const x0 = xScale.invert(mouseX);

        const bisect = d3.bisector(d => d.YEAR).left;
        let closestYear;

        if (nationalData.length > 0) {
          const idx = bisect(nationalData, x0, 1);
          const d0 = nationalData[idx - 1];
          const d1 = nationalData[idx];
          closestYear = d1 && (x0 - d0.YEAR > d1.YEAR - x0) ? d1.YEAR : d0.YEAR;
        } else {
          return;
        }

        const xPos = xScale(closestYear);
        focusLine.attr("transform", `translate(${xPos},0)`);

        let tooltipContent = `<div><strong>Year: ${closestYear}</strong></div>`;

        const nat = nationalData.find(d => d.YEAR === closestYear);
        if (nat) {
          tooltipContent += `
            <div style="color: ${nationalColor}; margin-top: 6px;">
              <strong>National</strong><br>
              Total: ${nat.total_accidents.toLocaleString()}<br>
              Alcohol: ${nat.alcohol_accidents.toLocaleString()}<br>
              Percentage: ${nat.percentage}%
            </div>
          `;
        }

        statesData.forEach(state => {
          const point = state.data?.find(d => d.YEAR === closestYear);
          if (point) {
            const color = stateColorScale(state.state);
            tooltipContent += `
              <div style="color: ${color}; margin-top: 6px;">
                <strong>${state.state_name}</strong>: ${point.percentage}%
              </div>
            `;
          }
        });

        tooltip
          .html(tooltipContent)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      });

    // Cleanup
    return () => {
      tooltip.remove();
    };

  }, [nationalData, statesData]);

  return <svg ref={svgRef}></svg>;
};

export default NationalTrendChart;