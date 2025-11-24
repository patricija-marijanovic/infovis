
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const FilteredTrendChart = ({ filteredData, stateName, nationalData }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!filteredData || filteredData.length === 0) return;

    // Očisti SVG
    d3.select(svgRef.current).selectAll("*").remove();
    d3.selectAll(".filtered-trend-tooltip").remove();

    const width = 350;
    const height = 350;
    const margin = { top: 50, right: 60, bottom: 90, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "filtered-trend-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.85)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Skale
    const xScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.YEAR))
      .range([0, innerWidth]);

    const yMax = d3.max([
      ...filteredData.map(d => d.percentage),
      ...(nationalData?.map(d => d.percentage) || [])
    ]) || 10;

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0]);

    // Osi
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    g.append("g")
      .call(d3.axisLeft(yScale));

    // Oznake osi
    g.append("text")
      .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + 60})`)
      .style("text-anchor", "middle")
      .text("Year");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 16)
      .attr("x", -innerHeight / 2)
      .style("text-anchor", "middle")
      .text("Alcohol-Impaired (%)");

    // Nacionalna linija (ako postoji)
    if (nationalData?.length > 0) {
      const nationalLine = d3.line()
        .x(d => xScale(d.YEAR))
        .y(d => yScale(d.percentage));
      
      g.append("path")
        .datum(nationalData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2")
        .attr("d", nationalLine);
    }

    // Filtrirana linija (state)
    const filteredLine = d3.line()
      .x(d => xScale(d.YEAR))
      .y(d => yScale(d.percentage));

    g.append("path")
      .datum(filteredData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", filteredLine);


    const focusLine = g.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#ccc")
      .attr("stroke-dasharray", "4,2")
      .style("opacity", 0);

    // Interakcija
    const overlay = g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", (event) => {
        const mouseX = d3.pointer(event)[0];
        const year = Math.round(xScale.invert(mouseX));
        const point = filteredData.find(d => d.YEAR === year);
        const natPoint = nationalData?.find(d => d.YEAR === year);

        if (!point) return;

        const xPos = xScale(year);
        focusLine
          .attr("transform", `translate(${xPos},0)`)
          .style("opacity", 1);

        let html = `<div><strong>${stateName} (${year})</strong></div>`;
        html += `<div><strong>Filtered Group</strong><br/>`;
        html += `Total: ${point.total_accidents.toLocaleString()}<br/>`;
        html += `Alcohol: ${point.alcohol_accidents.toLocaleString()}<br/>`;
        html += `Share: ${point.percentage}%</div>`;

        if (natPoint) {
          html += `<div style="margin-top:8px;color:steelblue"><strong>National</strong><br/>`;
          html += `Share: ${natPoint.percentage}%</div>`;
        }

        tooltip
          .html(html)
          .style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseleave", () => {
        focusLine.style("opacity", 0);
        tooltip.style("opacity", 0);
      });

    return () => tooltip.remove();
  }, [filteredData, nationalData, stateName]);

  return <svg ref={svgRef}></svg>;
};

export default FilteredTrendChart;