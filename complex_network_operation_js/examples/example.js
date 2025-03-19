import {generatePoints} from '../functions/fun_generate_points.js';
import {generateRoadsNetworkByMechanism} from '../functions/fun_generate_roads_map.js';

// Parameter settings
const setWorldCircleRadius = 500;
const setWorldCircleDensityDistance = 250;
const setWorldCityNumInterpolatedDensityDistance = 10.0;

// Generate positions of city nodes
const cityNodesPos = generatePoints(
    null, // set_numPoints
    setWorldCircleDensityDistance, // set_densityDistance
    setWorldCircleRadius, // set_circleRadius
    [0, 0], // circle_origin
    null, // set_city_circle_radius (not applicable here)
    'Poisson Disk' // distribution
);

// Generate the top-level traffic network between cities
const {network: gWorldCityTrafficNetwork, interpolatedPoints: cityNetworksInterpolatedPoints} = generateRoadsNetworkByMechanism(
    cityNodesPos, // nodes_pos
    setWorldCityNumInterpolatedDensityDistance, // set_num_interpolated_density_distance
    true // is_preview_plot
);

console.log('Generated City Nodes Positions:', cityNodesPos);
console.log('Generated World City Traffic Network:', gWorldCityTrafficNetwork);
console.log('Interpolated Points:', cityNetworksInterpolatedPoints);