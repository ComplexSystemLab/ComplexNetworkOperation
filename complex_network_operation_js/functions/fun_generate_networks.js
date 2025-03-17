/**
 * 函数：生成网络功能
 */

import * as d3 from 'd3';
import {Delaunay} from 'd3-delaunay';
import {generatePoints} from './fun_generate_points.js';

/**
 * 生成不同机制的、不同网络连接结构的，具有 D3 图数据类型的图网络。
 *
 * 这个方法的步骤是：
 * 1. 获取节点之坐标；
 * 2. 根据网络生成机制生成网络之连边；
 *
 * - 网络连接结构 networkType 有以下可选项：
 *     - 'Random': 随机生成网络
 *     - 'Voronoi': 使用 Voronoi 图生成网络；
 *     - 'Complete': 使用完全图生成网络；
 *     - 'Random': 使用随机图生成网络；
 *     - 'Community Structure': 使用社区结构生成网络；
 *     - 'Small World': 使用小世界网络生成网络；
 *     - 'Scale Free': 使用无标度网络生成网络；
 *     - 'Hierarchical': 使用分层网络生成网络；
 *     - 'Regular': 使用规则网络生成网络；
 *     - 'Grid': 使用网格网络生成网络；
 *     - 'Scale Free': 使用无标度网络生成网络；
 *
 * @param {Array} nodesPos 节点坐标
 * @param {string} graphDirectionType 图的方向类型。默认是 'undirected' 。可选值有：
 *     - 'directed': 有向图
 *     - 'undirected': 无向图
 * @param {number} setNumEdges 设置边数量
 * @param {number} setNumInterpolatedDensityDistance 设置插值密度距离
 * @param {number} numEdgesPerNode 每个节点的边数量
 * @param {number} numNeighbors 邻居节点数量
 * @param {string} networkMechanism 网络生成机制。默认是 Voronoi 图。
 * @param {string} networkType 网络连接结构。默认是 Voronoi 图。
 * @param {boolean} hierarchical 是否生成分层网络。默认是 False。
 * @param {boolean} isPreviewPlot 是否预览绘制。默认是 False。
 * @returns {Object} 图网络。图网络有两种可能的类型：有向图或者无向图。
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
            ({edges, vor} = generateWeightedVoronoiNetwork(nodesPos, null, isPreviewPlot));
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

    return {graph: g, vor};
}

/**
 * 生成加权的 Voronoi 图网络。
 *
 * @param {Array} nodesPos 节点坐标
 * @param {Array} weights 权重
 * @param {boolean} isPreviewPlot 是否预览绘制
 * @returns {Object} 边集合和 Voronoi 类数据
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
    if (!vor.edges || !Array.isArray(vor.edges)) {
        console.error('vor:', vor);
        throw new Error('Failed to generate Voronoi diagram: vor.edges is not an array');
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