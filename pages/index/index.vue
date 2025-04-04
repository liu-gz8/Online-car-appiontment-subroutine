<template>
		<view>
			<uni-search-bar placeholder="起始位置" v-model="startLocation.address" @focus="focus1"></uni-search-bar>
			<uni-search-bar placeholder="终点位置" v-model="endLocation.address" @focus="focus2"></uni-search-bar>
			<map 
			  class="map" 
			  @regionchange = "moveMovie"
			  :polyline="polyline" 
			  :longitude="longitude" 
			  :latitude="latitude" 
			  :markers="covers" 
			  style="width: 100%; height: 800rpx; position: relative; left: 0rpx; top: 0rpx; display: block; box-sizing: border-box;">
			  </map>
			<view> 
				<text>{{ address }}</text>
				<text class="location-info">{{ '\n' }}维度: {{ latitude }}</text>
				<text class="location-info">{{ '\n' }}精度: {{ longitude }}</text>
				<text>1.00</text>
			</view>
			<button 
			style="position: relative; left: 0rpx; top: -2rpx; width: 750rpx; display: inline-block; box-sizing: border-box; height: 92rpx"
			size="mini" 
			@tap="buttonDriving">导航</button>
	</view>
</template>

<script>
	var startLocationName ="选择起点"
	var endLocationName = '选择终点'
	let cachedRoute = null
	const app = getApp()
	const db = uniCloud.databaseForJQL(); // 连接数据库
	
	export default {
		data() {
			return {
				address:'',
				id:0, // 使用 marker点击事件 需要填写id
				title: 'map',
				latitude: '',
				longitude: '',
				
				
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
					id:1,  //用户位置
					latitude: '',
					longitude: '',
					width:50,
					height:50,
					iconPath: '../../static/startlocation.png'
				},
				{
					id:2,//司机位置
					latitude: '',
					longitude:  '',
					width:50,
					height:50,
					iconPath: '../../static/endlocation.png'
				},],

				polyline:[] //保存绘制路线
			}
		},
		
		onLoad(){
			
			uni.getLocation({
				type: 'gcj02', // 使用gcj02坐标系获取用户位
				isHighAccuracy : true, //高精度
				success:(res) =>{
					console.log(res)
					this.latitude = res.latitude
					this.longitude = res.longitude
					this.covers[0].latitude = res.latitude
					this.covers[0].longitude = res.longitude
				}
			})
			
		},
		
		methods: {
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
							   // console.log("终点位置:", this.endLocation);
								
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
			//计算驾车路线  化路线
			buttonDriving() {
			      const { startLocation, endLocation } = this; // 获取起点和终点位置
			
			      // 检查是否有缓存的路线，避免重复请求
			      if (cachedRoute && cachedRoute.start.latitude === startLocation.latitude && cachedRoute.start.longitude === startLocation.longitude && cachedRoute.end.latitude === endLocation.latitude && cachedRoute.end.longitude === endLocation.longitude) {
			        console.log('使用缓存的路线');
			        this.polyline = cachedRoute.polyline; // 直接修改组件的属性
			        return;
			      }
			
			      // 发起API请求
			      wx.request({
			        url: `https://apis.map.qq.com/ws/direction/v1/driving/?key=F6LBZ-ICQC5-ILQII-IEL6G-HGBI2-YTB4A&from=${startLocation.latitude},${startLocation.longitude}&to=${endLocation.latitude},${endLocation.longitude}`,
			        success: (res) => {
			          const result = res.data.result;
			          if (!result || !result.routes || result.routes.length === 0) {
			            console.log('未能获取到路线信息');
			            return;
			          }
			//console.log(result.routes[0].distance)
			          const route = result.routes[0];  // 获取路线
			          let coors = route.polyline, pl = [];
					  console.log(coors)
			          const kr = 1000000;
			
			          // 解压坐标（将压缩的坐标解压为原始坐标）
			          for (let i = 2; i < coors.length; i++) {
			            coors[i] = Number(coors[i - 2]) + Number(coors[i]) / kr;
			          }
			
			          // 将解压后的坐标放入点串数组pl中
			          for (let i = 0; i < coors.length; i += 2) {
			            pl.push({ latitude: coors[i], longitude: coors[i + 1] });
			          }
			          // 直接修改组件的数据属性
			          this.latitude = pl[0].latitude;
			          this.longitude = pl[0].longitude;
			          this.polyline = [{
			            points: pl,
			            color: '#58c16c',
			            width: 8,
			            borderColor: '#2f693c',
			            borderWidth: 1,
						arrowLine: true  //路线箭头属性
			          }]; 
					  // 更新标记（起点和终点）
					this.covers[0].latitude = startLocation.latitude;
					this.covers[0].longitude = startLocation.longitude;
					this.covers[1].latitude = endLocation.latitude;
					this.covers[1].longitude = endLocation.longitude;
					  
					// 更新地图视野，设置地图中心为路线的起点
					this.longitude = pl[0].longitude;
					this.latitude = pl[0].latitude;
			        },
			        fail: (err) => {
			          console.log('请求失败:', err);
			        },
					
			      });
			    }
			  },
	}
</script>

<style>
	.container {
		padding: 20px;
		font-size: 14px;
		line-height: 24px;
	}
</style>

<style lang="scss">
.u-tabbar{
	position: fixed;
	bottom: 0;
	z-index: 9999;
	width: 100%;
}
</style>
