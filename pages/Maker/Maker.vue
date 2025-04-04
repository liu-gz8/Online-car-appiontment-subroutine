<template>
  <view class="container">
    <!-- 标题 -->
    <view class="title">
      <text>{{ isDriver ? '评价顾客' : '评价司机' }}</text>
    </view>

    <!-- 评分组件 -->
    <view class="rating">
      <text class="rating-title">请选择评分:</text>
      <view class="stars">
        <button 
          v-for="n in 6" 
          :key="n" 
          class="star" 
          :class="{'active': rating >= n}"
          @tap="setRating(n)"
        >
          ★
        </button>
      </view>
      <text class="rating-value">{{ rating }} 星</text>
    </view>

    <!-- 评论输入框 -->
    <view class="comment">
      <text class="comment-title">请输入评论（可选）:</text>
      <textarea
        class="comment-input"
        v-model="comment"
        placeholder="说点什么..."
      ></textarea>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-btn">
      <button @tap="submitReview" :disabled="!rating">提交评价</button>
    </view>
  </view>
</template>

<script>
const db = uniCloud.databaseForJQL(); // 连接数据库

export default {
  data() {
    return {
      openid: '',
      isDriver: false, // 控制身份，true为司机，false为顾客
      rating: 1, // 评分
      comment: '', // 评论内容
    };
  },
  onLoad(e) {
    console.log(e)
    this.isDriver = e.isDriver
    this.openid = e.openid
  },
  methods: {
    // 设置评分
    setRating(value) {
      this.rating = value;
    },
    // 提交评价
    async submitReview() {
      if (this.rating === 0) {
        uni.showToast({
          title: '请先选择评分',
          icon: 'none'
        });
        return;
      }

      try {
        // 上传评分
        if (!this.isDriver) {
          const res = await db.collection('User').where({ mp_wx_openid: this.openid }).get();
          const mark_e = res.data[0].mark_driver;
          await db.collection('User').where({ mp_wx_openid: this.openid }).update({
            mark_driver: (mark_e + this.rating) / 2.0
          });
        } else {
          const res = await db.collection('User').where({ mp_wx_openid: this.openid }).get();
          const mark_e = res.data[0].mark;
          await db.collection('User').where({ mp_wx_openid: this.openid }).update({
            mark: (mark_e + this.rating) / 2.0
          });
        }
        uni.showToast({
          title: '评价提交成功',
          icon: 'success'
        });
		wx.navigateBack({
			delta: 2
		})
      } catch (err) {
        console.error("提交评价失败:", err);
        uni.showToast({
          title: '提交失败，请稍后再试',
          icon: 'none'
        });
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 30rpx;
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.rating {
  margin-bottom: 20rpx;
}

.rating-title {
  font-size: 18px;
  margin-bottom: 10rpx;
}

.stars {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.star {
  font-size: 36px;
  color: #ccc;
}

.star.active {
  color: #FFD700;
}

.rating-value {
  font-size: 16px;
  text-align: center;
}

.comment {
  margin-bottom: 30rpx;
}

.comment-title {
  font-size: 18px;
  margin-bottom: 10rpx;
}

.comment-input {
  width: 100%;
  height: 150rpx;
  padding: 10rpx;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 10rpx;
  resize: none;
}

.submit-btn button {
  width: 100%;
  padding: 12rpx;
  background-color: #4CAF50;
  color: #fff;
  font-size: 18px;
  border: none;
  border-radius: 10rpx;
  cursor: pointer;
}

.submit-btn button:disabled {
  background-color: #ccc;
}
</style>