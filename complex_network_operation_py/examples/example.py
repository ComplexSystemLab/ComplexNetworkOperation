import numpy as np
from complex_network_operation_py.functions.fun_generate_points import generate_points
from complex_network_operation_py.functions.fun_generate_networks import generate_network

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
    is_preview_plot=True
)