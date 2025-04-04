const axios = require('axios');

exports.main = async (event, context) => {
  if (!event.code) {
    return {
      code: 400,
      message: 'Missing code',
    };
  }

  const code = event.code;
  const appid = 'wx6af250640b01bc9a';  // 请替换为你的微信 appid
  const secret = 'def0613b82f1a381ee6dd33b1a039d60';  // 请替换为你的微信 app secret
  
  try {
	  
    // 向微信的接口发送请求获取 session_key 和 openid
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: appid,
        secret: secret,
        js_code: event.code,  //微信小程序必要参数
        grant_type: 'authorization_code',
      },
    });
    console.log('WeChat API response:', response.data);  // 打印响应内容

    // 检查返回的数据是否包含 session_key 和 openid
    if (response.data && response.data.session_key && response.data.openid) {
      return {
        code: 200,
        session_key: response.data.session_key,
        openid: response.data.openid,
      };
    } else {
      return {
        code: 500,
        message: 'Failed to get session_key and openid from WeChat',
      };
    }
	
  } catch (err) {
    console.error('Error occurred while fetching access token from WeChat:', err);  // 输出详细的错误日志
    return {
      code: 500,
      message: `Error: ${err.message}`,
    };
  }
};
