<template>
	<view>
		<map
			class="map"
			@regionchange="moveMovie"
			:polyline="polyline"
			:longitude="covers[0].longitude"
			:latitude="covers[0].latitude"
			:markers="covers"
			style="width: 100%; height: 800rpx; position: relative; left: 0rpx; top: 0rpx; display: block; box-sizing: border-box;">
		</map>

		<view class="user-info">
			<image :src="order.passengerAvatar" class="avatar" />
			<view class="info">
				<text class="name">
				  顾客：{{ user_name }} {{ user_sex ==='男'?" 先生":user_sex ==='女'?" 女士":''}}\n
				</text>
				<text class="phone">顾客手机：{{ maskedPhone }}\n</text>
				<text class="rating">顾客评分：{{ user_mark.toFixed(1) }}\n</text>
				<text class="rating">运输状态：{{ order.status=="运输中"?"正在前往目的地！":order.status=="已接单"?"正在接乘客中......":"" }}</text>
			</view>
		</view>

		<view class="order-info">
			<text>订单金额：￥{{ order.price }}</text>
			<text>付款方式：余额支付</text>
		</view>


		<view class="page-section">
			<view class="weui-cells__title">乘客验证：</view>
			<input
				class="weui-input"
				maxlength="4"
				placeholder="输入用户最后四位手机号:"
				v-model="userInput"
				:disabled="inputDisabled"
			/>
		</view>

		<view class="distance-info">
			<text>距离目的地：{{ distanceToDestination }} 米</text>
		</view>
	</view>
</template>

<script>
const db = uniCloud.databaseForJQL(); // 连接数据库

export default {
	data() {
		return {
			user_openid:'',
			inputDisabled: false,
			user_name: '',
			user_phone : '',
			user_sex : '',
			user_mark : 0,
			countNum :0,
			userInput: "",
			end_longitude: null,
			end_latitude: null,
			distanceToDestination: null,
			state: 0, // 0: 去起始点接客，1: 去终点送客 10 结束
			order: {}, // 存储订单信息
			covers: [
				{ id: 1, latitude: '', longitude: '', width: 25, height: 25, iconPath: '../../../static/汽车俯视图.png' },
				{ id: 2, latitude: '', longitude: '', width: 25, height: 25, iconPath: '../../../static/endlocation.png' }
			],
			polyline: []
		};
	},
	watch: {
		async userInput(value) {
			
			
			if (value.length === 4 && value === this.user_phone.slice(-4)) {
			  uni.showToast({ title: "已经接到乘客！", icon: "success" });
			  this.inputDisabled = true;
			  this.state = 1;
			  this.updateOrderStatus_1(this.order._id);
			  this.covers[1].latitude = this.end_latitude;
			  this.covers[1].longitude = this.end_longitude;
			} else {
			  uni.showToast({ title: "尾号错误！", icon: "error" });
			}

		}
	},
	computed: {
	  // 顾客手机号加密，只显示前三位
	  maskedPhone() {
	    return this.user_phone && this.user_phone.length === 11 
	      ? this.user_phone.replace(/(\d{3})\d{8}/, '$1****') 
	      : '';  // 确保手机号长度正确，如果不正确则返回空字符串
	  }
	},

	async onLoad(order) {
		await this.chaxunorder(order.did);
		this.updateDriverLocation();
		this.locationTimer = setInterval(() => this.updateDriverLocation(), 5000);
		const res = await db.collection('User').where({mp_wx_openid:this.order.passengerId}).get();
		console.log(order)
		this.user_mark = res.data[0].mark;
		this.user_sex = res.data[0].gender === 1 ? '男' : '女';
		this.user_phone = res.data[0].phone;
		this.user_name = res.data[0].nickName;
		this.user_openid = res.data[0].mp_wx_openid;
		//console.log(this.user_sex)
	},
	methods: {
		// 查询订单信息
		async chaxunorder(id) {
			const res = await db.collection('orders').where({ driverId: id, status: db.command.in(["已接单", "运输中"]) }).get();
			console.log(res)
			if (res.data.length > 0) {
				this.order = res.data[0];
				this.end_latitude = res.data[0].endLocation.latitude;
				this.end_longitude = res.data[0].endLocation.longitude;
				this.covers[1].latitude = res.data[0].startLocation.latitude;
				this.covers[1].longitude = res.data[0].startLocation.longitude;
				if(res.data[0].status =="运输中")
				this.inputDisabled = true;
				//console.log(this.covers[1].latitude)
			}
		},

		// 获取司机实时位置并更新地图
		async updateDriverLocation() {
			uni.getLocation({
				type: "gcj02",
				isHighAccuracy: true,
				success: (res) => {
					this.covers[0].latitude = res.latitude;
					this.covers[0].longitude = res.longitude;
					console.log(this.covers[1].latitude)
					this.gotoLocation(
						{ latitude: res.latitude, longitude: res.longitude },
						{ latitude: this.covers[1].latitude, longitude: this.covers[1].longitude }
					);
				},
				fail: (err) => console.error("获取位置失败", err)
			});
		},

		// 导航到目的地
		async gotoLocation(start, end) {
			console.log(end)
			wx.request({
				url: `https://apis.map.qq.com/ws/direction/v1/driving/`,
				data: { 
					key: "F6LBZ-ICQC5-ILQII-IEL6G-HGBI2-YTB4A",
					from: `${start.latitude},${start.longitude}`,
					to: `${end.latitude},${end.longitude}`,
				},
				success: (res) => {
					if (res.data.status !== 0) {
						console.error("腾讯地图 API 返回错误：", res.data);
						return;
					}

					const result = res.data.result;
					const route = result.routes[0];
					const coors = route.polyline;
					const kr = 1000000;
					let pl = [];

					for (let i = 2; i < coors.length; i++) {
						coors[i] = Number(coors[i - 2]) + Number(coors[i]) / kr;
					}

					for (let i = 0; i < coors.length; i += 2) {
						pl.push({ latitude: coors[i], longitude: coors[i + 1] });
					}

					this.covers[0].latitude = pl[0].latitude;
					this.covers[0].longitude = pl[0].longitude;
					this.polyline = [{
						points: pl,
						color: '#58c16c',
						width: 8,
						borderColor: '#2f693c',
						borderWidth: 1,
						arrowLine: true
					}];

					this.updateDriverLocationAndRoute(this.order.orderId, { latitude: this.covers[0].latitude, longitude: this.covers[0].longitude }, pl);

					if(this.countNum < 1)
					{
						this.countNum+=1
						console.log(this.order)
						let temp = this.order
						
						 this.createDriverOrder(temp.driverId,temp.orderId,{latitude:this.covers[0].latitude,longitude:this.covers[0].longitude},pl,route.distance)
					
					}

					this.distanceToDestination = route.distance;
					if (this.distanceToDestination <= 10 && this.state === 1) {
						this.state = 10;
						uni.showToast({ icon: 'success', title: "乘客已送达!" });
						this.pay();
						this.deleteOrder();
						this.updateOrderStatus(this.order._id);
						wx.navigateTo({
							url:`../../../pages/Maker/Maker?openid=${this.user_openid}&isDriver=false`
						})
					}
				},
				fail: (err) => console.error("请求腾讯地图 API 失败：", err),
			});
		},
		async deleteOrder()//删除临时订单
		{
			const res = await db.collection('driver_orders').where({ 
			orderId: this.order.orderId }).remove();
		},
		// 创建司机订单
		async createDriverOrder(driverId, orderId, driverLocation, route, distance) {
			const t = await db.collection('driver_orders').where({ orderId: this.order.orderId }).get();
			if(t.data.length <= 0){ //如果不存在订单才创建
			try {
				
				const res = await db.collection('driver_orders').add({ driverId, orderId, driverLocation, route, distance });
				console.log('接单成功！', res);
				uni.showToast({ title: "接单成功!！", icon: "success" });
			} catch (error) {
				console.error('数据插入失败:', error);
				uni.showToast({ title: "数据插入！", icon: "error" });
			}
			}
		},

		// 更新司机位置和路线
		async updateDriverLocationAndRoute(orderId, newLocation, pl,dis) {
			try {
				const res = await db.collection('driver_orders').where({ orderId: String(orderId) }).update({
					driverLocation: newLocation,
					route: pl,
					distanceToDestination: dis
				});
				console.log(res.updated > 0 ? '更新成功' : '没有记录被更新');
			} catch (error) {
				console.error('更新失败:', error);
			}
		},
		async pay(){//支付余额
			const userRes = await db.collection('User').where({ mp_wx_openid: this.order.passengerId }).get();
			const driverRes = await db.collection('User').where({ mp_wx_openid: this.order.driverId }).get();
			
			const userBalance = userRes.data[0].balance;
			const driverBalance = driverRes.data[0].balance;
			
			if (userBalance >= this.order.price) {
				// 扣除用户余额
				await db.collection('User').doc(userRes.data[0]._id).update({
					balance: userBalance - this.order.price
				});
				
				// 增加司机余额
				await db.collection('User').doc(driverRes.data[0]._id).update({
					balance: driverBalance + this.order.price
				});
			
			// 弹窗提示司机已收到金额
				uni.showToast({
					title: `您已收到 ￥${this.order.price}`,
					icon: 'success',
					duration: 2000
				});
				}
			
		},
		// 调整视野
		moveMovie() {
			uni.getLocation({
				isHighAccuracy: true,
				success: (res) => {
					this.latitude = res.latitude;
					this.longitude = res.longitude;
				}
			});
		},

		// 更新订单状态
		async updateOrderStatus(orderId) {
			await db.collection('orders').doc(orderId).update({ status: '已完成' });
		},
		async updateOrderStatus_1(orderId) {
			await db.collection('orders').doc(orderId).update({ status: '运输中' });
		}
	}
};
</script>
<style scoped>
/* 顶部地图容器 */
.map {
  width: 100%;
  height: 800rpx;
  position: relative;
  box-sizing: border-box;
}

/* 用户信息样式 */
.user-info {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 20rpx;
  background-color: #fff;
  border-radius: 10rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  object-fit: cover;
}

.info {
  flex-grow: 1;
}

.name {
  font-size: 22rpx;
  font-weight: bold;
  color: #333;
}

.phone, .rating {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

.rating {
  font-size: 22rpx;
  margin-top: 4rpx;
}

/* 订单信息样式 */
.order-info {
  background-color: #fff;
  padding: 20rpx;
  margin-top: 20rpx;
  border-radius: 10rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.order-info text {
  display: block;
  font-size: 26rpx;
  color: #333;
  margin-bottom: 10rpx;
}

/* 乘客验证区样式 */
.page-section {
  background-color: #fff;
  padding: 20rpx;
  margin-top: 20rpx;
  border-radius: 10rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.weui-input {
  width: 100%;
  padding: 10rpx;
  font-size: 28rpx;
  border: 1px solid #ccc;
  border-radius: 5rpx;
  margin-top: 10rpx;
  background-color: #f9f9f9;
}

.weui-input:focus {
  border-color: #58c16c;
}

/* 距离目的地信息样式 */
.distance-info {
  background-color: #fff;
  padding: 20rpx;
  margin-top: 20rpx;
  border-radius: 10rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.distance-info text {
  font-size: 24rpx;
  color: #666;
}

/* 弹窗提示样式 */
.uni-toast {
  border-radius: 8rpx;
  padding: 10rpx;
  font-size: 28rpx;
  color: #fff;
  background-color: #58c16c;
}

.uni-toast.error {
  background-color: #f44336;
}

/* 按钮样式 */
.button {
  background-color: #58c16c;
  color: #fff;
  padding: 12rpx 20rpx;
  border-radius: 5rpx;
  font-size: 28rpx;
  text-align: center;
  margin-top: 20rpx;
  cursor: pointer;
}

.button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

</style>
