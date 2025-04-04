'use strict';

const db = uniCloud.database(); // 连接数据库
const axios = require('axios');

exports.main = async (event, context) => {
  try {
    // 获取用户上传的起点、终点、乘客ID
    console.log(event);
    const { startLocation, endLocation, passengerId } = event;

    // 校验参数是否完整
    if (!startLocation || !endLocation || !passengerId) {
      return { success: false, message: "缺少必要参数" };
    }

    // 生成订单编号（时间戳 + 随机数）
    const orderId = `OD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // 获取订单价格和距离
    const { price, distance } = await getPrice(startLocation, endLocation); // 调用异步方法获取价格和距离

    // 获取当前时间戳
    const timestamp = Date.now();

    // 创建订单对象
    const orderData = {
      orderId,
      startLocation,
      endLocation,
      passengerId,
      status: "未接单", // 初始状态
      price,
	  state:0,
      distance, // 添加距离信息
      timestamp, // 添加时间戳
      createdAt: new Date().toISOString() // 记录创建时间
    };

    // 将订单存入数据库
    const res = await db.collection('orders').add(orderData);

    // 返回成功信息
    if (res.id) {
      return { success: true, message: "订单创建成功", orderId };
    } else {
      return { success: false, message: "订单创建失败" };
    }
  } catch (error) {
    console.error("订单创建失败:", error);
    return { success: false, message: "服务器错误" };
  }
};

// 获取订单价格和距离的异步函数
async function getPrice(startLocation, endLocation) {
  try {
    const response = await axios.get('https://apis.map.qq.com/ws/direction/v1/driving/', {
      params: {
        key: "F6LBZ-ICQC5-ILQII-IEL6G-HGBI2-YTB4A",
        from: `${startLocation.latitude},${startLocation.longitude}`,
        to: `${endLocation.latitude},${endLocation.longitude}`,
      }
    });

    if (response.data.status === 0) {
      // 获取距离（单位：米）
      const distance = response.data.result.routes[0].distance;
      // 计算价格，单位为元（假设每公里收费3元）
	  const temp = distance /1000.0;
      const price = temp * 3.0;
      return {
        price: parseFloat(price), // 返回价格（元）
        distance: temp.toFixed(2) // 返回距离（米）
      };
    } else {
      throw new Error("获取价格失败");
    }
  } catch (error) {
    console.error("获取价格失败:", error);
    throw error;
  }
}
