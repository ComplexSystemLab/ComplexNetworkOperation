import { generatePoints } from '../functions/fun_generate_points.js';
import { generateNetwork } from '../functions/fun_generate_networks.js';

// Example usage of the generatePoints function
const points = generatePoints(null, 100, 50, [0, 0], 30, 'Normal');
// console.log('Generated Points:', points); // #DEBUG

// Example usage of the generateNetwork function
const network = generateNetwork(points, 'undirected', null, null, null, null, 'Voronoi', 'Voronoi', false);
console.log('Generated Network:', network);