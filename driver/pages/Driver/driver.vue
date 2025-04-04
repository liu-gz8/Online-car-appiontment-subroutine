<template>
	<view>
		<view>
			<map
				class="map" 
				@regionchange="moveMovie"
				:polyline="polyline" 
				:longitude="longitude" 
				:latitude="latitude" 
				:markers="covers" 
				style="width: 100%; height: 800rpx; position: relative; left: 0rpx; top: 0rpx; display: block; box-sizing: border-box;">
			</map>
		</view>

			<!-- 司机状态切换 -->
			<view class="status-switch">
				<picker mode="selector" :range="statusOptions" @change="changeStatus">
					<text>当前模式: {{ currentStatus }}</text>
				</picker>
			</view>
			<!-- 订单列表 -->
			<view class="order-list">
				<view v-for="order in orders" :key="order._id" class="order-item">
					<text>订单号: {{ order.orderId }}</text>
					<text>起点: {{ order.startLocation.address }}</text>
					<text>终点: {{ order.endLocation.address }}</text>
					<text>距离: {{ order.distance }} km</text>
					<button @tap="acceptOrder(order)"
					:disabled="currentStatus !== '抢单模式'" 
					class="accept-button"
					>接单 - ￥{{ order.price }}</button>
				</view>
			</view>
	</view>
</template>

<script>
	const db = uniCloud.databaseForJQL(); // 连接数据库

	export default {
		data() {
			return {
				driver_phone:'',
				driver_mark:4.0,
				order_id : '',
				latitude: null, //司机位置
				longitude: null,
				openid_driver: '',
				currentStatus: '大厅模式',
				statusOptions: ['抢单模式', '大厅模式', '派单模式'],
				orders: [],
				driverData:{},
				covers: [{
					id: 1,
					latitude: '',
					longitude: '',
					width: 50,
					height: 50,
					iconPath: '../../../static/汽车俯视图.png'
				}]
			};
		},
		 async onLoad(options) {
			console.log(options);
			if (options.openid) {
				this.openid_driver = options.openid;
				
			}
			const res = await db.collection('User').where({
				mp_wx_openid: this.openid_driver}).get();
				
				
			await this.getDriverLocation();
			
			//console.log(res)
			const temp = {
			  latitude: this.latitude,  
			  longitude: this.longitude, 
			  status: '派单模式',  // 初始状态是派单模式
			  phoneNumber: res.data[0].phone,  // 司机手机号
			  rating: res.data[0].mark_driver,  // 初始评分 5.0，实际情况可能从其他地方获取
			  lastUpdated: new Date(),  // 设置为当前时间
			  openid: this.openid_driver,  // 司机的 openid
			  balance: res.data[0].balance,  // 账户余额
			};
			this.driverData = temp;
			
			this.fetchOrders_1();
			
			
			this.startOrderRefresh();
			
			this.updateDriverLocation();
		},
		methods: {
			
			// 定时刷新订单列表
				startOrderRefresh() {
					this.fetchOrders(); // 先立即刷新一次订单
					this.orderRefreshInterval = setInterval(() => {
						this.fetchOrders(); // 每3秒刷新一次订单
					}, 3000);
				},
			
			// 停止定时器
			stopOrderRefresh() {
				if (this.orderRefreshInterval) {
					clearInterval(this.orderRefreshInterval);
				}
			},
			
		   async changeStatus(e) {
				this.currentStatus = this.statusOptions[e.detail.value];
				this.updateDriverLocation();  //上传司机位置
				if (this.currentStatus === '抢单模式') {
					this.fetchOrders();
					this.deleteDriverStatus();
				} else if (this.currentStatus === '派单模式') {
					const res = await db.collection('driver_state').where({
						openid: this.openid_driver
					}).get();
					if(res.data.length == 0)
					{this.addDriverLocation();}
					this.dispatchOrder();
				}else if(this.currentStatus === '大厅模式')
				{
					this.deleteDriverStatus();
					this.fetchOrders();
				}
			},
			async deleteDriverStatus(){//删除非派单司机的状态表
				await db.collection('driver_state').where({
					openid: this.openid_driver,
				}).remove();
			},
			
			getDriverLocation() {
				uni.getLocation({
					type: 'gcj02', // 使用gcj02坐标系获取司机位置
					success: (res) => {
						this.latitude = res.latitude;
						this.longitude = res.longitude;
						this.driverData.latitude = res.latitude;
						this.driverData.longitude = res.longitude;
						this.driverData.rating = res.mark_driver;
						this.covers[0].latitude = res.latitude;
						this.covers[0].longitude = res.longitude;
						this.updateDriverLocation();
					}
				});
			},
			async updateDriverLocation() {
			  if (this.currentStatus === '派单模式') {
			    const res = await db.collection('driver_state').where({
			      openid: this.openid_driver
			    }).update({
			      latitude: this.latitude,
			      longitude: this.longitude,
			      status: this.currentStatus,
			      lastUpdated: new Date()  
			    });
			  }
			},
			
			async addDriverLocation() {
			  try {
			    const res = await db.collection('driver_state').add(this.driverData);
			    console.log('创建成功:', res);
			  } catch (error) {
			    console.error('创建失败:', error);
			  }
			},
			
			//派单模式逻辑函数
			async dispatchOrder() {
				
				const res = await db.collection('orders').where({status : "未接单",state : 0}).get();
				this.order_id = res.data[0].orderId
				console.log(res)
				
			  const userLocation = { lat: res.data[0].startLocation.latitude, lng: res.data[0].startLocation.longitude };
			
			  try {
			    // 获取所有 "派单模式" 司机
			    const driversRes = await db.collection('driver_state').where({ status: '派单模式' }).get();
			    const driverLocations = driversRes.data.map(driver => ({
			      openid: driver.openid,
			      lat: driver.latitude,
			      lng: driver.longitude
			    }));
			
			    if (driverLocations.length === 0) {
					
			      uni.showToast({ title: '当前没有可用司机', icon: 'none' });
			      return;
			    }
			
			    // 调用云函数获取最近司机排序
			    const cloudRes = await uniCloud.callFunction({
			      name: 'MinDistance',
			      data: {
			        userLat: userLocation.lat,
			        userLng: userLocation.lng,
			        driverLocations,
			        key: 'F6LBZ-ICQC5-ILQII-IEL6G-HGBI2-YTB4A'
			      }
			    });
			
			    if (cloudRes.result.code === 200) {
			      console.log('最近的司机排序结果:', cloudRes.result.sortedOpenids);
			      this.assignOrder(cloudRes.result.sortedOpenids);
				  
			    } else {
			      uni.showToast({ title: cloudRes.result.message, icon: 'none' });
			    }
			  } catch (error) {
			    console.error('派单失败:', error);
			    uni.showToast({ title: '派单失败，请重试', icon: 'none' });
			  }
			},
			
			
			//获取司机后派单处理
			async assignOrder(sortedOpenids, index = 0) {
			  if (index >= sortedOpenids.length) {
			    // 所有司机拒绝，将订单放入抢单大厅
				//const temp = await db.collection('orders').where({orderId:this.order_id}).get();
				//console.log(temp)
			    await db.collection('orders').where({orderId:this.order_id}).update({
			      status: '未接单',
				  state: 1
			    });
			    uni.showToast({ title: '无人接单，存入抢单大厅', icon: 'none' });
			    return;
			  }
			
			  const driverOpenid = sortedOpenids[index];
			
			  // 发送弹窗给当前司机
			  const confirmRes = await uni.showModal({
			    title: '派单通知',
			    content: '您有新的订单，是否接单？',
			    confirmText: '接单',
			    cancelText: '拒绝'
			  });
			console.log(confirmRes)
			  if (confirmRes[1].confirm) {
			    // 司机接受订单
			    await db.collection('orders').where({orderId:this.order_id}).update({
			      status: '已接单',
				  state: 1,
			      driverId: this.openid_driver
			    });
			
			    uni.navigateTo({
			      url: `working?did=${this.openid_driver}`
			    });
			  } else {
				  const t = await db.collection('User').where({mp_wx_openid: this.openid_driver}).get();
				  const mark_d = t.data[0].mark_driver;
			    // 司机拒绝，扣除评分 0.03 分
			    await db.collection('User').where({ openid: this.openid_driver }).update({
			      mark_driver: mark_d - 0.03
			    });
				
				await db.collection('driver_state').where({ openid: this.openid_driver }).update({
				  rating: mark_d - 0.03
				});
			
			    // 继续给下一个司机派单
			    this.assignOrder(sortedOpenids, index + 1);
			  }
			},
			// 获取数据库中的未接单订单信息（抢单模式逻辑函数）
			async fetchOrders() {
				
				const res = await db.collection('orders').where({status : "未接单",state : 1}).get();
				this.orders = res.data;
			},

			// 获取是否有未完成订单
			async fetchOrders_1() {
				const res = await db.collection('orders').where(
				{
					status: db.command.in(["已接单", "运输中"]),
					driverId: this.openid_driver
					
				}
				).get();
				console.log(res)
				if (res.data.length > 0) {
					
						//console.log(res.data[0]);
						wx.navigateTo({
							url:`working?did=${this.openid_driver}`
							//url: `working?order=${encodeURIComponent(JSON.stringify(order))}`//&cover=${encodeURIComponent(JSON.stringify(this.covers[0]))}
						});
					
				}
			},

			// 司机接单
			async acceptOrder(order) {
				if (!order._id) {
					uni.showToast({ title: '订单ID无效', icon: 'none' });
					return;
				}
				
				this.order_id = order.orderId;
				
				const res = await db.collection('orders').where({orderId:this.order_id}).update({
					status: '已接单',
					driverId: this.openid_driver // 这里应该使用司机的唯一ID
				});
				if (res.updated > 0) {
					uni.showToast({ title: '接单成功', icon: 'success' });
					this.fetchOrders(); // 刷新订单列表
					
					wx.setStorageSync("order", order)
					console.log(wx.getStorageSync("order"))
					
					wx.navigateTo({
						url:`working?did=${this.openid_driver}`
						//url: `working?order=${encodeURIComponent(JSON.stringify(order))}`//&cover=${encodeURIComponent(JSON.stringify(this.covers[0]))}
					});
				} else {
					uni.showToast({ title: '接单失败', icon: 'none' });
				}
			},

			// 调整视野
			moveMovie() {
				uni.getLocation({
					isHighAccuracy: true, // 高精度
					success: (res) => {
						this.latitude = res.latitude;
						this.longitude = res.longitude;
					}
				});
			}
		}
	};
</script>

<style>
	/* 整体页面 */
	.view {
		padding: 20px;
		background-color: #f8f8f8;
	}

	/* 地图样式 */
	.map {
		width: 100%;
		height: 800rpx;
		border-radius: 10px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 20px;
	}

	/* 司机状态切换 */
	.status-switch {
		background-color: #fff;
		padding: 15px;
		border-radius: 10px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 20px;
	}

	.status-switch picker {
		width: 100%;
	}

	.status-switch text {
		font-size: 16px;
		font-weight: bold;
		color: #333;
	}

	/* 订单列表 */
	.order-list {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	/* 订单项 */
	.order-item {
		background-color: #fff;
		padding: 15px;
		border-radius: 10px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e0e0e0;
		transition: all 0.3s ease;
	}

	/* 订单项悬浮效果 */
	.order-item:hover {
		transform: translateY(-5px);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
	}

	/* 订单内容 */
	.order-item text {
		display: block;
		font-size: 14px;
		color: #555;
		margin-bottom: 8px;
	}

	/* 接单按钮 */
	.order-item button {
		width: 100%;
		padding: 12px;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 5px;
		font-size: 16px;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	.order-item button:hover {
		background-color: #0056b3;
	}

	/* 按钮文字 */
	.order-item button:active {
		background-color: #003c82;
	}
	/* 接单按钮 */
	.accept-button {
		width: 100%;
		padding: 12px;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 5px;
		font-size: 16px;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}
	
	/* 禁用状态的按钮 */
	.accept-button:disabled {
		background-color: #d6d6d6;
		cursor: not-allowed;
	}

	
</style>

