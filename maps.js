let drawMapChart = function(data) {
   window.width = 960,
    window.height = 600;

  console.log(data);

  window.svg = d3.select("body").select("svg#map");

  window.g = {
    basemap: svg.select("g#basemap"),
    streets: svg.select("g#streets"),
    outline: svg.select("g#outline"),
    cases: svg.select("g#arrests"),
    tooltip: svg.select("g#tooltip"),
    details: svg.select("g#details")
  };
  // setup tooltip (shows neighborhood name)
  window.tip = g.tooltip.append("text").attr("id", "tooltip");
  tip.attr("text-anchor", "end");
  tip.attr("dx", -5);
  tip.attr("dy", -5);
  tip.style("visibility", "hidden");

  // add details widget
  // https://bl.ocks.org/mbostock/1424037
  window.details = g.details.append("foreignObject").attr("id", "details").attr("width", width).attr("height", height).attr("x", 0).attr("y", 0);
  window.body = details.append("xhtml:body").style("text-align", "left").style("background", "none").html("<p>N/A</p>");

  details.style("visibility", "hidden");
  // setup projection
  window.projection = d3.geoConicEqualArea();
  projection.parallels([37.692514, 37.840699]);
  projection.rotate([122, 0]);

  const urls = {
    //basemap: "https://data.sfgov.org/resource/6ia5-2f8k.geojson",
    basemap: "https://data.sfgov.org/resource/6ia5-2f8k.geojson",
    streets: "https://data.sfgov.org/resource/hn5x-7sr8.geojson?$limit=8000",
    cases: "mapCases.csv"

  };
  // setup path generator (note it is a GEO path, not a normal path)
  window.path = d3.geoPath().projection(projection);
  d3.json(urls.basemap).then(function(json) {
    // makes sure to adjust projection to fit all of our regions
    projection.fitSize([
      960, 600
    ], json);
    // draw the land and neighborhood outlines
    drawBasemap(json);
    // now that projection has been set trigger loading the other files
    // note that the actual order these files are loaded may differ
    d3.json(urls.streets).then(drawStreets);
    //draw data in map
    d3.csv(urls.cases).then(drawData);
  });
};

function drawBasemap(json) {
  console.log("basemap", json);
  const basemap = g.basemap
  .selectAll("path.land")
  .data(json.features)
  .enter()
  .append("path")
  .attr("d", path)
  .attr("class", "land")

  const outline = g.outline.selectAll("path.neighborhood").data(json.features).enter().append("path").attr("d", path).attr("class", "neighborhood").each(function(d) {
    // save selection in data for interactivity
    // saves search time finding the right outline later
    d.properties.outline = this;
  });

  // add highlight
  basemap.on("mouseover.highlight", function(d) {
    d3.select(d.properties.outline).raise();
    d3.select(d.properties.outline).classed("active", true);
  }).on("mouseout.highlight", function(d) {
    d3.select(d.properties.outline).classed("active", false);
  });

  // add tooltip
  basemap.on("mouseover.tooltip", function(d) {
    tip.text(d.properties.name);
    tip.style("visibility", "visible");
  }).on("mousemove.tooltip", function(d) {
    const coords = d3.mouse(g.basemap.node());
    tip.attr("x", coords[0]);
    tip.attr("y", coords[1]);
  }).on("mouseout.tooltip", function(d) {
    tip.style("visibility", "hidden");
  });

}

function drawStreets(json) {
  console.log("streets", json);

  // only show  streets
  const streets = json.features.filter(function(d) {
    return d;
  });

  g.streets.selectAll("path.street").data(streets).enter().append("path").attr("d", path).attr("class", "street");
}

function drawData(csv) {
  let color = d3.scaleOrdinal(d3.schemeTableau10);
  console.log("data", csv);
  csv.forEach(function(d) {
    const latitude = parseFloat(d.Latitude);
    const longitude = parseFloat(d.Longitude);
    const pixels = projection([longitude, latitude]);
    d.x = pixels[0];
    d.y = pixels[1];
  });

  const symbols = g.cases.selectAll("circle").data(csv).enter().append("circle").attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 5).attr("class", "symbol").style('fill', d => color(d['Request Type']));

  //details on demand
  symbols.on("mouseover", function(d) {
    d3.select(this).raise();
    d3.select(this).classed("active", true);

    // use template literal for the detail table
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
    const html = `
      <table border="0" cellspacing="0" cellpadding="2">
      <tbody>
        <tr>
          <th>Neighborhood: </th>
          <td>${d['Neighborhood']}</td>
        </tr>
        <tr>
          <th>Police District: </th>
          <td>${d['Police District']}</td>
        </tr>
        <tr>
          <th>Request Type: </th>
          <td>${d['Request Type']}</td>
        </tr>
        <tr>
          <th>Responsible Agency: </th>
          <td>${d['Responsible Agency']}</td>
        </tr>
        <tr>
          <th>Latitude: </th>
          <td>${d['Latitude']}</td>
        </tr>
        <tr>
          <th>Longitude: </th>
          <td>${d['Longitude']}</td>
        </tr>
      </tbody>
      </table>
    `;

    body.html(html);
    details.style("visibility", "visible");
  });

  symbols.on("mouseout", function(d) {
    d3.select(this).classed("active", false);
    details.style("visibility", "hidden");
  });

  //brushing interactivity
  symbols.on("mouseover.brush1", function(d) {
    symbols.filter(e => (d['Request Type'] !== e['Request Type'])).lower().transition().style("fill", "#ddd");
  });
  symbols.on("mouseout.brush1", function(d) {
    symbols.transition().style("fill", d => color(d['Request Type']));
  });

  //legends
  svg.append("text").attr("class", "text").attr("x", 0).attr("y", 480).text("Request Type");

  const colorLegendG = svg.append('g').attr("transform", "translate(10,500)");

  const colorLegend = d3.legendColor().scale(color).shape('circle').shapePadding(3)
  colorLegendG.call(colorLegend);
  colorLegendG.selectAll('text').attr("class", "text").attr('font-size', "10");
}

function translate(x, y) {
    return "translate(" + String(x) + "," + String(y) + ")";
}
