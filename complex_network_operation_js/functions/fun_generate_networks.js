import * as d3 from 'd3';
import { Delaunay } from 'd3-delaunay';
import { generatePoints } from './fun_generate_points.js';

function generateNetwork(nodesPos, graphDirectionType = 'undirected', setNumEdges = null, setNumInterpolatedDensityDistance = null, numEdgesPerNode = null, numNeighbors = null, networkMechanism = 'Voronoi', networkType = 'Voronoi', hierarchical = false, isPreviewPlot = false) {
    let g;
    switch (graphDirectionType) {
        case 'undirected':
            g = new Map();
            break;
        case 'directed':
            g = new Map();
            break;
        default:
            throw new Error(`Unsupported graph direction type: ${graphDirectionType}`);
    }

    // Add nodes
    nodesPos.forEach((nodePos, i) => {
        g.set(i, {
            id: i,
            name: i.toString(),
            type: 'node',
            pos: nodePos.slice(),
            colorName: 'red',
            edges: []
        });
    });

    let edges, vor;
    switch (networkType) {
        case 'Voronoi':
            ({ edges, vor } = generateWeightedVoronoiNetwork(nodesPos, null, isPreviewPlot));
            break;
        case 'Hierarchical':
            throw new Error('Hierarchical network generation not implemented');
        default:
            throw new Error(`Unsupported network type: ${networkType}`);
    }

    // Add edges
    edges.forEach((edge, i) => {
        const [node1, node2] = edge;
        g.get(node1).edges.push({
            id: i,
            name: `edge:${node1}-${node2}`,
            type: 'edge',
            colorName: 'black',
            straightDistance: Math.hypot(vor.points[node1][0] - vor.points[node2][0], vor.points[node1][1] - vor.points[node2][1])
        });
        if (graphDirectionType === 'directed') {
            g.get(node2).edges.push({
                id: i + edges.length,
                name: `edge:${node2}-${node1}`,
                type: 'edge',
                colorName: 'black',
                straightDistance: Math.hypot(vor.points[node2][0] - vor.points[node1][0], vor.points[node2][1] - vor.points[node1][1])
            });
        }
    });

    return { graph: g, vor };
}

function generateWeightedVoronoiNetwork(nodesPos, weights = null, isPreviewPlot = false) {
    if (!weights) {
        weights = new Array(nodesPos.length).fill(1);
    }

    const vor = Delaunay.from(nodesPos).voronoi([0, 0, 1, 1]);

    if (isPreviewPlot) {
        const svg = d3.create("svg")
            .attr("width", 500)
            .attr("height", 500);

        svg.append("g")
            .selectAll("path")
            .data(vor.cellPolygons())
            .enter().append("path")
            .attr("d", d3.line())
            .attr("fill", (d, i) => d3.interpolateViridis(weights[i]));

        svg.append("g")
            .selectAll("circle")
            .data(nodesPos)
            .enter().append("circle")
            .attr("cx", d => d[0])
            .attr("cy", d => d[1])
            .attr("r", 2)
            .attr("fill", "red");

        document.body.appendChild(svg.node());
    }

    const edges = vor.edges.map(edge => [edge[0], edge[1]]);
    return { edges, vor };
}

export { generateNetwork };
