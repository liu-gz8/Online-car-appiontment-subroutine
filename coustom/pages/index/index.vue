<template>
  <view class="container">
    <uni-search-bar v-if="!orderAccepted" placeholder="起始位置" v-model="startLocation.address" @focus="focus1"></uni-search-bar>
    <uni-search-bar v-if="!orderAccepted" placeholder="终点位置" v-model="endLocation.address" @focus="focus2"></uni-search-bar>

    <map 
      class="map" 
      @regionchange="moveMovie"
      :polyline="polyline" 
      :longitude="longitude" 
      :latitude="latitude" 
      :markers="covers">
    </map>

    <view v-if="orderAccepted" class="driver-info-card">
      <view class="info-title">司机信息</view>
      <view class="info-item">姓名：{{ driverInfo.name }}{{ driverInfo.gender ==='男'?" 先生":driverInfo.gender ==='女'?" 女士":''}}\n</view>
      <view class="info-item">手机号：{{ driverInfo.phone }}\n</view>
      <view class="info-item">评分：{{ driverInfo.rating }}\n</view>
      <view class="info-item">距离目的地：{{ driverInfo.distance }} m\n</view>
    </view>

    <button v-if="!orderAccepted" class="submit-btn" @tap="buttonDriving">打车</button>
	<button v-if="orderAccepted&&!isPaid" class="pay-btn" @tap="this.payOrder">立即支付-￥{{price}}</button>
  </view>
</template>
<script>
	
	import BottomTabBar from '../../../module/tab-bar/BottomTabBar.vue'
	
	
	
	
	var startLocationName ="选择起点"
	var endLocationName = '选择终点'
	let cachedRoute = null
	const app = getApp()
	
const db = uniCloud.databaseForJQL(); // 连接数据库
	
	export default {
		components: {
		  BottomTabBar
		},
		data() {
			return {
				jiedanstatus : 0,
				balance:null,
				price:'',
				driver_openid:'',
				address:'',
				id:0, // 使用 marker点击事件 需要填写id
				title: 'map',
				latitude: '',
				longitude: '',
				openid:'',
				status:0,
				
				startLocation: {
				        latitude: '',
				        longitude: '',
				        address: ''
				      },
					  
				endLocation:{
					latitude: '',
					longitude: '',
					address: ''
				},
				covers: [{
					id: 1, // 司机位置
					latitude: '',
					longitude: '',
					width: 50,
					height: 50,
					iconPath: '../../../static/汽车俯视图.png'
				},
				{
					id:2,
					latitude: '',
					longitude:  '',
					width:50,
					height:50,
					iconPath: '../../../static/endlocation.png'
				},
					],

				polyline:[] ,//保存绘制路线
				pl:[],
				orderid:'',
				isPaid: false, // 默认未支付
				orderAccepted: false,
				      driverInfo: {
				        name: '',
				        gender: '',
				        phone: '',
				        rating: '',
				        distance: ''
				      }
				
			}
		},
		
	async onLoad(e){
			//console.log(e.openid)
			this.openid = e.openid
			
			
			this.locationTimer = setInterval(() => {
				//循环获取终点数据caver【1】
				
				this.getUserLocation();
				//循环获取起点数据caver【0】
			  this.fetchDriverLocation();

				const res = db.collection('driver_orders')
					this.polyline = [{
			            points: this.pl,
			            color: '#58c16c',
			            width: 8,
			            borderColor: '#2f693c',
			            borderWidth: 1,
						arrowLine: true  //路线箭头属性
			          }]; 
					  this.$forceUpdate();

			}, 3000);
			
			
		},
		
		methods: {
			
			async payOrder() {
			  try {
			    const res = await new Promise((resolve) => {
			      uni.showModal({
			        title: '支付确认',
			        content: '确定要支付订单吗？',
			        success: resolve
			      });
			    });
			
			    if (res.confirm) {
					if(this.balance<this.price)
					{uni.showToast({
					  title: '余额不足',
					  icon: 'error'
					});}
			      await db.collection('User').where({
			        mp_wx_openid: this.driver_openid
			      }).update({
			        balance: this.balance - this.price
			      });
			
			      this.isPaid = true; // 支付成功后禁用按钮
			
			      uni.showToast({
			        title: '支付成功',
			        icon: 'success'
			      });
			      console.log('支付完成！');
			    } else {
			      console.log('取消支付');
			    }
			  } catch (error) {
			    console.error('支付失败:', error);
			  }
			},

			
			//循环获取用户/终点的位置
		async getUserLocation(){
				const res = await db.collection('orders')
				  .where({
				    passengerId: this.openid,
				    status: '运输中'  // 添加状态条件
				  })
				  .get();

					//无运输之前 地图显示用户和车
					//运输后，地图显示中带车和终点
					if(res.data.length>0)
					{
						//给终点位置定位
						this.covers[1].latitude = res.data[0].endLocation.latitude
						this.covers[1].longitude = res.data[0].endLocation.longitude
					}
					
				else{
					uni.getLocation({
					type: 'gcj02', // 使用gcj02坐标系获取用户位
					isHighAccuracy : true, //高精度
					success:(res) =>{
						//console.log(res
						//车位
						//this.covers[0].latitude = res.latitude
						//this.covers[0].longitude = res.longitude
						//我位
						this.covers[1].latitude = res.latitude
						this.covers[1].longitude = res.longitude
					}
				})
				}
				
			},
			
	async fetchDriverLocation() {
	  const res = await db.collection('orders')
	    .where({
	      passengerId: this.openid,
	      status: db.command.in(['已接单', '运输中'])
	    })
	    .get();
	
	  if (res.data.length > 0) {
		  if(this.jiedanstatus === 0)
		  {
			  uni.showToast({ title: "司机已接单!", icon: "success" });
			  this.jiedanstatus = 1;
		  }
	    this.orderid = res.data[0].orderId;
	    this.driver_openid = res.data[0].driverId;
		this.price = res.data[0].price;
	    // 获取司机订单数据
	    const les = await db.collection('driver_orders')
	      .where({ orderId: String(this.orderid) })
	      .get();
	
	    if (les.data.length > 0) {
			const t = await db.collection('User').where({
				mp_wx_openid: this.driver_openid
			}).get();
			this.balance = t.data[0].balance;
			this.orderAccepted = true;
			  this.driverInfo = { 
				name: t.data[0].nickName, 
				gender: t.data[0].gender===1?"男":data[0].gender===2?"女":'', 
				phone: t.data[0].phone, 
				rating: t.data[0].mark_driver, 
				distance: les.data[0].distance
			  };
			if(this.driverInfo.distance<=10)
			{
				uni.showToast({ title: "到达目的地!", icon: "success" });
				this.payOrder();
				wx.navigateTo({
					url:`../../../pages/Maker/Maker?openid=${this.driver_openid}&isDriver=true`
				})
			}
	
	      // 更新地图路线
		  console.log(les.data[0].route);
	      this.pl = les.data[0].route || [];
	
	      // 更新司机位置
		  console.log(les.data[0]);
	      this.covers[0].latitude = les.data[0].driverLocation.latitude;
	      this.covers[0].longitude = les.data[0].driverLocation.longitude;
		  
		  //获取司机位置
		  
		  
		  
		  
	    }
	  }
	},

			
			//获取用户起点位置
			focus1(){	
				uni.chooseLocation({
					success: (res) =>{ 
							this.startLocation ={
								latitude: res.latitude,
								longitude: res.longitude,
								address: res.address
							}
							    console.log("起点位置:", this.startLocation);
						},
				})
			},
			//查询重点位置并记录
			focus2(){
				uni.chooseLocation({
					success: (res) =>{ 
							this.endLocation ={
								latitude: res.latitude,
								longitude: res.longitude,
								address: res.address
							}
							    //console.log("终点位置:", this.endLocation);
								
						},
				})
			},
			//调整视野
			moveMovie(){
				uni.getLocation(
				{
					isHighAccuracy:true, //高精度
					success: (res) => {
						this.latitude = res.latitude;
						this.longitude = res.longitude;
					},
				})
			},
			//计算驾车路线并且上传订单
			buttonDriving() {
				  //调用云函数上传订单
				  console.log(this.openid)
				  uniCloud.callFunction({
				    name: 'creatOrderTable',
				    data: {
				      startLocation: this.startLocation,
				      endLocation: this.endLocation,
				      passengerId: this.openid
				    },
				    success(res) {
				      console.log("订单创建结果:", res.result);
				      if (res.result.success) {
				        uni.showToast({ title: "订单创建成功", icon: "success" });
				      } else {
				        uni.showToast({ title: res.result.message, icon: "none" });
				      }
				    },
				    fail(err) {
				      console.error("云函数调用失败:", err);
				    }
				  });
				  
				  wx.showLoading({
					  title: '正在为寻找附近的司机！',
				  })//调用loding窗口

			    },
	
	
	
	
	  }}
</script>

<style>
/* 全局容器样式 */
.container {
  padding: 16px;
  font-size: 16px;
  line-height: 24px;
  background-color: #f5f5f5;
}

/* 搜索框样式 */
.uni-search-bar {
  margin-bottom: 16px;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
}

/* 地图样式 */
.map {
  width: 100%;
  height: 400px;
  border-radius: 12px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

/* 司机信息卡片 */
.driver-info-card {
  background-color: #ffffff;
  padding: 20px;
  margin-top: 16px;
  border-radius: 16px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.info-title {
  font-size: 20px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 10px;
}

.info-item {
  font-size: 16px;
  color: #555555;
  margin-bottom: 8px;
}

/* 按钮样式 */
.submit-btn, .pay-btn {
  width: 100%;
  background-color: #007aff;
  color: white;
  font-size: 18px;
  padding: 14px;
  border-radius: 12px;
  text-align: center;
  margin-top: 16px;
  box-shadow: 0 6px 12px rgba(0, 122, 255, 0.2);
  transition: all 0.3s ease;
}

.submit-btn:active, .pay-btn:active {
  background-color: #005ecb;
  transform: scale(0.98);
}

.pay-btn {
  background-color: #34c759;
}

.pay-btn:active {
  background-color: #2ba346;
}

.pay-btn.disabled {
  background-color: #d0d0d0;
  color: #999;
  box-shadow: none;
}

/* 订单信息显示样式 */
.order-info {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-top: 12px;
}

.order-info .item {
  margin-bottom: 8px;
  color: #666;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

</style>
