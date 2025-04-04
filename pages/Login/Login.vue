<template>
  <view>
    <!-- 头像上传按钮 -->
    <view class="touxiang">
      <button
        v-if="loginstate === 1"
        class="touxiang" 
        open-type="chooseAvatar" 
        @chooseavatar="changeUserHead" 
        plain="true" 
        :style="{ backgroundImage: 'url(' + touxiangUrl + ')' }"
        style="border: 0; background-position: center; background-size: cover"
      ></button>
    </view>

    <view class="gerenxinxi" v-if="loginstate === 1">
      <text class="username">{{ userNickName }}</text>
    </view>

    <view class="sijibutton" v-if="loginstate === 1">
      <button class="sijianjian" @tap="sijijianyan">我是司机</button>
      <button class="chengkejian" @tap="chengkeanjian">我是乘客</button>
    </view>

    <!-- 用户昵称输入框 -->
    <view class="nicheng">
      <input 
	  class="input"
        v-if="loginstate === 3"
        type="nickname"   
        placeholder="点击修改昵称"
        v-model="userNickName"
      />
    </view>

    <view class="denglujian">
      <button 
        v-if="loginstate === 0"
        @tap="weixinLogin"
      >
        微信一键授权登录
      </button>
    </view>
  </view>
</template>

<script>
	const db = uniCloud.databaseForJQL() //获取数据库
	
	export default {
	  data() {
	    return {
	      touxiangUrl: '/static/默认头像.png',  // 默认头像
	      loginstate: 0,  // 0为未登录，1为已登录
	      userNickName: '',  // 用户昵称
	      code: '',  // 登录凭证
	      userInfo: {},
		  Identity : 0,
		  openid_1:''
	    };
	  },
	  onLoad(option) {
		  //console.log(option)
		  //)		  this.openid_1 = option
		  const res = db.collection('User').where({mp_wx_openid :this.userInfo.openid }).get()
		  if(res.data && res.data.length>0)
		  {
			  this.loginstate=1
		  }
		  else{
			  this.loginstate=0
		  }
		  
	  	
	  },
	  methods: {
		  chengkeanjian(){
			  //console.log(this.openid_1)
			  wx.navigateTo({
				  
			  	url: `../../coustom/pages/index/index?openid=${this.openid_1}`
			  })
		  },
		  sijijianyan()
		  {
			  if(this.Identity==2)
			  {
				  //console.log(this.openid_1)
				  uni.showModal({
				          title: "验证成功？",
						  content: "是否前往接单？",
						  success: async (res) => {
						    if (res.confirm) {
						      wx.navigateTo({
							  url: `../../driver/pages/Driver/driver?openid=${this.openid_1}`
						  })
						    }
						  }
						  })
						  
			  }
			  else 
			  {
				  uni.showModal({
				          title: "检测您不是司机！",
				          content: "是否要成为司机？",
				          success: async (res) => {
				            if (res.confirm) {
				              await this.updateUserIdentity();
				            }
				          }
				        });
			  }
		  },
		  
		  async updateUserIdentity() {
		        try {
		          await db.collection("User").where({ mp_wx_openid: this.openid }).update({
		            identity: 2,

		          });
				this.Identity = 2
		          uni.showToast({
		            title: "身份更新成功！",
		            icon: "success"
		          });
		        } catch (error) {
		          uni.showToast({
		            title: "更新失败，请重试！",
		            icon: "error"
		          });
		          console.error("更新失败", error);
		        }
		      },
		    
		// 处理头像上传
		changeUserHead(e) {
		  const { avatarUrl } = e.detail
		  this.touxiangUrl = avatarUrl
		  // 这里需要添加上传到服务器的逻辑
		},
	  
	// 微信登录及获取用户信息的统一函数
	async weixinLogin() {
		  try {
			uni.showLoading({ title: '正在登录...' });
			// 获取登录凭证
			const loginRes = await this.getLogin();
			//console.log('loginRes:', loginRes); // 检查登录凭证是否获取成功
		
			const code = loginRes.code;  // 获取到的code
			if (!code) {
			  throw new Error('获取 code 失败');
			}
		
			// 获取用户信息（检查授权）
			const userInfo = await this.getUserInfo();
		
			// 调用云函数获取 session_key 和 openid
			const response = await uniCloud.callFunction({
			  name: 'getUserInfo',
			  data: { code },
			});
			//console.log('cloud function response:', response); // 打印云函数响应
		
			const { session_key, openid } = response.result;
			this.openid_1 = response.result.openid
			if (!session_key || !openid) {
			  throw new Error('获取 session_key 或 openid 失败');
			}
			
			
			// 合并用户信息和登录结果
			const data = { ...response.result, ...userInfo };
		
			// 存储信息到本地缓存
			uni.setStorageSync('userData', data);  // 存储用户信息
			uni.setStorageSync('session_key', session_key);  // 存储 session_key
			uni.setStorageSync('openid', openid);  // 存储 openid
		
			uni.hideLoading();
			
			
			const hasUser = await this.getmessage(openid); // 查询结果
			//console.log(hasUser)
			//查询用户注册状态
			if(!hasUser)
			{	
				//跳转注册界面
				uni.showToast({ title: '前往注册', icon: 'error' });
				wx.redirectTo({
					url: `register?openid=${openid}` // 关键修改
				})
			}else{
				uni.showToast({ title: '登陆成功', icon: 'success' });
				//查询数据库更新缓存
				const collection = db.collection('User')
				let res = await collection.where({'mp_wx_openid': String(openid)} ).field({ identity: true, nickName: true ,avatarUrl: true}).get()
				//console.log(res)
				userInfo.avatarUrl= res.data[0].avatarUrl
				userInfo.nickName= res.data[0].nickName
				this.Identity = res.data[0].identity
				if(this.Identity==1)
				{
					wx.navigateTo({
						url: `../../coustom/pages/index/index?openid=${this.openid_1}`
					})
				}
				else
				{
					uni.showModal({
					        title: "检测您是司机！",
					        content: "是否要前往接单？",
					        success: async (res) => {
								if (res.confirm){
									wx.navigateTo({url:`../../driver/pages/Driver/driver?openid=${this.openid_1}`})
								}else{
									wx.navigateTo({url:`../../coustom/pages/index/index?openid=${this.openid_1}`})
								}
					        
					        }
					      });
					/*
					wx.reLaunch({
						url: '../../driver/pages/Driver/driver'
					})*/
				}
				//console.log(res.data[0])
				//console.log(this.Identity)
			}
			
		
			// 更新状态
			this.loginstate = 1;  // 登录成功后设置为 1，表示已登录
			this.userNickName = userInfo.nickName || '';  // 设置昵称
			this.touxiangUrl = userInfo.avatarUrl;  // 设置头像
		
		  } catch (err) {
			uni.hideLoading();
			console.error('登录失败:', err); // 打印错误信息
			uni.showToast({
			  icon: 'none',
			  title: err.message || '登录失败',
			});
		  }
		},
	        
		// 获取用户信息的合并逻辑
		getUserInfo() {
		    return new Promise((resolve, reject) => {
		      wx.getUserInfo({
		        withCredentials: true,
		        lang: 'zh_CN',
		        desc: '获取用户基本信息',
		        success: (res) => {
		          resolve(res.userInfo);
		          uni.setStorageSync('userInfo', res.userInfo);  // 将用户信息存储本地缓存
		        },
		        fail: (err) => {
		          reject(err);
		        },
		      });
		    });
		},
		
		

		// 获取登录凭证
		getLogin() {
		  return new Promise((resolve, reject) => {
			uni.login({
			  success: (res) => {
				resolve(res);
			  },
			  fail: (err) => {
				reject(err);
			  },
			});
		  });
		},
	
		
		//获取信息(openid查询)
		getmessage(oid){
		  return db.collection('User')
			.where({ mp_wx_openid: oid })
			.get()
			.then((res)=>{
			  // res 为数据库查询结果
			  //console.log(res)
			  return res.data && res.data.length > 0 ? true : false
			}).catch((err)=>{
				console.log(err.code); // 打印错误码
				console.log(err.message); // 打印错误内容
				return false
			})
		},
		
	},
	
}
</script>

<style scoped>
/* 调整头像上传按钮 */
.touxiang {
  width: 150rpx;
  height: 150rpx;
  margin: 20rpx auto;
  border-radius: 50%;
  overflow: hidden;
  border: 3rpx solid #fff;
  background-position: center;
  background-size: cover;
}

/* 用户昵称样式 */
.username {
  text-align: center;
  font-size: 24px;
  color: #333;
  margin-top: 15rpx;
}

/* 司机乘客身份按钮样式 */
.sijibutton {
  width: 80%;
  margin: 10rpx auto;
  display: flex;
  justify-content: space-between;
}

.sijianjian, .chengkejian {
  width: 48%;
  font-size: 18px;
  padding: 10rpx;
  border-radius: 30rpx;
  color: #fff;
}

.sijianjian {
  background-color: #03A9F4; /* 蓝色按钮 */
}

.chengkejian {
  background-color: #FF9800; /* 橙色按钮 */
}

/* 用户昵称输入框样式 */
.nicheng {
  text-align: center;
  width: 80%;
  margin: 20rpx auto;
}

input {
  width: 100%;
  height: 60rpx;
  text-align: center;
  line-height: 60rpx;
  font-size: 18px;
  background-color: #f5f5f5;
  border: 1rpx solid #ccc;
  border-radius: 30rpx;
  box-sizing: border-box;
}

input::placeholder {
  color: #888;
}

/* 登录按钮样式 */
.denglujian button {
  width: 100%;
  height: 60rpx;
  background-color: #4CAF50; /* 绿色按钮 */
  color: #fff;
  font-size: 18px;
  border: none;
  border-radius: 30rpx;
  margin-top: 20rpx;
  
  
  position: relative;
  left: 0px;
  top: 198px;
  height: 52px;
  display: block;
  box-sizing: border-box;
  width: 242px;
  cursor: pointer;
  
      
     
}
.gerenxinxi{
	text-align: center;
}
</style>