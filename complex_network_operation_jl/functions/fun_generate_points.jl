"""
函数：生成散点分布
"""

using Random
using LinearAlgebra
using Printf

include("../../utils/altorithm_utils.jl")

function generate_points(
        set_densityDistance::Union{Float64, Nothing}=nothing,
        set_numPoints::Union{Int, Nothing}=nothing,
        set_circleRadius::Union{Float64, Nothing}=nothing,
        circle_origin::Vector{Float64}=[0.0, 0.0],
        num_samples::Int=30,
        distribution::String="Normal",
        algorithm::Union{String, Nothing}=nothing,
        sigma::Float64=1.0,
        hierarchical_network_type::Bool=false,
        num_external_nodes::Int=0
    )
    """
    根据一系列初始条件与给定分布生成符合要求的散点。

    这里估算的过程中，采用了正方形、立方体作为中间计算量，然后转换为同面积、同体积的圆形、球体。

    散点分布类型：
    - 'Posssion Disk': 生成符合 Poisson Disk 分布的散点。这种分布的特点是，散点之间的距离大致相等，且散点之间的距离大于给定的最小距离。
    - 'Uniform': 生成符合均匀分布的散点。这种分布的特点是，散点之间的距离大致相等，但散点之间的距离不一定大于给定的最小距离。
    - 'Normal': 生成符合正态分布的散点。这种分布的特点是，散点之间的距离大致符合正态分布，但散点之间的距离不一定大于给定的最小距离。

    散点分布相关的算法类型：
    - 'Bridson': 采用 Bridson 算法生成符合 Poisson Disk 分布的散点。该算法的特点是生成的散点距离一定满足不小于最小距离，但是生成的散点数量不一定等于给定的数量；
    - 'K-means': 采用 K-means 算法生成符合接近 Poisson Disk 分布的散点。该算法的特点是能够生成精确数量的散点，并且生成性能较高；

    Args:
        set_densityDistance: Float64, 密度距离
        set_numPoints: Int, 散点之总数。注意实际生成的数量大约在这个值附近，不会完全等于这个值。
        set_circleRadius: Float64, 范围半径
        circle_origin: Vector{Float64}, 圆心坐标
        num_samples: Int, 算法每次迭代生成的散点数量
        distribution: String, 期望的散点分布类型
        algorithm: Union{String, Nothing}, 生成散点分布之算法
        sigma: Float64, 正态分布的标准差
        hierarchical_network_type: Bool, 是否是层次网络
        num_external_nodes: Int, 外部节点的数量

    Returns:
        Matrix{Float64}: 生成的散点
    """
    # 根据给定参数计算其余参数
    # 判断生成的空间维度
    dim = length(circle_origin)
    if dim == 2
        if set_densityDistance !== nothing && set_numPoints !== nothing && set_circleRadius === nothing
            a = set_densityDistance * sqrt(set_numPoints)
            circle_radius = a / sqrt(π)
        elseif set_densityDistance !== nothing && set_circleRadius !== nothing && set_numPoints === nothing
            a = set_circleRadius * sqrt(π)
            num_points = round(Int, a / set_densityDistance)
        elseif set_numPoints !== nothing && set_circleRadius !== nothing && set_densityDistance === nothing
            a = set_circleRadius * sqrt(π)
            density_distance = a / set_numPoints
        else
            throw(ArgumentError("Two out of the three parameters (density, total, area) must be provided."))
        end
    else
        throw(ArgumentError("The dimension of the circle origin must be either 2."))
    end

    println("dim: $dim, density_distance: $density_distance, num_points: $num_points, circle_radius: $circle_radius, circle_origin: $circle_origin")

    # 生成散点
    if hierarchical_network_type
        return _generate_hierarchical_network_nodes(circle_origin, circle_radius, num_points, num_external_nodes)
    end

    if distribution == "Normal"
        return _generate_points_used_Normal_random_distribution(circle_origin, circle_radius, num_points, sigma)
    elseif distribution == "Uniform"
        return _generate_points_used_Uniform_random_distribution(circle_origin, circle_radius, num_points)
    elseif distribution == "Posssion Disk"
        if algorithm == "K-means"
            return _generate_points_used_PoissonDisk_random_distribution_by_Kmeans_algorithm(circle_origin, circle_radius, num_points)
        elseif algorithm == "Bridson"
            return _generate_points_used_PoissonDisk_random_distribution_by_Bridson_algorithm(circle_origin, circle_radius, density_distance, num_samples)
        elseif algorithm === nothing
            if set_numPoints !== nothing
                algorithm = "K-means"
                return _generate_points_used_PoissonDisk_random_distribution_by_Kmeans_algorithm(circle_origin, circle_radius, num_points)
            elseif set_densityDistance !== nothing && set_numPoints === nothing && set_circleRadius !== nothing
                algorithm = "Bridson"
                return _generate_points_used_PoissonDisk_random_distribution_by_Bridson_algorithm(circle_origin, circle_radius, density_distance, num_samples)
            end
        end
    end

    return nothing
end

function _generate_points_used_Normal_random_distribution(circle_origin::Vector{Float64}, circle_radius::Float64, num_points::Int, sigma::Float64=1.0)
    """
    生成符合正态分布的散点。这里采用了简单的方法，即在圆内随机生成一定数量的点。

    Args:
        circle_origin: Vector{Float64}, 圆心坐标
        circle_radius: Float64, 圆的半径
        num_points: Int, 生成的点的数量
        sigma: Float64, 正态分布的标准差

    Returns:
        Matrix{Float64}: 生成的散点
    """
    points = zeros(Float64, num_points, 2)
    for i in 1:num_points
        theta = rand() * 2 * π
        r = sqrt(rand()) * circle_radius
        points[i, :] = [r * cos(theta) + circle_origin[1], r * sin(theta) + circle_origin[2]]
    end
    return points
end

function _generate_points_used_Uniform_random_distribution(circle_origin::Vector{Float64}, circle_radius::Float64, num_points::Int)
    """
    生成符合均匀分布的散点。这里采用了简单的方法，即在圆内随机生成一定数量的点。

    Args:
        circle_origin: Vector{Float64}, 圆心坐标
        circle_radius: Float64, 圆的半径
        num_points: Int, 生成的点的数量

    Returns:
        Matrix{Float64}: 生成的散点
    """
    points = zeros(Float64, num_points, 2)
    for i in 1:num_points
        theta = rand() * 2 * π
        r = sqrt(rand()) * circle_radius
        points[i, :] = [r * cos(theta) + circle_origin[1], r * sin(theta) + circle_origin[2]]
    end
    return points
end

function _generate_points_used_PoissonDisk_random_distribution_by_Bridson_algorithm(origin::Vector{Float64}, radius::Float64, min_distance::Float64, num_samples::Int=15)
    """
    生成符合 Poisson Disk 分布的散点，这些散点分布在一个圆形区域内。这里采用了著名的 Bridson 算法。

    Args:
        origin: Vector{Float64}, 圆心坐标
        radius: Float64, 圆的半径
        min_distance: Float64, 最小距离
        num_samples: Int, 每次生成的散点数量

    Returns:
        Matrix{Float64}: 生成的散点
    """
    cell_size = min_distance / sqrt(2)
    grid_radius = Int(radius / cell_size) + 1
    grid = fill(-1, 2 * grid_radius, 2 * grid_radius)
    active_list = []

    samples = zeros(Float64, 4 * radius * radius, 2)
    sample_count = 0

    first_sample = [rand(-radius:radius), rand(-radius:radius)]
    while norm(first_sample) > radius
        first_sample = [rand(-radius:radius), rand(-radius:radius)]
    end

    samples[sample_count + 1, :] = first_sample
    sample_count += 1
    grid_index = (Int((first_sample[1] + radius) / cell_size), Int((first_sample[2] + radius) / cell_size))
    grid[grid_index...] = 0
    push!(active_list, grid_index)

    while !isempty(active_list)
        current_index = rand(1:length(active_list))
        current_cell = active_list[current_index]

        for _ in 1:num_samples
            new_sample = _generate_random_point_around_by_Bridson_algorithm(samples[grid[current_cell...], :], min_distance)
            if norm(new_sample) <= radius && _is_valid_sample_by_Bridson_algorithm(new_sample, radius, min_distance, samples[1:sample_count, :], grid, cell_size)
                samples[sample_count + 1, :] = new_sample
                sample_count += 1
                new_index = (Int((new_sample[1] + radius) / cell_size), Int((new_sample[2] + radius) / cell_size))
                grid[new_index...] = sample_count - 1
                push!(active_list, new_index)
            end
        end

        deleteat!(active_list, current_index)
    end

    samples = samples[1:sample_count, :] .+ origin
    return samples
end

function _generate_random_point_around_by_Bridson_algorithm(point::Vector{Float64}, min_distance::Float64)
    """
    生成一个距离 point 一定距离的随机点。

    Args:
        point: Vector{Float64}, 中心点
        min_distance: Float64, 最小距离

    Returns:
        Vector{Float64}: 生成的随机点
    """
    r = rand(min_distance:2 * min_distance)
    theta = rand() * 2 * π
    x = point[1] + r * cos(theta)
    y = point[2] + r * sin(theta)
    return [x, y]
end

function _is_valid_sample_by_Bridson_algorithm(sample::Vector{Float64}, radius::Float64, min_distance::Float64, samples::Matrix{Float64}, grid::Matrix{Int}, cell_size::Float64)
    """
    判断生成的散点是否有效。散点必须满足以下条件：
    1. 位于空间内
    2. 与其他散点的距离大于 min_distance
    3. 与邻居散点的距离大于 min_distance

    Args:
        sample: Vector{Float64}, 生成的散点
        radius: Float64, 圆的半径
        min_distance: Float64, 最小距离
        samples: Matrix{Float64}, 已生成的散点
        grid: Matrix{Int}, 网格
        cell_size: Float64, 网格的大小

    Returns:
        Bool: 是否有效
    """
    if norm(sample) > radius
        return false
    end
    grid_index = (Int((sample[1] + radius) / cell_size), Int((sample[2] + radius) / cell_size))
    if grid_index[1] < 1 || grid_index[1] > size(grid, 1) || grid_index[2] < 1 || grid_index[2] > size(grid, 2)
        return false
    end
    if grid[grid_index...] != -1
        return false
    end
    for neighbor_index in _get_neighbor_indices(grid_index, size(grid))
        if neighbor_index[1] >= 1 && neighbor_index[1] <= size(grid, 1) && neighbor_index[2] >= 1 && neighbor_index[2] <= size(grid, 2) && grid[neighbor_index...] != -1
            neighbor_sample = samples[grid[neighbor_index...], :]
            if norm(sample .- neighbor_sample) < min_distance
                return false
            end
        end
    end
    return true
end

function _get_neighbor_indices(index::Tuple{Int, Int}, grid_shape::Tuple{Int, Int})
    """
    获取邻居散点的索引
    """
    neighbors = []
    for i in -1:1
        for j in -1:1
            if i == 0 && j == 0
                continue
            end
            neighbor_index = (index[1] + i, index[2] + j)
            if neighbor_index[1] >= 1 && neighbor_index[1] <= grid_shape[1] && neighbor_index[2] >= 1 && neighbor_index[2] <= grid_shape[2]
                push!(neighbors, neighbor_index)
            end
        end
    end
    return neighbors
end

function _generate_points_used_PoissonDisk_random_distribution_by_Kmeans_algorithm(circle_origin::Vector{Float64}, circle_radius::Float64, num_points::Int)
    """
    生成符合接近 Poisson Disk 分布的散点。这里采用了 K-means 算法。

    Args:
        num_points: Int, 目标生成的总点数
        circle_origin: Vector{Float64}, 圆心坐标
        circle_radius: Float64, 圆的半径

    Returns:
        Matrix{Float64}: 生成的散点
    """
    num_initial_points = num_points * 20
    initial_points = zeros(Float64, num_initial_points, 2)
    for i in 1:num_initial_points
        theta = rand() * 2 * π
        r = sqrt(rand()) * circle_radius
        initial_points[i, :] = [r * cos(theta) + circle_origin[1], r * sin(theta) + circle_origin[2]]
    end

    centroids = kmeans(initial_points, num_points)

    return centroids
end

function _generate_hierarchical_network_nodes(circle_origin::Vector{Float64}, circle_radius::Float64, num_points::Int, num_external_nodes::Int)
    """
    生成层次网络节点，包括内部节点和外部节点。

    Args:
        circle_origin: Vector{Float64}, 圆心坐标
        circle_radius: Float64, 圆的半径
        num_points: Int, 生成的点的数量
        num_external_nodes: Int, 外部节点的数量

    Returns:
        Matrix{Float64}: 生成的散点
    """
    points = zeros(Float64, num_points, 2)
    external_points = zeros(Float64, num_external_nodes, 2)
    internal_points = zeros(Float64, num_points - num_external_nodes, 2)

    for i in 1:num_external_nodes
        theta = rand() * 2 * π
        r = circle_radius
        external_points[i, :] = [r * cos(theta) + circle_origin[1], r * sin(theta) + circle_origin[2]]
    end

    for i in 1:(num_points - num_external_nodes)
        theta = rand() * 2 * π
        r = sqrt(rand()) * circle_radius
        internal_points[i, :] = [r * cos(theta) + circle_origin[1], r * sin(theta) + circle_origin[2]]
    end

    points[1:num_external_nodes, :] = external_points
    points[(num_external_nodes + 1):end, :] = internal_points

    return points
end
