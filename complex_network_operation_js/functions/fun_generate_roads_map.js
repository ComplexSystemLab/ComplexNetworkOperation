/**
 * 函数：生成路网地图。
 */
import { generate_network } from './generations/fun_generate_networks';
import { _generate_weighted_voronoi_network, _calculate_distance_matrix } from './generations/fun_generate_networks';
import { find_nearest_point } from '../utils/altorithm_utils';

import * as np from 'numpy';
import { Path } from 'path';
import { io, color, feature, filters, morphology, measure } from 'skimage';
import { corner_harris } from 'skimage.feature';
import { Image } from 'PIL';
import * as plt from 'matplotlib.pyplot';

/**
 * 生成路网地图，通过生成机制。
 * 
 * 这个方法的步骤是：
 * 1. 通过网络生成机制生成网络；
 * 4. 根据网络拓扑结构，生成实际的路径边；
 * 5. 对每条边插值生成路由节点；
 * 
 * 其中，网络类型有以下可选项：
 * - 'Voronoi'：使用 Voronoi 图生成网络；
 * - 'Complete'：使用完全图生成网络；
 * - 'Random'：使用随机图生成网络；
 * - 'Community Structure'：使用社区结构生成网络；
 * - 'Small World'：使用小世界网络生成网络；
 * - 'Scale Free'：使用无标度网络生成网络；
 * - 'Hierarchical'：使用分层网络生成网络；
 * - 'Regular'：使用规则网络生成网络；
 * - 'Grid'：使用网格网络生成网络；
 * - 'Scale Free'：使用无标度网络生成网络；
 * 
 * @param {Array} nodes_pos 节点空间坐标
 * @param {number} set_num_road_edges 设置边数量
 * @param {number} set_num_interpolated_density_distance 设定每条路径插值密度距离
 * @param {number} num_road_edges_per_node 每个节点的边数量
 * @param {number} num_neighbors 邻居节点数量
 * @param {string} roads_network_mechanism 网络生成机制
 * @param {string} network_type 网络类型
 * @param {boolean} is_preview_plot 是否预览绘制。默认是 False。
 * @returns {Object} g 有向图网络
 */
function generate_roadsNetwork_by_machanism(
    nodes_pos = null,
    set_num_road_edges = null,
    set_num_interpolated_density_distance = null,
    num_road_edges_per_node = null,
    num_neighbors = null,
    roads_network_mechanism = 'Voronoi',
    network_type = 'Voronoi',
    is_preview_plot = false
) {
    let [g, voronoi_graph] = generate_network(nodes_pos, 'directed', 'Voronoi', is_preview_plot);

    for (let edge of g.edges) {
        let node1 = nodes_pos[edge[0]];
        let node2 = nodes_pos[edge[1]];
        let interpolated_points_per_edge = _interpolate_points_by_linear_distance(node1, node2, set_num_interpolated_density_distance);
        g.edges[edge]['interpolated_points'] = interpolated_points_per_edge;
    }

    for (let edge of g.edges) {
        let id_node1 = edge[0];
        let id_node2 = edge[1];
        let straight_distance = np.linalg.norm(nodes_pos[id_node1] - nodes_pos[id_node2]);
        g.edges[edge]['straight_distance'] = straight_distance;
    }

    for (let edge of g.edges) {
        let id_node1 = edge[0];
        let id_node2 = edge[1];
        let path_length = 0;
        path_length += np.linalg.norm(nodes_pos[id_node1] - g.edges[edge]['interpolated_points'][0]);
        let interpolated_points_path_length = np.zeros(g.edges[edge]['interpolated_points'].length);
        for (let j = 0; j < g.edges[edge]['interpolated_points'].length - 1; j++) {
            path_length += np.linalg.norm(g.edges[edge]['interpolated_points'][j] - g.edges[edge]['interpolated_points'][j + 1]);
            interpolated_points_path_length[j] = path_length;
        }
        path_length += np.linalg.norm(g.edges[edge]['interpolated_points'][g.edges[edge]['interpolated_points'].length - 1] - nodes_pos[id_node2]);
        g.edges[edge]['path_length'] = path_length;
        g.edges[edge]['interpolated_points_path_length'] = interpolated_points_path_length.reverse();
    }

    switch (network_type) {
        case 'Voronoi':
            return [g, voronoi_graph];
        default:
            throw new Error(`network_type ${network_type} is not supported.`);
    }
}

/**
 * 根据导入原始图像及其标记图像，生成路网矢量信息。
 * 
 * @param {string} filepath_origin_image 原始图像路径
 * @param {string} filepath_signed_image 标记图像路径
 * @returns {Object} roads_map 路网数据结构
 * @returns {Array} roads_skeleton_binary_map 道路骨架二值化像素图
 * @returns {Array} roads_skeleton_id_map 道路骨架像素图
 */
function generate_roadsNetwork_by_importImage(filepath_origin_image, filepath_signed_image) {
    const threshold_merge_near_junctions = 10;
    const min_length_of_pixels_of_edge = 10;
    const interpolated_density_distance = 4;

    const original_max_pixels = Image.MAX_IMAGE_PIXELS;
    Image.MAX_IMAGE_PIXELS = null;

    const image_origin = io.imread(filepath_origin_image);
    const image_signed = io.imread(filepath_signed_image);
    const image_RGB = image_signed.slice(0, 0, 3);

    const area_red_signed_pixels = np.all(image_RGB === [255, 0, 0], -1);
    const roads_signed_pixels = area_red_signed_pixels;

    const dilated = morphology.dilation(roads_signed_pixels, morphology.square(3));

    const pixels_signed_roads_dilated = measure.label(dilated);

    const skeletons = [];
    for (let i = 1; i <= pixels_signed_roads_dilated.max(); i++) {
        const mask = pixels_signed_roads_dilated === i;
        const skeleton = morphology.skeletonize(mask);
        skeletons.push(skeleton);
    }

    let img_image_skeleton = np.zeros_like(skeletons[0]);
    for (let skeleton of skeletons) {
        img_image_skeleton = np.logical_or(img_image_skeleton, skeleton);
    }

    let gray;
    if (img_image_skeleton.shape.length === 3) {
        gray = color.rgb2gray(img_image_skeleton);
    } else {
        gray = img_image_skeleton;
    }

    const roads_skeleton_binary_map = gray > filters.threshold_otsu(gray);

    const roads_map = {
        'junctions_nodes': {},
        'road_edges': {},
        'interpolated_nodes': {},
    };

    let junction_nodes = _detect_junctions_points(roads_skeleton_binary_map, 26);
    junction_nodes = _merge_near_junctions(junction_nodes, threshold_merge_near_junctions);

    const road_edges = [];
    const roads_skeleton_id_map = np.zeros_like(roads_skeleton_binary_map, 'int');
    roads_skeleton_id_map[roads_skeleton_binary_map] = -1;
    roads_skeleton_id_map[~roads_skeleton_binary_map] = -2;
    for (let i = 0; i < junction_nodes.length; i++) {
        roads_skeleton_id_map[junction_nodes[i][0], junction_nodes[i][1]] = -3;
    }

    const neighbors = [];
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i !== 0 || j !== 0) {
                neighbors.push([i, j]);
            }
        }
    }

    for (let i = 0; i < junction_nodes.length; i++) {
        for (let [j, k] of neighbors) {
            if (roads_skeleton_id_map[junction_nodes[i][0] + j, junction_nodes[i][1] + k] === -1) {
                roads_skeleton_id_map[junction_nodes[i][0] + j, junction_nodes[i][1] + k] = -4;
            }
        }
    }

    let idx_edge = 0;
    for (let i = 0; i < junction_nodes.length; i++) {
        for (let [j, k] of neighbors) {
            let x = junction_nodes[i][0] + j;
            let y = junction_nodes[i][1] + k;
            if (roads_skeleton_id_map[x, y] === -4) {
                let road_edges_terminal_1 = i;
                let is_continue_fill_edge = true;
                let edge_pixels = [];
                while (is_continue_fill_edge) {
                    const neighbors_pixels = neighbors.map(([m, n]) => [x + m, y + n]);
                    const neighbors_values = neighbors_pixels.map(([m, n]) => roads_skeleton_id_map[m, n]);

                    if (roads_skeleton_id_map[x, y] === -1) {
                        roads_skeleton_id_map[x, y] = idx_edge;
                        edge_pixels.push([x, y]);
                        if (neighbors_values.includes(-4)) {
                            [x, y] = neighbors_pixels[neighbors_values.indexOf(-4)];
                        } else if (neighbors_values.includes(-1)) {
                            [x, y] = neighbors_pixels[neighbors_values.indexOf(-1)];
                        } else if (Math.max(...neighbors_values) >= 0 && Math.min(...neighbors_values) === -2) {
                            let [road_edges_terminal_2] = find_nearest_point([x, y], junction_nodes);
                            is_continue_fill_edge = false;
                        }
                    } else if (roads_skeleton_id_map[x, y] === -4) {
                        roads_skeleton_id_map[x, y] = idx_edge;
                        edge_pixels.push([x, y]);
                        if (neighbors_values.includes(-3)) {
                            if (neighbors_pixels[neighbors_values.indexOf(-3)] !== [junction_nodes[i][0], junction_nodes[i][1]]) {
                                let road_edges_terminal_2 = neighbors_values.indexOf(-3);
                                edge_pixels.push([x, y]);
                                is_continue_fill_edge = false;
                                let is_this_edge_valid = true;
                            } else {
                                if (neighbors_values.includes(-1)) {
                                    [x, y] = neighbors_pixels[neighbors_values.indexOf(-1)];
                                } else {
                                    let [road_edges_terminal_2] = find_nearest_point([x, y], junction_nodes);
                                    is_continue_fill_edge = false;
                                }
                            }
                        }
                    }
                }

                if (edge_pixels.length < min_length_of_pixels_of_edge) {
                    let is_this_edge_valid = false;
                }

                if (is_this_edge_valid) {
                    road_edges.push([idx_edge, [road_edges_terminal_1, road_edges_terminal_2], edge_pixels]);
                    idx_edge++;
                }
            }
        }
    }

    const interpolated_nodes = [];
    for (let i = 0; i < road_edges.length; i++) {
        const edge_pixels = road_edges[i][2];
        const interpolated_points_per_edge = _interpolate_points_along_pixels_path(edge_pixels, interpolated_density_distance);
        for (let j = 0; j < interpolated_points_per_edge.length; j++) {
            if (j === 0) {
                interpolated_nodes.push([j, road_edges[i][0], [road_edges[i][1][0], j + 1], interpolated_points_per_edge[j]]);
            } else if (j === interpolated_points_per_edge.length - 1) {
                interpolated_nodes.push([j, road_edges[i][0], [j - 1, road_edges[i][1][1]], interpolated_points_per_edge[j]]);
            } else {
                interpolated_nodes.push([j, road_edges[i][0], [j - 1, j + 1], interpolated_points_per_edge[j]]);
            }
        }
    }

    for (let i = 0; i < junction_nodes.length; i++) {
        roads_map['junctions_nodes'][i] = junction_nodes[i];
    }
    for (let i = 0; i < road_edges.length; i++) {
        roads_map['road_edges'][i] = road_edges[i];
    }
    for (let i = 0; i < interpolated_nodes.length; i++) {
        roads_map['interpolated_nodes'][i] = interpolated_nodes[i];
    }

    Image.MAX_IMAGE_PIXELS = original_max_pixels;

    return [roads_map, roads_skeleton_binary_map, roads_skeleton_id_map];
}

/**
 * 检测骨架图像中的交叉点。
 * 
 * @param {Array} skeleton 骨架图像
 * @param {number} connectivity_limit 连通性限制最大值，默认为 26
 * @returns {Array} Array of junction points.
 */
function _detect_junctions_points(skeleton, connectivity_limit = 26) {
    const { convolve } = require('scipy.ndimage');

    const kernel = np.array([
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1]
    ]);

    const neighbor_count = convolve(skeleton.map(Number), kernel, 'constant', 0);

    const junctions = [];

    for (let y = 1; y < skeleton.length - 1; y++) {
        for (let x = 1; x < skeleton[0].length - 1; x++) {
            if (skeleton[y][x] === 1) {
                const neighbors = skeleton.slice(y - 1, y + 2).map(row => row.slice(x - 1, x + 2));
                const count = neighbor_count[y][x];

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
function _merge_near_junctions(junctions, threshold = 3) {
    if (junctions.length === 0) {
        return [];
    }

    const junctions_array = np.array(junctions);
    const merged_junctions = [];
    const processed = np.zeros(junctions.length, 'bool');

    for (let i = 0; i < junctions_array.length; i++) {
        if (!processed[i]) {
            const distances = np.sqrt(np.sum((junctions_array - junctions_array[i]) ** 2, 1));
            const close_by = distances < threshold;

            const mean_junction = np.mean(junctions_array[close_by], 0);
            const merged_junction = junctions_array[close_by][np.argmin(np.sum((junctions_array[close_by] - mean_junction) ** 2, 1))];

            merged_junctions.push(merged_junction);
            processed[close_by] = true;
        }
    }

    return merged_junctions;
}

/**
 * 计算像素点之间的累积距离。
 * 
 * @param {Array} pixels 像素点空间坐标列表
 * @returns {Array} 累积距离列表
 */
function _calculate_cumulative_distances(pixels) {
    const distances = [0];
    for (let i = 1; i < pixels.length; i++) {
        const distance = np.sqrt((pixels[i][0] - pixels[i - 1][0]) ** 2 + (pixels[i][1] - pixels[i - 1][1]) ** 2);
        distances.push(distances[distances.length - 1] + distance);
    }
    return distances;
}

/**
 * 根据每条边的插值点数生成插值点
 * 
 * @param {Array} node1 起始节点空间坐标
 * @param {Array} node2 终止节点空间坐标
 * @param {number} num_points 插值点数
 * @returns {Array} 插值点空间坐标
 */
function _interpolate_points_by_num_of_points(node1, node2, num_points) {
    const t = np.linspace(1, num_points, num_points) / (num_points + 1);
    const interpolated_points = node1 + t.map(ti => ti * (node2 - node1));
    return interpolated_points;
}

/**
 * 根据每条边的插值距离生成线性插值点空间坐标列表
 * 
 * @param {Array} node1 起始节点空间坐标
 * @param {Array} node2 终止节点空间坐标
 * @param {number} interpolate_distance 插值距离
 * @returns {Array} 插值点空间坐标
 */
function _interpolate_points_by_linear_distance(node1, node2, interpolate_distance) {
    const length = np.linalg.norm(node2 - node1);
    const num_points = Math.floor(length / interpolate_distance);
    const t = np.linspace(0, 1, num_points + 2).slice(1, -1);
    const interpolated_points = node1 + t.map(ti => ti * (node2 - node1));
    return interpolated_points;
}

/**
 * 沿着给定的像素路径生成插值点空间坐标列表。
 * 
 * @param {Array} pixels 像素点空间坐标列表
 * @param {number} distance 插值距离
 * @returns {Array} 插值点空间坐标列表
 */
function _interpolate_points_along_pixels_path(pixels, distance) {
    if (!pixels || pixels.length < 2) {
        return [];
    }

    const cumulative_distances = _calculate_cumulative_distances(pixels);
    const total_distance = cumulative_distances[cumulative_distances.length - 1];
    const remainder = total_distance % distance;
    const num_points = Math.floor(total_distance / distance);
    const adjusted_distance = distance + remainder / num_points;

    const interpolated_points = [];
    for (let i = 1; i < num_points; i++) {
        const target_distance = i * adjusted_distance;
        for (let j = 1; j < cumulative_distances.length; j++) {
            if (cumulative_distances[j] >= target_distance) {
                const ratio = (target_distance - cumulative_distances[j - 1]) / (cumulative_distances[j] - cumulative_distances[j - 1]);
                const x = pixels[j - 1][0] + ratio * (pixels[j][0] - pixels[j - 1][0]);
                const y = pixels[j - 1][1] + ratio * (pixels[j][1] - pixels[j - 1][1]);
                interpolated_points.push([x, y]);
                break;
            }
        }
    }
    return interpolated_points;
}
