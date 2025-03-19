/**
 * 函数：生成网络功能。
 */

import * as d3 from 'd3';
import {Delaunay} from 'd3-delaunay';
import {generatePoints} from './fun_generate_points.js';

/**
 * Generates a network with various connection structures and D3 graph data types.
 *
 * @param {Array} nodesPos Node positions.
 * @param {string} graphDirectionType Graph direction type, default is 'undirected'.
 * @param {number} setNumEdges Number of edges to set.
 * @param {number} setNumInterpolatedDensityDistance Interpolated density distance.
 * @param {number} numEdgesPerNode Number of edges per node.
 * @param {number} numNeighbors Number of neighbors.
 * @param {string} networkMechanism Network generation mechanism, default is 'Voronoi'.
 * @param {string} networkType Network connection structure, default is 'Voronoi'.
 * @param {boolean} hierarchical Whether to generate a hierarchical network, default is false.
 * @param {boolean} isPreviewPlot Whether to preview the plot, default is false.
 * @returns {Object} Graph network.
 */
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

    // 添加节点
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
            ({edges, vor} = generateWeightedVoronoiNetwork(nodesPos, null, isPreviewPlot));
            break;
        case 'Hierarchical':
            throw new Error('Hierarchical network generation not implemented');
        default:
            throw new Error(`Unsupported network type: ${networkType}`);
    }

    // 添加边
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

    return {graph: g, vor};
}

/**
 * Generates a weighted Voronoi network.
 *
 * @param {Array} nodesPos Node positions.
 * @param {Array} weights Weights.
 * @param {boolean} isPreviewPlot Whether to preview the plot.
 * @returns {Object} Edges and Voronoi data.
 */
function generateWeightedVoronoiNetwork(nodesPos, weights = null, isPreviewPlot = false) {
    if (!weights) {
        weights = new Array(nodesPos.length).fill(1);
    }

    const delaunay = Delaunay.from(nodesPos);
    if (!delaunay) {
        throw new Error('Failed to generate Delaunay triangulation');
    }

    const vor = delaunay.voronoi([0, 0, 1, 1]);
    if (!vor) {
        throw new Error('Failed to generate Voronoi diagram: vor is null');
    }

    // 验证 vor.edges
    if (!Array.isArray(vor.edges)) {
        throw new Error(`Failed to generate Voronoi diagram: Expected 'vor.edges' to be an array, but got ${typeof vor.edges}`);
    }

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
    return {edges, vor};
}

export {generateNetwork};