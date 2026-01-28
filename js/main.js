mapboxgl.accessToken = 'pk.eyJ1IjoianN1MyIsImEiOiJjbWhlZW45ZTcwZGR4Mm1wd2FoNmc1eGx4In0.1uDkRhqn0WIQeUtnhvLPOA';

const mode = document.body.dataset.map; // "rates" or "cases"

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v10',
  center: [-98, 39],
  zoom: 3.2,
  projection: { name: 'albers' } // required by lab
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

map.on('load', () => {
  if (mode === 'rates') initRatesMap();
  if (mode === 'cases') initCasesMap();
});

// ---------------------------
// Map 1: Choropleth (rates)
// Your file has property: "rates" (plural)
// ---------------------------
function initRatesMap() {
  map.addSource('covid-rates', {
    type: 'geojson',
    data: 'assets/us-covid-2020-rates.json'
  });

  const rateField = 'rates'; // IMPORTANT: your data uses "rates"

  // You can adjust breaks later if you want
  const breaks = [0, 10, 25, 50, 75, 100, 150];
  const colors = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'];

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

  map.on('click', 'rates-fill', (e) => {
    const p = e.features[0].properties;

    const county = p.county ?? 'Unknown';
    const state = p.state ?? '';
    const rateVal = Number(p[rateField]);
    const casesVal = Number(p.cases);
    const deathsVal = Number(p.deaths);

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${county}${state ? ', ' + state : ''}</strong><br/>
        <strong>Rate (per 1,000):</strong> ${Number.isFinite(rateVal) ? rateVal.toFixed(3) : 'N/A'}<br/>
        <strong>Cases:</strong> ${Number.isFinite(casesVal) ? casesVal.toLocaleString() : 'N/A'}<br/>
        <strong>Deaths:</strong> ${Number.isFinite(deathsVal) ? deathsVal.toLocaleString() : 'N/A'}
      `)
      .addTo(map);
  });

  map.on('mouseenter', 'rates-fill', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'rates-fill', () => (map.getCanvas().style.cursor = ''));

  buildChoroplethLegend('Case rate (per 1,000)', breaks, colors);
}

function buildChoroplethLegend(title, breaks, colors) {
  const legend = document.getElementById('legend');
  let html = `<div class="legend-title">${title}</div>`;

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

  html += `
    <div style="margin-top:10px; font-size:10pt; text-align:right;">
      Source: NYT (cases) + ACS 2018 (pop) + Census (counties)
    </div>
  `;

  legend.innerHTML = html;
}

// -------------------------------------
// Map 2: Proportional symbols (cases)
// Your file has property: "cases"
// -------------------------------------
function initCasesMap() {
  map.addSource('covid-counts', {
    type: 'geojson',
    data: 'assets/us-covid-2020-counts.json'
  });

  const casesField = 'cases';

  // sqrt scaling keeps big counties from overwhelming the map
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
    const p = e.features[0].properties;

    const county = p.county ?? 'Unknown';
    const state = p.state ?? '';
    const casesVal = Number(p[casesField]);
    const deathsVal = Number(p.deaths);

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${county}${state ? ', ' + state : ''}</strong><br/>
        <strong>Total cases (2020):</strong> ${Number.isFinite(casesVal) ? casesVal.toLocaleString() : 'N/A'}<br/>
        <strong>Total deaths (2020):</strong> ${Number.isFinite(deathsVal) ? deathsVal.toLocaleString() : 'N/A'}
      `)
      .addTo(map);
  });

  map.on('mouseenter', 'cases-circles', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'cases-circles', () => (map.getCanvas().style.cursor = ''));

  buildCircleLegend('Total cases (2020)', [1000, 10000, 50000], [8, 18, 30], 'rgb(255,120,80)');
}

function buildCircleLegend(title, values, sizes, color) {
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

  labels.push(`
    <div style="margin-top:10px; font-size:10pt; text-align:right;">
      Source: NYT (cases/deaths)
    </div>
  `);

  legend.innerHTML = labels.join('');
}
