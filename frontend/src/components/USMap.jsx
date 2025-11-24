import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import usTopoJson from "../data/us-states.json"; // tvoj TopoJSON

const USMap = () => {
  const svgRef = useRef(null);
  const [states, setStates] = useState([]);

  useEffect(() => {
    // Pretvori TopoJSON u GeoJSON
    const geoData = feature(usTopoJson, usTopoJson.objects.states).features;

    // Filtriraj Aljasku i Havaje
    const continentalStates = geoData.filter(
      d => !["Alaska", "Hawaii"].includes(d.properties.name)
    );
    setStates(continentalStates);

    // Dimenzije SVG-a
    const width = 800;
    const height = 500;

    // Projekcija za kontinentalni SAD
    const projection = d3.geoAlbers().scale(1000).translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Izbriši prethodne putanje
    svg.selectAll("*").remove();

    // Nacrtaj države
    svg.selectAll("path")
      .data(continentalStates)
      .join("path")
      .attr("d", pathGenerator)
      .attr("fill", "lightgreen")
      .attr("stroke", "white");

  }, []);

  return <svg ref={svgRef}></svg>;
};

export default USMap;
