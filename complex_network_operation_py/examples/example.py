from pathlib import Path
import json

import networkx as nx
import numpy as np
from complex_network_operation_py.functions.fun_generate_points import generate_points
from complex_network_operation_py.functions.fun_generate_networks import generate_network
from complex_network_operation_py.utils.tools import Tools

# %%
# 参数设置
# N_cities = 16
# N_city_nodes = 16
set_world_circle_radius = 500
set_world_circle_density_distance = 250
set_world_city_num_interpolated_density_distance = 10.0
set_city_circle_radius = 50
set_city_nodes_density_distance = 25
set_num_interpolated_density_distance = 1.0

# %% md
# 生成各城市节点位置和城市间交通网络

# %%
from complex_network_operation_py.functions.fun_generate_points import generate_points
from complex_network_operation_py.functions.fun_generate_roads_map import generate_roadsNetwork_by_machanism

# %%
# 生成各城市节点位置
city_nodes_pos = generate_points(
    set_densityDistance=set_world_circle_density_distance,
    set_numPoints=None,
    set_circleRadius=set_world_circle_radius,
    circle_origin=np.array([0, 0]),
    distribution='Posssion Disk'
)

# 生成城市间交通顶级网络
g_world_city_traffic_network, city_networks_interpolated_points = generate_roadsNetwork_by_machanism(
    nodes_pos=city_nodes_pos,
    set_num_interpolated_density_distance=set_world_city_num_interpolated_density_distance,
    is_preview_plot=False
)

# def convert_ndarray_to_list(data):
#     if isinstance(data, dict):
#         return {key: convert_ndarray_to_list(value) for key, value in data.items()}
#     elif isinstance(data, list):
#         return [convert_ndarray_to_list(element) for element in data]
#     elif isinstance(data, np.ndarray):
#         return data.tolist()
#     else:
#         return data

# Convert the network to a dictionary suitable for JSON serialization
network_data = nx.node_link_data(g_world_city_traffic_network, edges="links")

# # Recursively convert numpy arrays to lists for JSON serialization
# network_data = convert_ndarray_to_list(network_data)


# 保存生成的网络数据。保存的数据要能够用js的网络库加载。
# 直接保存为json文件，然后用js加载。
folderpath_project = Path(Tools.get_project_rootpath('ComplexNetworkOperation', '.')).resolve()
filepath_output_data = folderpath_project / 'data/道路交通网络地图' / 'road_network_map.json'
filepath_output_data.parent.mkdir(parents=True, exist_ok=True)
with open(filepath_output_data, 'w') as f:
    json.dump(network_data, f, indent=4)
