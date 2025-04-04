// 云函数入口文件
const axios = require('axios');

exports.main = async (event, context) => {
  const { userLat, userLng, driverLocations, key } = event;

  if (!userLat || !userLng || !driverLocations || driverLocations.length === 0) {
    return { code: 400, message: '参数不完整' };
  }

  if (driverLocations.length > 25) {
    return { code: 400, message: '最多支持25个司机位置' };
  }

  try {
    // 拼接司机坐标
    const to = driverLocations.map(d => `${d.lat},${d.lng}`).join(';');
    const from = `${userLat},${userLng}`;

    // 发起腾讯地图矩阵计算请求
    const response = await axios.get('https://apis.map.qq.com/ws/distance/v1/matrix', {
      params: {
        mode: 'driving',
        from,
        to,
        key
      }
    });

    if (response.data.status !== 0) {
      return { code: 500, message: response.data.message };
    }

    // 获取所有距离结果
    const distances = response.data.result.rows[0].elements;

    // 将司机及其距离存入数组
    const driverDistances = driverLocations.map((driver, index) => ({
      openid: driver.openid,
      distance: distances[index].distance
    }));

    // 按距离从近到远排序
    driverDistances.sort((a, b) => a.distance - b.distance);

    // 返回按距离从近到远的所有司机openid
    const sortedOpenids = driverDistances.map(driver => driver.openid);

    return {
      code: 200,
      message: '查询成功',
      sortedOpenids: sortedOpenids
    };

  } catch (error) {
    console.error('请求腾讯地图 API 失败:', error);
    return { code: 500, message: '内部服务器错误', error };
  }
};
