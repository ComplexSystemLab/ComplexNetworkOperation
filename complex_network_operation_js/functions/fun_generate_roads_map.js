/**
 * 函数：生成路网地图。
 */
import {generateNetwork} from './fun_generate_networks.js';
import {findNearestPoint} from '../utils/algorithm_utils.js';

/**
 * 辅助函数：计算两点之间的欧几里得距离。
 * @param {Array} point1 - 第一个点 [x, y]。
 * @param {Array} point2 - 第二个点 [x, y]。
 * @returns {number} - 欧几里得距离。
 */
function calculateDistance(point1, point2) {
    return Math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);
}

/**
 * 辅助函数：在两个节点之间插值生成点。
 * @param {Array} node1 - 起始节点 [x, y]。
 * @param {Array} node2 - 终止节点 [x, y]。
 * @param {number} interpolateDistance - 插值点之间的距离。
 * @returns {Array} - 插值点数组。
 */
function interpolatePoints(node1, node2, interpolateDistance) {
    const length = calculateDistance(node1, node2);
    const numPoints = Math.floor(length / interpolateDistance);
    const interpolatedPoints = [];
    for (let i = 1; i <= numPoints; i++) {
        const t = i / (numPoints + 1);
        interpolatedPoints.push([
            node1[0] + t * (node2[0] - node1[0]),
            node1[1] + t * (node2[1] - node1[1]),
        ]);
    }
    return interpolatedPoints;
}

/**
 * 生成路网地图，通过指定的生成机制。
 *
 * @param {Array} nodesPos 节点的空间坐标。
 * @param {number} setNumRoadEdges 设置边的数量。
 * @param {number} setNumInterpolatedDensityDistance 设置每条路径的插值密度距离。
 * @param {number} numRoadEdgesPerNode 每个节点的边数量。
 * @param {number} numNeighbors 邻居节点数量。
 * @param {string} roadsNetworkMechanism 网络生成机制。
 * @param {string} networkType 网络类型。
 * @param {boolean} isPreviewPlot 是否预览绘制，默认为 False。
 * @returns {Object} g 有向图网络。
 */
export function generateRoadsNetworkByMechanism(
    nodesPos = null,
    setNumRoadEdges = null,
    setNumInterpolatedDensityDistance = null,
    numRoadEdgesPerNode = null,
    numNeighbors = null,
    roadsNetworkMechanism = 'Voronoi',
    networkType = 'Voronoi',
    isPreviewPlot = false
) {
    const {graph: g, vor} = generateNetwork(nodesPos, 'directed', setNumRoadEdges, setNumInterpolatedDensityDistance, numRoadEdgesPerNode, numNeighbors, roadsNetworkMechanism, networkType, false, isPreviewPlot);

    for (let edge of g.edges) {
        let node1 = nodesPos[edge[0]];
        let node2 = nodesPos[edge[1]];
        let interpolatedPointsPerEdge = interpolatePoints(node1, node2, setNumInterpolatedDensityDistance);
        g.edges[edge]['interpolated_points'] = interpolatedPointsPerEdge;
    }

    for (let edge of g.edges) {
        let idNode1 = edge[0];
        let idNode2 = edge[1];
        let straightDistance = calculateDistance(nodesPos[idNode1], nodesPos[idNode2]);
        g.edges[edge]['straight_distance'] = straightDistance;
    }

    for (let edge of g.edges) {
        let idNode1 = edge[0];
        let idNode2 = edge[1];
        let pathLength = 0;
        pathLength += calculateDistance(nodesPos[idNode1], g.edges[edge]['interpolated_points'][0]);
        let interpolatedPointsPathLength = [];
        for (let j = 0; j < g.edges[edge]['interpolated_points'].length - 1; j++) {
            pathLength += calculateDistance(
                g.edges[edge]['interpolated_points'][j],
                g.edges[edge]['interpolated_points'][j + 1]
            );
            interpolatedPointsPathLength[j] = pathLength;
        }
        pathLength += calculateDistance(
            g.edges[edge]['interpolated_points'][g.edges[edge]['interpolated_points'].length - 1],
            nodesPos[idNode2]
        );
        g.edges[edge]['path_length'] = pathLength;
        g.edges[edge]['interpolated_points_path_length'] = interpolatedPointsPathLength.reverse();
    }

    switch (networkType) {
        case 'Voronoi':
            return [g, voronoiGraph];
        default:
            throw new Error(`networkType ${networkType} 不被支持。`);
    }
}

/**
 * 根据导入的原始图像及其标记图像，生成路网矢量信息。
 *
 * @param {string} filepathOriginImage 原始图像路径。
 * @param {string} filepathSignedImage 标记图像路径。
 * @returns {Object} roadsMap 路网数据结构。
 * @returns {Array} roadsSkeletonBinaryMap 道路骨架二值化像素图。
 * @returns {Array} roadsSkeletonIdMap 道路骨架像素图。
 */
export function generateRoadsNetworkByImportImage(filepathOriginImage, filepathSignedImage) {
    const thresholdMergeNearJunctions = 10;
    const minLengthOfPixelsOfEdge = 10;
    const interpolatedDensityDistance = 4;

    const imageOrigin = new Image();
    imageOrigin.src = filepathOriginImage;
    const imageSigned = new Image();
    imageSigned.src = filepathSignedImage;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageSigned.width;
    canvas.height = imageSigned.height;
    ctx.drawImage(imageSigned, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const imageRGB = imageData.data;

    const areaRedSignedPixels = [];
    for (let i = 0; i < imageRGB.length; i += 4) {
        if (imageRGB[i] === 255 && imageRGB[i + 1] === 0 && imageRGB[i + 2] === 0) {
            areaRedSignedPixels.push(1);
        } else {
            areaRedSignedPixels.push(0);
        }
    }

    const roadsSignedPixels = areaRedSignedPixels;

    const dilated = morphology.dilation(roadsSignedPixels, morphology.square(3));

    const pixelsSignedRoadsDilated = measure.label(dilated);

    const skeletons = [];
    for (let i = 1; i <= pixelsSignedRoadsDilated.max(); i++) {
        const mask = pixelsSignedRoadsDilated === i;
        const skeleton = morphology.skeletonize(mask);
        skeletons.push(skeleton);
    }

    let imgImageSkeleton = new Array(skeletons[0].length).fill(0);
    for (let skeleton of skeletons) {
        imgImageSkeleton = imgImageSkeleton.map((val, idx) => val || skeleton[idx]);
    }

    let gray;
    if (imgImageSkeleton[0].length === 3) {
        gray = color.rgb2gray(imgImageSkeleton);
    } else {
        gray = imgImageSkeleton;
    }

    const roadsSkeletonBinaryMap = gray.map(val => val > filters.thresholdOtsu(gray));

    const roadsMap = {
        'junctions_nodes': {},
        'road_edges': {},
        'interpolated_nodes': {},
    };

    let junctionNodes = detectJunctionsPoints(roadsSkeletonBinaryMap, 26);
    junctionNodes = mergeNearJunctions(junctionNodes, thresholdMergeNearJunctions);

    const roadEdges = [];
    const roadsSkeletonIdMap = new Array(roadsSkeletonBinaryMap.length).fill(0).map(() => new Array(roadsSkeletonBinaryMap[0].length).fill(0));
    for (let i = 0; i < roadsSkeletonBinaryMap.length; i++) {
        for (let j = 0; j < roadsSkeletonBinaryMap[0].length; j++) {
            if (roadsSkeletonBinaryMap[i][j]) {
                roadsSkeletonIdMap[i][j] = -1;
            } else {
                roadsSkeletonIdMap[i][j] = -2;
            }
        }
    }
    for (let i = 0; i < junctionNodes.length; i++) {
        roadsSkeletonIdMap[junctionNodes[i][0]][junctionNodes[i][1]] = -3;
    }

    const neighbors = [];
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i !== 0 || j !== 0) {
                neighbors.push([i, j]);
            }
        }
    }

    for (let i = 0; i < junctionNodes.length; i++) {
        for (let [j, k] of neighbors) {
            if (roadsSkeletonIdMap[junctionNodes[i][0] + j][junctionNodes[i][1] + k] === -1) {
                roadsSkeletonIdMap[junctionNodes[i][0] + j][junctionNodes[i][1] + k] = -4;
            }
        }
    }

    let idxEdge = 0;
    for (let i = 0; i < junctionNodes.length; i++) {
        for (let [j, k] of neighbors) {
            let x = junctionNodes[i][0] + j;
            let y = junctionNodes[i][1] + k;
            if (roadsSkeletonIdMap[x][y] === -4) {
                let roadEdgesTerminal1 = i;
                let isContinueFillEdge = true;
                let edgePixels = [];
                while (isContinueFillEdge) {
                    const neighborsPixels = neighbors.map(([m, n]) => [x + m, y + n]);
                    const neighborsValues = neighborsPixels.map(([m, n]) => roadsSkeletonIdMap[m][n]);

                    if (roadsSkeletonIdMap[x][y] === -1) {
                        roadsSkeletonIdMap[x][y] = idxEdge;
                        edgePixels.push([x, y]);
                        if (neighborsValues.includes(-4)) {
                            [x, y] = neighborsPixels[neighborsValues.indexOf(-4)];
                        } else if (neighborsValues.includes(-1)) {
                            [x, y] = neighborsPixels[neighborsValues.indexOf(-1)];
                        } else if (Math.max(...neighborsValues) >= 0 && Math.min(...neighborsValues) === -2) {
                            let [roadEdgesTerminal2] = findNearestPoint([x, y], junctionNodes);
                            isContinueFillEdge = false;
                        }
                    } else if (roadsSkeletonIdMap[x][y] === -4) {
                        roadsSkeletonIdMap[x][y] = idxEdge;
                        edgePixels.push([x, y]);
                        if (neighborsValues.includes(-3)) {
                            if (neighborsPixels[neighborsValues.indexOf(-3)] !== [junctionNodes[i][0], junctionNodes[i][1]]) {
                                let roadEdgesTerminal2 = neighborsValues.indexOf(-3);
                                edgePixels.push([x, y]);
                                isContinueFillEdge = false;
                                let isThisEdgeValid = true;
                            } else {
                                if (neighborsValues.includes(-1)) {
                                    [x, y] = neighborsPixels[neighborsValues.indexOf(-1)];
                                } else {
                                    let [roadEdgesTerminal2] = findNearestPoint([x, y], junctionNodes);
                                    isContinueFillEdge = false;
                                }
                            }
                        }
                    }
                }

                if (edgePixels.length < minLengthOfPixelsOfEdge) {
                    let isThisEdgeValid = false;
                }

                if (isThisEdgeValid) {
                    roadEdges.push([idxEdge, [roadEdgesTerminal1, roadEdgesTerminal2], edgePixels]);
                    idxEdge++;
                }
            }
        }
    }

    const interpolatedNodes = [];
    for (let i = 0; i < roadEdges.length; i++) {
        const edgePixels = roadEdges[i][2];
        const interpolatedPointsPerEdge = interpolatePointsAlongPixelsPath(edgePixels, interpolatedDensityDistance);
        for (let j = 0; j < interpolatedPointsPerEdge.length; j++) {
            if (j === 0) {
                interpolatedNodes.push([j, roadEdges[i][0], [roadEdges[i][1][0], j + 1], interpolatedPointsPerEdge[j]]);
            } else if (j === interpolatedPointsPerEdge.length - 1) {
                interpolatedNodes.push([j, roadEdges[i][0], [j - 1, roadEdges[i][1][1]], interpolatedPointsPerEdge[j]]);
            } else {
                interpolatedNodes.push([j, roadEdges[i][0], [j - 1, j + 1], interpolatedPointsPerEdge[j]]);
            }
        }
    }

    for (let i = 0; i < junctionNodes.length; i++) {
        roadsMap['junctions_nodes'][i] = junctionNodes[i];
    }
    for (let i = 0; i < roadEdges.length; i++) {
        roadsMap['road_edges'][i] = roadEdges[i];
    }
    for (let i = 0; i < interpolatedNodes.length; i++) {
        roadsMap['interpolated_nodes'][i] = interpolatedNodes[i];
    }

    return [roadsMap, roadsSkeletonBinaryMap, roadsSkeletonIdMap];
}

/**
 * 检测骨架图像中的交叉点。
 *
 * @param {Array} skeleton 骨架图像。
 * @param {number} connectivityLimit 连通性限制最大值，默认为 26。
 * @returns {Array} 交叉点数组。
 */
function detectJunctionsPoints(skeleton, connectivityLimit = 26) {
    const kernel = [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1]
    ];

    const neighborCount = skeleton.map((row, y) =>
        row.map((val, x) => {
            if (val === 1) {
                let count = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        if (ky !== 0 || kx !== 0) {
                            const ny = y + ky;
                            const nx = x + kx;
                            if (ny >= 0 && ny < skeleton.length && nx >= 0 && nx < row.length) {
                                count += skeleton[ny][nx];
                            }
                        }
                    }
                }
                return count;
            }
            return 0;
        })
    );

    const junctions = [];

    for (let y = 1; y < skeleton.length - 1; y++) {
        for (let x = 1; x < skeleton[0].length - 1; x++) {
            if (skeleton[y][x] === 1) {
                const count = neighborCount[y][x];

                if (count >= 3) {
                    junctions.push([y, x]);
                }

                if (count === 1) {
                    junctions.push([y, x]);
                }
            }
        }
    }

    return junctions;
}

/**
 * 融合过于接近的交叉点。
 *
 * @param {Array} junctions 交叉点空间坐标列表，每个元素是一个包含两个元素的元组，表示交叉点的空间坐标。
 * @param {number} threshold 融合阈值，单位为像素。
 * @returns {Array} 融合后的交叉点空间坐标列表。
 */
function mergeNearJunctions(junctions, threshold = 3) {
    if (junctions.length === 0) {
        return [];
    }

    const mergedJunctions = [];
    const processed = new Array(junctions.length).fill(false);

    for (let i = 0; i < junctions.length; i++) {
        if (!processed[i]) {
            const distances = junctions.map(j => calculateDistance(j, junctions[i]));
            const closeBy = distances.map(d => d < threshold);

            const meanJunction = closeBy.reduce(
                (acc, val, idx) => {
                    if (val) {
                        acc[0] += junctions[idx][0];
                        acc[1] += junctions[idx][1];
                        acc[2]++;
                    }
                    return acc;
                },
                [0, 0, 0]
            );
            meanJunction[0] /= meanJunction[2];
            meanJunction[1] /= meanJunction[2];

            const mergedJunction = closeBy.reduce(
                (acc, val, idx) => {
                    if (val) {
                        const dist = calculateDistance(junctions[idx], meanJunction);
                        if (dist < acc[1]) {
                            acc[0] = junctions[idx];
                            acc[1] = dist;
                        }
                    }
                    return acc;
                },
                [null, Infinity]
            )[0];

            mergedJunctions.push(mergedJunction);
            closeBy.forEach((val, idx) => {
                if (val) {
                    processed[idx] = true;
                }
            });
        }
    }

    return mergedJunctions;
}

/**
 * 计算像素点之间的累积距离。
 *
 * @param {Array} pixels 像素点空间坐标列表。
 * @returns {Array} 累积距离列表。
 */
function calculateCumulativeDistances(pixels) {
    const distances = [0];
    for (let i = 1; i < pixels.length; i++) {
        const distance = calculateDistance(pixels[i], pixels[i - 1]);
        distances.push(distances[distances.length - 1] + distance);
    }
    return distances;
}

/**
 * 根据每条边的插值点数生成插值点。
 *
 * @param {Array} node1 起始节点空间坐标。
 * @param {Array} node2 终止节点空间坐标。
 * @param {number} numPoints 插值点数。
 * @returns {Array} 插值点空间坐标。
 */
function interpolatePointsByNumOfPoints(node1, node2, numPoints) {
    const t = Array.from({length: numPoints}, (_, i) => (i + 1) / (numPoints + 1));
    const interpolatedPoints = t.map(ti => [
        node1[0] + ti * (node2[0] - node1[0]),
        node1[1] + ti * (node2[1] - node1[1]),
    ]);
    return interpolatedPoints;
}

/**
 * 根据每条边的插值距离生成线性插值点空间坐标列表。
 *
 * @param {Array} node1 起始节点空间坐标。
 * @param {Array} node2 终止节点空间坐标。
 * @param {number} interpolateDistance 插值距离。
 * @returns {Array} 插值点空间坐标。
 */
function interpolatePointsByLinearDistance(node1, node2, interpolateDistance) {
    const length = calculateDistance(node2, node1);
    const numPoints = Math.floor(length / interpolateDistance);
    const t = Array.from({length: numPoints}, (_, i) => (i + 1) / (numPoints + 1));
    const interpolatedPoints = t.map(ti => [
        node1[0] + ti * (node2[0] - node1[0]),
        node1[1] + ti * (node2[1] - node1[1]),
    ]);
    return interpolatedPoints;
}

/**
 * 沿着给定的像素路径生成插值点空间坐标列表。
 *
 * @param {Array} pixels 像素点空间坐标列表。
 * @param {number} distance 插值距离。
 * @returns {Array} 插值点空间坐标列表。
 */
function interpolatePointsAlongPixelsPath(pixels, distance) {
    if (!pixels || pixels.length < 2) {
        return [];
    }

    const cumulativeDistances = calculateCumulativeDistances(pixels);
    const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
    const remainder = totalDistance % distance;
    const numPoints = Math.floor(totalDistance / distance);
    const adjustedDistance = distance + remainder / numPoints;

    const interpolatedPoints = [];
    for (let i = 1; i < numPoints; i++) {
        const targetDistance = i * adjustedDistance;
        for (let j = 1; j < cumulativeDistances.length; j++) {
            if (cumulativeDistances[j] >= targetDistance) {
                const ratio = (targetDistance - cumulativeDistances[j - 1]) / (cumulativeDistances[j] - cumulativeDistances[j - 1]);
                const x = pixels[j - 1][0] + ratio * (pixels[j][0] - pixels[j - 1][0]);
                const y = pixels[j - 1][1] + ratio * (pixels[j][1] - pixels[j - 1][1]);
                interpolatedPoints.push([x, y]);
                break;
            }
        }
    }
    return interpolatedPoints;
}


