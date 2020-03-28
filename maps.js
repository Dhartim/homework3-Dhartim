let drawMapChart = function(data)
{
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
  // setup projection
  window.projection = d3.geoConicEqualArea();
  projection.parallels([37.692514, 37.840699]);
  projection.rotate([122, 0]);

  const urls = {
    basemap: "https://data.sfgov.org/resource/keex-zmn4.geojson",
    streets: "https://data.sfgov.org/resource/hn5x-7sr8.geojson?$limit=8000",
    cases: "mapCases.csv"

  };
  // setup path generator (note it is a GEO path, not a normal path)
  window.path = d3.geoPath().projection(projection);
  d3.json(urls.basemap).then(function(json) {
    // makes sure to adjust projection to fit all of our regions
    projection.fitSize([960, 600], json);
    // draw the land and neighborhood outlines
    drawBasemap(json);
    // now that projection has been set trigger loading the other files
    // note that the actual order these files are loaded may differ
    d3.json(urls.streets).then(drawStreets);
    //draw data in map
    d3.csv(urls.cases).then(drawData);
  });
};

function drawBasemap(json)
{
    console.log("basemap", json);

    const basemap = g.basemap.selectAll("path.land")
      .data(json.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", "land");

    const outline = g.outline.selectAll("path.neighborhood")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "neighborhood")
        .each(function(d) {
          // save selection in data for interactivity
          // saves search time finding the right outline later
          d.properties.outline = this;
        });
}

function drawStreets(json)
{
  console.log("streets", json);

  // only show  streets
  const streets = json.features.filter(function(d) {
    	return d;
  });
  
  g.streets.selectAll("path.street")
    .data(streets)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "street");
}

function drawData(csv)
{
  let color = d3.scaleOrdinal(d3.schemeTableau10);
  console.log("data" ,csv);
  csv.forEach(function(d) {
    const latitude = parseFloat(d.Latitude);
    const longitude = parseFloat(d.Longitude);
    const pixels = projection([longitude, latitude]);
    d.x = pixels[0];
    d.y = pixels[1];
  });

  const symbols = g.cases.selectAll("circle")
    .data(csv)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 5)
    .attr("class", "symbol")
    .style('fill', d => color(d['Request Type']));;
}
