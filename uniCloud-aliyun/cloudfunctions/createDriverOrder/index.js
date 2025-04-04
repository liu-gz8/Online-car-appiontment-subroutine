'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  const { driverId, orderId, driverLocation, route, distance } = event;

  try {
    const res = await db.collection('driver_orders').add({
      driverId,
      orderId,
      driverLocation,
      route,
      distance
    });
    
    return {
      code: 200,
      message: '数据插入成功',
      data: res
    };
  } catch (error) {
    return {
      code: 500,
      message: '数据插入失败',
      error: error.message
    };
  }
};
