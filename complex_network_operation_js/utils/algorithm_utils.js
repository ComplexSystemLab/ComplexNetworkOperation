/**
 * 算法工具。
 *
 * 本模块实现了一些常用的算法。
 */

function kmeans(points, numClusters, maxIter = 100) {
    /**
     * K-means 算法实现。
     *
     * 参数:
     *   points (Array<Array<number>>): 二维数组，每一行表示一个点。
     *   numClusters (number): 聚类的数量。
     *   maxIter (number): 最大迭代次数。
     *
     * 返回:
     *   Array<Array<number>>: 二维数组，每一行表示一个质心。
     */
    const numPoints = points.length;
    const numDim = points[0].length;

    // 随机初始化质心
    const centroids = [];
    const chosenIndices = new Set();
    while (centroids.length < numClusters) {
        const index = Math.floor(Math.random() * numPoints);
        if (!chosenIndices.has(index)) {
            centroids.push([...points[index]]);
            chosenIndices.add(index);
        }
    }

    for (let iter = 0; iter < maxIter; iter++) {
        // 计算距离并分配标签
        const labels = new Array(numPoints);
        const distances = points.map(point =>
            centroids.map(centroid =>
                point.reduce((sum, val, dim) => sum + (val - centroid[dim]) ** 2, 0)
            )
        );
        for (let i = 0; i < numPoints; i++) {
            labels[i] = distances[i].indexOf(Math.min(...distances[i]));
        }

        // 更新质心
        const newCentroids = Array.from({length: numClusters}, () => Array(numDim).fill(0));
        const counts = Array(numClusters).fill(0);
        for (let i = 0; i < numPoints; i++) {
            const label = labels[i];
            counts[label]++;
            for (let d = 0; d < numDim; d++) {
                newCentroids[label][d] += points[i][d];
            }
        }
        for (let j = 0; j < numClusters; j++) {
            if (counts[j] > 0) {
                for (let d = 0; d < numDim; d++) {
                    newCentroids[j][d] /= counts[j];
                }
            }
        }

        // 检查是否收敛
        if (centroids.every((centroid, j) =>
            centroid.every((val, d) => val === newCentroids[j][d])
        )) {
            break;
        }
        centroids.splice(0, centroids.length, ...newCentroids);
    }

    return centroids;
}

function findNearestPoint(targetPoint, points) {
    /**
     * 找到离目标点最近的点。
     *
     * 参数:
     *   targetPoint (Array<number>): 目标点的坐标。
     *   points (Array<Array<number>>): 其他点的坐标列表。
     *
     * 返回:
     *   Object: { nearestPointIndex: number, minDistance: number }
     */
    let minDistance = Infinity;
    let nearestPointIndex = -1;

    points.forEach((point, index) => {
        const distance = Math.sqrt(
            point.reduce((sum, val, dim) => sum + (val - targetPoint[dim]) ** 2, 0)
        );
        if (distance < minDistance) {
            minDistance = distance;
            nearestPointIndex = index;
        }
    });

    return {nearestPointIndex, minDistance};
}

export {kmeans, findNearestPoint};
