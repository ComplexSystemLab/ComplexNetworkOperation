import * as d3 from 'd3';

/**
 * 函数：生成散点分布
 */



/**
 * 根据一系列初始条件与给定分布生成符合要求的散点。
 * 
 * 这里估算的过程中，采用了正方形、立方体作为中间计算量，然后转换为同面积、同体积的圆形、球体。
 * 
 * 散点分布类型：
 * - 'Posssion Disk': 生成符合 Poisson Disk 分布的散点。这种分布的特点是，散点之间的距离大致相等，且散点之间的距离大于给定的最小距离。
 * - 'Uniform': 生成符合均匀分布的散点。这种分布的特点是，散点之间的距离大致相等，但散点之间的距离不一定大于给定的最小距离。
 * - 'Normal': 生成符合正态分布的散点。这种分布的特点是，散点之间的距离大致符合正态分布，但散点之间的距离不一定大于给定的最小距离。
 * 
 * 散点分布相关的算法类型：
 * - 'Bridson': 采用 Bridson 算法生成符合 Poisson Disk 分布的散点。该算法的特点是生成的散点距离一定满足不小于最小距离，但是生成的散点数量不一定等于给定的数量；
 * - 'cKDTree': 采用 cKDTree 算法生成符合 Poisson Disk 分布的散点。该算法的特点是生成的散点距离一定满足不小于最小距离，但是生成的散点数量不一定等于给定的数量；#BUG 这个还没有适配生成圆形边界的情况。因此不要使用！
 * - 'K-means': 采用 K-means 算法生成符合接近 Poisson Disk 分布的散点。该算法的特点是能够生成精确数量的散点，并且生成性能较高；
 * - 'annealing': 采用退火算法生成符合 Poisson Disk 分布的散点。该算法的特点是能够生成精确数量的散点，但是生成性能较差； #BUG 还没有测试。因此不要使用！
 * 
 * @param {number} set_densityDistance - 密度距离
 * @param {number} set_numPoints - 散点总数。注意实际生成的数量大约在这个值附近，不会完全等于这个值。
 * @param {number} set_circleRadius - 范围半径
 * @param {Array} circle_origin - 圆心坐标
 * @param {number} num_samples - 每次迭代生成的散点数量
 * @param {string} distribution - 期望的散点分布类型
 * @param {string} algorithm - 生成散点分布的算法
 * @param {number} sigma - 正态分布的标准差
 * @param {boolean} hierarchical_network_type - 是否是层次网络
 * @param {number} num_external_nodes - 外部节点的数量
 * 
 * @example
 * const points = generatePoints({ set_numPoints: 100, set_circleRadius: 500, circle_origin: [0, 0], distribution: 'Normal' });
 * console.log(points);
 * 
 * @returns {Array} 生成的散点。散点数据结构形式为：[[x1, y1], [x2, y2], ...]
 */
function generatePoints(setDensityDistance = null, setNumPoints = null, setCircleRadius = null, circleOrigin = [0, 0], numSamples = 30, distribution = 'Normal', algorithm = null, sigma = 1, hierarchicalNetworkType = false, numExternalNodes = 0) {
    let dim = circleOrigin.length;
    let densityDistance, numPoints, circleRadius;

    if (dim !== 2) {
        throw new Error("The dimension of the circle origin must be 2.");
    }

    if (setDensityDistance !== null && setNumPoints !== null && setCircleRadius === null) {
        let a = setDensityDistance * Math.sqrt(setNumPoints);
        circleRadius = a / Math.sqrt(Math.PI);
        densityDistance = setDensityDistance;
        numPoints = setNumPoints;
    } else if (setDensityDistance !== null && setCircleRadius !== null && setNumPoints === null) {
        let a = setCircleRadius * Math.sqrt(Math.PI);
        numPoints = Math.round(a / setDensityDistance);
        densityDistance = setDensityDistance;
        circleRadius = setCircleRadius;
    } else if (setNumPoints !== null && setCircleRadius !== null && setDensityDistance === null) {
        let a = setCircleRadius * Math.sqrt(Math.PI);
        densityDistance = a / setNumPoints;
        numPoints = setNumPoints;
        circleRadius = setCircleRadius;
    } else {
        throw new Error("Two out of the three parameters (density, total, area) must be provided.");
    }

    if (hierarchicalNetworkType) {
        return generateHierarchicalNetworkNodes(circleOrigin, circleRadius, numPoints, numExternalNodes);
    }

    switch (distribution) {
        case 'Normal':
            return generatePointsUsingNormalRandomDistribution(circleOrigin, circleRadius, numPoints, sigma);
        case 'Uniform':
            return generatePointsUsingUniformRandomDistribution(circleOrigin, circleRadius, numPoints);
        case 'Poisson Disk':
            switch (algorithm) {
                case 'K-means':
                    return generatePointsUsingPoissonDiskRandomDistributionByKmeansAlgorithm(circleOrigin, circleRadius, numPoints);
                case 'Bridson':
                    return generatePointsUsingPoissonDiskRandomDistributionByBridsonAlgorithm(circleOrigin, circleRadius, densityDistance, numSamples);
                default:
                    if (setNumPoints !== null) {
                        return generatePointsUsingPoissonDiskRandomDistributionByKmeansAlgorithm(circleOrigin, circleRadius, numPoints);
                    } else if (setDensityDistance !== null && setNumPoints === null && setCircleRadius !== null) {
                        return generatePointsUsingPoissonDiskRandomDistributionByBridsonAlgorithm(circleOrigin, circleRadius, densityDistance, numSamples);
                    }
            }
    }
}

/**
 * 生成符合正态分布的散点。
 * 
 * @param {Array} circle_origin - 圆心坐标
 * @param {number} circle_radius - 圆的半径
 * @param {number} num_points - 生成的点的数量
 * @param {number} sigma - 正态分布的标准差
 * @returns {Array} 生成的散点
 */
function generatePointsUsingNormalRandomDistribution(circleOrigin, circleRadius, numPoints, sigma = 1) {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * circleRadius;
        points.push([r * Math.cos(theta) + circleOrigin[0], r * Math.sin(theta) + circleOrigin[1]]);
    }
    return points;
}

/**
 * 生成符合均匀分布的散点。
 * 
 * @param {Array} circle_origin - 圆心坐标
 * @param {number} circle_radius - 圆的半径
 * @param {number} num_points - 生成的点的数量
 * @returns {Array} 生成的散点
 */
function generatePointsUsingUniformRandomDistribution(circleOrigin, circleRadius, numPoints) {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * circleRadius;
        points.push([r * Math.cos(theta) + circleOrigin[0], r * Math.sin(theta) + circleOrigin[1]]);
    }
    return points;
}

/**
 * 采用 Bridson 算法生成符合 Poisson Disk 分布的散点。
 * 
 * @param {Array} origin - 圆心坐标
 * @param {number} radius - 圆的半径
 * @param {number} min_distance - 最小距离
 * @param {number} num_samples - 每次迭代生成的散点数量
 * @returns {Array} 生成的散点
 */
function generatePointsUsingPoissonDiskRandomDistributionByBridsonAlgorithm(origin, radius, minDistance, numSamples = 15) {
    const cellSize = minDistance / Math.sqrt(2);
    const gridRadius = Math.floor(radius / cellSize) + 1;
    const grid = Array.from({ length: 2 * gridRadius }, () => Array(2 * gridRadius).fill(-1));
    const activeList = [];
    const samples = [];
    let sampleCount = 0;

    let firstSample = [Math.random() * 2 * radius - radius, Math.random() * 2 * radius - radius];
    while (Math.hypot(firstSample[0], firstSample[1]) > radius) {
        firstSample = [Math.random() * 2 * radius - radius, Math.random() * 2 * radius - radius];
    }

    samples.push(firstSample);
    sampleCount++;
    const gridIndex = [Math.floor((firstSample[0] + radius) / cellSize), Math.floor((firstSample[1] + radius) / cellSize)];
    grid[gridIndex[0]][gridIndex[1]] = 0;
    activeList.push(gridIndex);

    while (activeList.length > 0) {
        const currentIndex = Math.floor(Math.random() * activeList.length);
        const currentCell = activeList[currentIndex];

        for (let i = 0; i < numSamples; i++) {
            const newSample = generateRandomPointAroundByBridsonAlgorithm(samples[grid[currentCell[0]][currentCell[1]]], minDistance);
            if (Math.hypot(newSample[0], newSample[1]) <= radius && isValidSampleByBridsonAlgorithm(newSample, radius, minDistance, samples, grid, cellSize)) {
                samples.push(newSample);
                sampleCount++;
                const newIndex = [Math.floor((newSample[0] + radius) / cellSize), Math.floor((newSample[1] + radius) / cellSize)];
                grid[newIndex[0]][newIndex[1]] = sampleCount - 1;
                activeList.push(newIndex);
            }
        }

        activeList.splice(currentIndex, 1);
    }

    return samples.map(sample => [sample[0] + origin[0], sample[1] + origin[1]]);
}

/**
 * 采用 Bridson 算法生成一个距离给定点一定距离的随机点。
 * 
 * @param {Array} point - 中心点
 * @param {number} min_distance - 最小距离
 * @returns {Array} 生成的随机点
 */
function generateRandomPointAroundByBridsonAlgorithm(point, minDistance) {
    const r = Math.random() * minDistance + minDistance;
    const theta = Math.random() * 2 * Math.PI;
    return [point[0] + r * Math.cos(theta), point[1] + r * Math.sin(theta)];
}

/**
 * 判断生成的散点是否有效。
 * 
 * @param {Array} sample - 生成的散点
 * @param {number} radius - 圆的半径
 * @param {number} min_distance - 最小距离
 * @param {Array} samples - 已生成的散点
 * @param {Array} grid - 网格
 * @param {number} cell_size - 网格的大小
 * @returns {boolean} 是否有效
 */
function isValidSampleByBridsonAlgorithm(sample, radius, minDistance, samples, grid, cellSize) {
    if (Math.hypot(sample[0], sample[1]) > radius) {
        return false;
    }
    const gridIndex = [Math.floor((sample[0] + radius) / cellSize), Math.floor((sample[1] + radius) / cellSize)];
    if (gridIndex[0] < 0 || gridIndex[0] >= grid.length || gridIndex[1] < 0 || gridIndex[1] >= grid[0].length) {
        return false;
    }
    if (grid[gridIndex[0]][gridIndex[1]] !== -1) {
        return false;
    }
    for (const neighborIndex of getNeighborIndices(gridIndex, grid.length, grid[0].length)) {
        if (grid[neighborIndex[0]][neighborIndex[1]] !== -1) {
            const neighborSample = samples[grid[neighborIndex[0]][neighborIndex[1]]];
            if (Math.hypot(sample[0] - neighborSample[0], sample[1] - neighborSample[1]) < minDistance) {
                return false;
            }
        }
    }
    return true;
}

/**
 * 获取邻居散点的索引。
 * 
 * @param {Array} index - 索引
 * @param {number} grid_width - 网格宽度
 * @param {number} grid_height - 网格高度
 * @returns {Array} 邻居索引
 */
function getNeighborIndices(index, gridWidth, gridHeight) {
    const neighbors = [];
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const neighborIndex = [index[0] + i, index[1] + j];
            if (neighborIndex[0] >= 0 && neighborIndex[0] < gridWidth && neighborIndex[1] >= 0 && neighborIndex[1] < gridHeight) {
                neighbors.push(neighborIndex);
            }
        }
    }
    return neighbors;
}

/**
 * 采用 K-means 算法生成符合 Poisson Disk 分布的散点。
 * 
 * @param {Array} circle_origin - 圆心坐标
 * @param {number} circle_radius - 圆的半径
 * @param {number} num_points - 生成的点的数量
 * @returns {Array} 生成的散点
 */
function generatePointsUsingPoissonDiskRandomDistributionByKmeansAlgorithm(circleOrigin, circleRadius, numPoints) {
    const numInitialPoints = numPoints * 20;
    const initialPoints = [];
    for (let i = 0; i < numInitialPoints; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * circleRadius;
        initialPoints.push([r * Math.cos(theta) + circleOrigin[0], r * Math.sin(theta) + circleOrigin[1]]);
    }

    const centroids = d3.cluster().kmeans(initialPoints, numPoints);
    return centroids;
}

/**
 * 实现 K-means 算法。
 * 
 * @param {Array} points - 二维数组，每一行代表一个点。
 * @param {number} num_clusters - 聚类的数量。
 * @param {number} max_iter - 最大迭代次数。
 * @returns {Array} 每一行代表一个质心。
 */
function kmeans(points, num_clusters, max_iter = 100) {
    const num_points = points.length;
    const num_dim = points[0].length;
    let centroids = points.slice(0, num_clusters);

    for (let iter = 0; iter < max_iter; iter++) {
        const distances = Array.from({ length: num_points }, () => Array(num_clusters).fill(0));
        for (let i = 0; i < num_points; i++) {
            for (let j = 0; j < num_clusters; j++) {
                distances[i][j] = points[i].reduce((sum, val, dim) => sum + Math.pow(val - centroids[j][dim], 2), 0);
            }
        }

        const labels = distances.map(row => row.indexOf(Math.min(...row)));

        const new_centroids = Array.from({ length: num_clusters }, () => Array(num_dim).fill(0));
        const counts = Array(num_clusters).fill(0);
        for (let i = 0; i < num_points; i++) {
            const label = labels[i];
            counts[label]++;
            for (let dim = 0; dim < num_dim; dim++) {
                new_centroids[label][dim] += points[i][dim];
            }
        }

        for (let j = 0; j < num_clusters; j++) {
            for (let dim = 0; dim < num_dim; dim++) {
                new_centroids[j][dim] /= counts[j] || 1;
            }
        }

        if (centroids.every((centroid, j) => centroid.every((val, dim) => val === new_centroids[j][dim]))) {
            break;
        }
        centroids = new_centroids;
    }

    return centroids;
}

/**
 * 生成层次网络节点。
 * 
 * @param {Array} circle_origin - 圆心坐标
 * @param {number} circle_radius - 圆的半径
 * @param {number} num_points - 生成的点的数量
 * @param {number} num_external_nodes - 外部节点的数量
 * @returns {Array} 生成的散点
 */
function generateHierarchicalNetworkNodes(circleOrigin, circleRadius, numPoints, numExternalNodes) {
    const points = [];
    const externalPoints = [];
    const internalPoints = [];

    for (let i = 0; i < numExternalNodes; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const r = circleRadius;
        externalPoints.push([r * Math.cos(theta) + circleOrigin[0], r * Math.sin(theta) + circleOrigin[1]]);
    }

    for (let i = 0; i < numPoints - numExternalNodes; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * circleRadius;
        internalPoints.push([r * Math.cos(theta) + circleOrigin[0], r * Math.sin(theta) + circleOrigin[1]]);
    }

    return externalPoints.concat(internalPoints);
}

export { generatePoints };