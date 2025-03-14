"""
算法工具。

该工具实现了一些常用的算法。这些算法可以使用 Julia 进行加速。
"""

using Random
using LinearAlgebra
using Printf

function kmeans(points::Matrix{Float64}, num_clusters::Int, max_iter::Int=100)
    """
    K-means 算法。基于 Julia 实现。

    Args:
        points (Matrix{Float64}): 二维数组，每一行代表一个点。
        num_clusters (Int): 聚类的数量。
        max_iter (Int): 最大迭代次数。

    Returns:
        Matrix{Float64}: 二维数组，每一行代表一个质心。

    Examples:
        points = [1.0 2.0; 3.0 4.0; 5.0 6.0]
        kmeans(points, 2)
    """
    num_points, num_dim = size(points)
    centroids = points[rand(1:num_points, num_clusters), :]

    for _ in 1:max_iter
        distances = [sum((points[i, :] .- centroids[j, :]).^2) for i in 1:num_points, j in 1:num_clusters]
        labels = findmin(distances, dims=2)[2][:]

        new_centroids = zeros(Float64, num_clusters, num_dim)
        for j in 1:num_clusters
            cluster_points = points[labels .== j, :]
            new_centroids[j, :] = mean(cluster_points, dims=1)
        end

        if all(centroids .== new_centroids)
            break
        end
        centroids = new_centroids
    end

    return centroids
end

function find_nearest_point(target_point::Tuple{Float64, Float64}, points::Vector{Tuple{Float64, Float64}})
    """
    寻找距离目标点最近的点。

    Args:
        target_point (Tuple{Float64, Float64}): 目标点坐标。
        points (Vector{Tuple{Float64, Float64}}): 其他点的坐标列表。

    Returns:
        nearest_point_index (Int): 最近点在列表中的索引。
        min_distance (Float64): 最近点与目标点之间的距离。
    """
    min_distance = Inf
    nearest_point_index = -1
    for (index, point) in enumerate(points)
        distance = norm([point[1] - target_point[1], point[2] - target_point[2]])
        if distance < min_distance
            min_distance = distance
            nearest_point_index = index
        end
    end
    return nearest_point_index, min_distance
end

# 示例展示 K-means 算法
if abspath(PROGRAM_FILE) == @__FILE__
    using Plots

    # 创建一些随机数据
    num_points = 10000
    points = zeros(Float64, num_points, 2)
    for i in 1:num_points
        theta = rand() * 2 * π
        r = sqrt(rand())
        points[i, :] = [r * cos(theta), r * sin(theta)]
    end

    # 使用 K-means 算法生成 100 个散点
    num_clusters = 100
    centroids = kmeans(points, num_clusters)

    # 绘制结果
    scatter(points[:, 1], points[:, 2], markersize=1)
    scatter!(centroids[:, 1], centroids[:, 2], color=:red)
end
