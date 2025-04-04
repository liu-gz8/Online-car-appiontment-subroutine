const cloud = require('wx-server-sdk');
const axios = require('axios');
cloud.init();

// 获取开发者小程序的 appid 和 secret
const appid = 'wx6af250640b01bc9a';  // 请替换为你的微信小程序 AppID
const secret = 'def0613b82f1a381ee6dd33b1a039d60';  // 请替换为你的微信小程序 AppSecret

exports.main = async (event, context) => {
  const { code } = event;

  // 调用微信接口获取手机号
  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=ACCESS_TOKEN`;

  try {
    // 使用 code 换取手机号
    const response = await axios.post(url, {
      code: code,
    });

    if (response.data.phoneNumber) {
      return {
        phoneNumber: response.data.phoneNumber,
      };
    } else {
      return {
        message: '获取手机号失败',
      };
    }
  } catch (error) {
    console.error('调用微信接口失败:', error);
    return {
      message: '调用微信接口失败',
    };
  }
};
