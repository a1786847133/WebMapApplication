mapboxgl.accessToken = 'pk.eyJ1IjoianN1MyIsImEiOiJjbWhlZW45ZTcwZGR4Mm1wd2FoNmc1eGx4In0.1uDkRhqn0WIQeUtnhvLPOA';

const mode = document.body.dataset.map; // "rates" or "cases"

// --- common map init ---
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v10',
  center: [-98, 39],   // U.S. view
  zoom: 3.2,
  projection: { name: 'albers' } // required by your deliverable
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

map.on('load', () => {
  if (mode === 'rates') initRatesMap();
  if (mode === 'cases') initCasesMap();
});

// ---------------------------
// Map 1: Choropleth (rates)
// ---------------------------
function initRatesMap() {
  map.addSource('covid-rates', {
    type: 'geojson',
    data: 'assets/us-covid-2020-rates.geojson'
  });

  // You MUST match the property name in your geojson.
  // Common possibilities: "rate", "cases_per_1000", etc.
  const rateField = 'rate';

  // Choose breaks that make sense for your data (edit these after you inspect values)
  const breaks = [0, 10, 25, 50, 75, 100, 150]; // per 1,000 residents (example)
  const colors = [
    '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'
  ];

  const fillColor = [
    'step',
    ['to-number', ['get', rateField]],
    colors[0],
    breaks[1], colors[1],
    breaks[2], colors[2],
    breaks[3], colors[3],
    breaks[4], colors[4],
    breaks[5], colors[5],
    breaks[6], colors[6]
  ];

  map.addLayer({
    id: 'rates-fill',
    type: 'fill',
    source: 'covid-rates',
    paint: {
      'fill-color': fillColor,
      'fill-opacity': 0.78
    }
  });

  map.addLayer({
    id: 'rates-outline',
    type: 'line',
    source: 'covid-rates',
    paint: {
      'line-color': 'rgba(255,255,255,0.15)',
      'line-width': 0.5
    }
  });

  // Interactivity: click county -> popup
  map.on('click', 'rates-fill', (e) => {
    const f = e.features[0];
    const props = f.properties;

    // These field names vary a lot — update after you open geojson once.
    const name = props.county || props.NAME || props.County || 'County';
    const state = props.state || props.STATE || props.State || '';
    const rateVal = props[rateField];

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${name}${state ? ', ' + state : ''}</strong><br/>
        <strong>Rate (per 1,000):</strong> ${Number(rateVal).toFixed(1)}
      `)
      .addTo(map);
  });

  map.on('mouseenter', 'rates-fill', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'rates-fill', () => (map.getCanvas().style.cursor = ''));

  buildChoroplethLegend('Case rate (per 1,000)', breaks, colors, 'Source: NYT + ACS (2018) + Census');
}

// Legend for choropleth
function buildChoroplethLegend(title, breaks, colors, sourceText) {
  const legend = document.getElementById('legend');
  let html = `<div class="legend-title">${title}</div>`;

  // build ranges like "0–10", "10–25", ..., "150+"
  for (let i = 0; i < colors.length; i++) {
    let label;
    if (i === 0) label = `${breaks[0]}–${breaks[1]}`;
    else if (i < colors.length - 1) label = `${breaks[i]}–${breaks[i + 1]}`;
    else label = `${breaks[breaks.length - 1]}+`;

    html += `
      <div class="legend-row">
        <span class="swatch" style="background:${colors[i]}"></span>
        <span>${label}</span>
      </div>
    `;
  }

  html += `<div style="margin-top:10px; font-size:10pt; text-align:right;">${sourceText}</div>`;
  legend.innerHTML = html;
}

// -------------------------------------
// Map 2: Proportional symbols (cases)
// -------------------------------------
function initCasesMap() {
  map.addSource('covid-counts', {
    type: 'geojson',
    data: 'assets/us-covid-2020-counts.geojson'
  });

  // MUST match your geojson property
  const casesField = 'cases';

  // Circle radius: use sqrt so very large counties don’t dominate
  const circleRadius = [
    'interpolate', ['linear'],
    ['sqrt', ['to-number', ['get', casesField]]],
    0, 2,
    50, 4,
    100, 6,
    200, 9,
    400, 13,
    800, 18
  ];

  map.addLayer({
    id: 'cases-circles',
    type: 'circle',
    source: 'covid-counts',
    paint: {
      'circle-radius': circleRadius,
      'circle-color': 'rgb(255,120,80)',
      'circle-opacity': 0.65,
      'circle-stroke-color': 'white',
      'circle-stroke-width': 0.8
    }
  });

  map.on('click', 'cases-circles', (e) => {
    const f = e.features[0];
    const props = f.properties;

    const name = props.county || props.NAME || props.County || 'County';
    const state = props.state || props.STATE || props.State || '';
    const casesVal = props[casesField];

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${name}${state ? ', ' + state : ''}</strong><br/>
        <strong>Total cases (2020):</strong> ${Number(casesVal).toLocaleString()}
      `)
      .addTo(map);
  });

  map.on('mouseenter', 'cases-circles', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'cases-circles', () => (map.getCanvas().style.cursor = ''));

  buildCircleLegend(
    'Total cases',
    [1000, 10000, 50000],        // edit to match your data scale
    [6, 14, 26],                 // legend circle sizes (manual like your earthquake example)
    'rgb(255,120,80)',
    'Source: NYT + Census'
  );
}

// Legend for proportional symbols
function buildCircleLegend(title, values, sizes, color, sourceText) {
  const legend = document.getElementById('legend');
  let labels = [`<div class="legend-title">${title}</div>`];

  for (let i = 0; i < values.length; i++) {
    const d = sizes[i];
    labels.push(
      `<p class="break">
        <i class="dot" style="background:${color}; width:${d}px; height:${d}px;"></i>
        <span class="dot-label" style="top:${d / 3}px;">${values[i].toLocaleString()}</span>
      </p>`
    );
  }

  labels.push(`<div style="margin-top:10px; font-size:10pt; text-align:right;">${sourceText}</div>`);
  legend.innerHTML = labels.join('');
}
