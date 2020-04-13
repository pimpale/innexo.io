/* global moment RBush3D sleep L fetchJson apiUrl */

const minTimestamp = moment('2017').valueOf();
const maxTimestamp = moment('2018').valueOf();

let map = null;
let points = null;

/**
 * loads the map
 */
function loadmap() {
  map = L.map('mapid');
  map.setView([0, 0], 2);

  const osm = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: ('Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>'),
    maxZoom: 18,
    minZoom: 2,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoicGltcGFsZSIsImEiOiJjazhkbzk4NTIwdHkzM21vMWFiNHI' +
      'zZ3BiIn0.nLv4P71SFh4TIANuwJ8I9A',
  });

  osm.addTo(map);

  const drawnItems = L.featureGroup().addTo(map);

  map.addControl(new L.Control.Draw({
    position: 'topright',
    edit: {
      featureGroup: drawnItems,
      poly: {
        allowIntersection: false,
      },
    },
    draw: {
      featureGroup: drawnItems,
      polyline: false,
      polygon: false,
      circle: false,
      marker: false,
      rectangle: true,
      circlemarker: false,
    },
  }));

  map.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;
    drawnItems.addLayer(layer);
  });
}

/**
 * Instruction step 0
 */
async function instruction0() {
  $('#mapdiv').hide();
  $('#mapinfo-title').html('Map');
  $('#mapinfo-subtext').html('Complete step 1 in order to load your data.');
  $('#instruction1-selectfile').prop('disabled', true);
  await instruction1();
}

/**
 * when the file handler loads a file, we process it
 */
async function instruction1() {
  // when a file is uploaded
  $('#customFile').change(async function () {
    const f = this.files[0];
    // enable the button and set a listener
    $('#instruction1-selectfile').prop('disabled', false);
    $('#instruction1-selectfile').button().click(async function () {
      await instruction2(f);
    });
  });
}

/**
 * we initialize the methods for the user to begin excluding data
 */
async function instruction2(file) {
  $('#mapinfo-title').html('Your Locations');
  $('#mapinfo-subtext').html(`Use the slider below to select the date ranges
    you want to check. Use the rectangle tool to exclude areas from the check.
    Note that your data must be under 10MB for upload`);

  // corona didn't really get started till 2020
  points = JSON.parse(await file.text()).locations
    .filter((loc) => loc.timestampMs >= minTimestamp && loc.timestampMs < maxTimestamp)
    .map((loc) => ({
      latitude: loc.latitudeE7 * 10e-8,
      longitude: loc.longitudeE7 * 10e-8,
      timestamp: parseInt(loc.timestampMs),
    }));

  const tree = RBush3D.build(16, ['latitude', 'longitude', 'timestamp', 'latitude', 'longitude', 'timestamp']);
  tree.load(points);

  /**
   * Recursive function to draw levels
   */
  async function drawTree(node, level) {
    if(!node) {
      return;
    }
    await sleep(1);
    if(node.leaf || level === 6) {
      L.marker([node.minX, node.minY]).addTo(map);
    }

    for (var i = 0; i < node.children.length; i++) {
        await drawTree(node.children[i], level + 1);
    }
  }

  $('#mapdiv').show();
  await drawTree(tree.data, 0);

  return;
  $('#instruction1-progress-div').show();
  for (let i = 0; i < points.length; i+=1) {
    await sleep(1);
    const loc  = points[i];
    $('#instruction1-progress').css('width', `${(i*100.0)/points.length}%`);
    let marker = L.marker([loc.latitude, loc.longitude]).addTo(map);
  }
  $('#instruction1-progress-div').hide();
}

function loadslider() {
  $("#map-daterange").ionRangeSlider({
    disabled: true,
    skin: "round",
    type: "double",
    grid: true,
    min: minTimestamp,
    max: maxTimestamp,
    from: minTimestamp,
    to: maxTimestamp,
    prettify: (ts) => moment(ts).format('MMM D, YYYY'),
  });
}

$(document).ready(async function () {
  loadmap();
  loadslider();
  // begin the process
  await instruction0();
});




