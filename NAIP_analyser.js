// NAIP Analyser
// Robert Naylor
// 08/03/2018

// load an NAIP quarter quad and analyse it for tree diseases
// position and time variables
var co_ord_1 = -103.84140014648438;
var co_ord_2 = 44.147594160227264;
var year = '2012';
// ID number for the test
var number = '14';

// get the data
var naip = ee.ImageCollection('USDA/NAIP/DOQQ')
  .filterBounds(ee.Geometry.Point(co_ord_1, co_ord_2))
  .filterDate(year + '-01-01', year + '-12-30')
  // stick to RGBN 
  .select(['R', 'G', 'B', 'N']);
// set view to centre, remembering the strange zoom variable
Map.setCenter(co_ord_1, co_ord_2, 13);
// add the map layer
Map.addLayer(naip, {}, 'NAIP');
// print data
print('naip', naip);
// convert to "image" type
var naip = ee.Image(naip.first());

// Get the NIR band
var nir = naip.select('N');
// Define a neighborhood with a kernel
var square = ee.Kernel.square({radius: 7});
// Compute entropy and display
var entropy_2 = nir.entropy(square);
Map.addLayer(entropy_2,
             {min: 1, max: 5, palette: ['FFFFFF', '000000']},
             'entropy');
// get an idea of entropy values
print('entropy', entropy_2)

// create the variables comparing the colours, focussing on red to find brown
var redtogreen = naip.normalizedDifference(['R', 'G']);
var redtoblue = naip.normalizedDifference(['R', 'B']);
// combine to generally look at red
var red = redtogreen.and(redtoblue);

// import roads from google maps
var fc = ee.FeatureCollection('TIGER/' + year + '/Roads');
// filter by geometry
var fc = fc.filterBounds(geometry2);
// create an image from the road feature
var drawn = fc.draw({color: 'FFFFFF', strokeWidth: 50});
// print out information
print('drawn', drawn);

// Mask and mosaic visualization images.  The last layer is on top.
var mosaic = ee.ImageCollection([
  // black background
  red.updateMask(entropy_2.gte(0)).visualize({palette: ['000000']}),
  // forest entropy threshold
  red.updateMask(entropy_2.gte(4)).visualize({palette: ['00FF00']}),
  // disease threshold
  red.updateMask((redtogreen.gte(0.01).and(redtoblue.gte(0.01))).and(entropy_2.gte(4))).visualize({palette: ['FFFFFF']}),
  // roads threshold
  red.updateMask(drawn.select('vis-red').gte(0)).visualize({palette: ['000000']}),
]).mosaic();
Map.addLayer(mosaic, {}, 'Visualization mosaic');

// create a geometry representing an export region
var geometry = geometry2;

// export original satellite image
Export.image.toDrive({
  image: naip,
  description: year + '_image_' + number,
  scale: 5,
  region: geometry
});

// export mosaic
Export.image.toDrive({
  image: mosaic,
  description: year + '_diseased_forest_' + number,
  scale: 1,
  region: geometry
});

// export entropy image
Export.image.toDrive({
  image: entropy_2,
  description: year + '_entropy_' + number,
  scale: 5,
  region: geometry
});
