<template>
  <view class="register-container">
    <uni-forms 
      ref="registerForm" 
      :modelValue="formData" 
      :rules="formRules" 
      label-width="100px"
      validateTrigger="bind"
    >
      <!-- 头像上传 -->
      <uni-forms-item label="头像" name="avatarUrl">
        <button
          class="touxiang" 
          open-type="chooseAvatar" 
          @chooseavatar="changeUserHead" 
          plain 
          :style="{ backgroundImage: 'url(' + formData.avatarUrl + ')' }"
          style="border:0;background-size:cover;background-position:center"
        ></button>
      </uni-forms-item>

      <!-- 昵称输入 -->
      <uni-forms-item label="昵称" name="nickName">
        <uni-easyinput 
          v-model="formData.nickName" 
          placeholder="请输入昵称"
          type="nickname"
          @input="(val) => validateField('nickName')"
        />
      </uni-forms-item>

      <!-- 性别选择 -->
      <uni-forms-item label="性别" name="gender">
        <radio-group @change="changeGender">
          <label class="radio-label">
            <radio :value="1" /> 男
          </label>
          <label class="radio-label">
            <radio :value="2" /> 女
          </label>
        </radio-group>
      </uni-forms-item>

      <!-- 身份选择 -->
      <uni-forms-item label="身份" name="identity">
        <picker 
          mode="selector" 
          :range="identityOptions" 
          @change="onIdentityChange"
        >
          <view class="picker">{{ formData.identity || '请选择身份' }}</view>
        </picker>
      </uni-forms-item>

      <!-- 个性签名 -->
      <uni-forms-item label="个性签名" name="personalize">
        <textarea 
          v-model="formData.personalize" 
          placeholder="请输入个性签名"
          maxlength="50"
          @blur="validateField('personalize')"
        />
      </uni-forms-item>

      <!-- 手机号输入 -->
      <uni-forms-item label="手机号" name="phone">
        <uni-easyinput 
          v-model="formData.phone" 
          placeholder="请输入手机号"
          type="number"
          @input="(val) => validateField('phone')"
        />
      </uni-forms-item>

      <!-- 提交按钮 -->
      <button type="primary" @tap="submitForm" class="submit-btn">立即注册</button>
    </uni-forms>
  </view>
</template>

<script>
const db = uniCloud.databaseForJQL() // 获取数据库

export default {
  data() {
    return {
      formData: {
        avatarUrl: '../../static/默认头像.png',
        nickName: '',
        gender: null,
        identity: '',
        personalize: '',
        mp_wx_openid: '',
        phone: ''  // 添加手机号字段
      },
      identityOptions: ['用户', '司机'],
      
    };
  },
  onLoad(options) {
    // 接收来自登录页面的openid
    if(options.openid) {
      this.formData.mp_wx_openid = options.openid
    } else {
      uni.showToast({ title: '非法访问', icon: 'none' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  methods: {
    // 通用字段验证方法
    validateField(field) {
      this.$refs.registerForm.validateField(field);
    },

    // 性别选择
    changeGender(e) {
      this.formData.gender = Number(e.detail.value);
      this.validateField('gender');
      //console.log(this.formData.gender)
    },

    // 身份选择
    onIdentityChange(e) {
      this.formData.identity = this.identityOptions[e.detail.value];
      this.validateField('identity');
    },

    async saveAvatarUrl(fileID) {
      try {
        await db.collection("User").where({ mp_wx_openid: this.openid }).update({
          avatarUrl: fileID, // 存储头像 URL
        });
        uni.showToast({
          title: "头像上传成功",
          icon: "success",
        });
      } catch (error) {
        console.error("更新数据库失败", error);
        uni.showToast({
          title: "更新失败",
          icon: "none",
        });
      }
    },

    // 头像上传
    changeUserHead(e) {
      const { avatarUrl } = e.detail; // 获取用户选择的头像
      this.formData.avatarUrl = e.detail.avatarUrl;
      uniCloud.uploadFile({
        filePath: avatarUrl, // 上传的本地文件路径
        cloudPath: `avatars/${Date.now()}-${Math.random()}.jpg`, // 存储路径
        success: async (res) => {
          console.log("上传成功", res);
          this.touxiangUrl = res.fileID; // 设置新的头像 URL
          await this.saveAvatarUrl(res.fileID); // 存储 URL 到数据库
        },
        fail: (err) => {
          console.error("上传失败", err);
          uni.showToast({ title: "上传失败", icon: "none" });
        },
      });
    },

    // 表单提交
    async submitForm() {
      try {
        // 验证前补充openid检查
        if (!this.formData.mp_wx_openid) {
          throw new Error('用户身份验证失败，请重新登录');
        }

        // 执行表单验证
        await this.$refs.registerForm.validate();
        
        let num = 0;
        if (this.formData.identity === '') {
          uni.showToast({ title: '请选择身份!', icon: 'error' });
        } else num++;

        if (this.formData.gender === null) {
          uni.showToast({ title: '请选择性别!', icon: 'error' });
        } else num++;

        if (this.formData.nickName === '') {
          uni.showToast({ title: '昵称不能为空!', icon: 'error' });
        } else num++;

        if (this.formData.avatarUrl === '../../static/默认头像.png') {
          uni.showToast({ title: '请更换头像!', icon: 'error' });
        } else num++;

        if(this.formData.phone === '') {
		  uni.showToast({ title: '手机号不能为空!', icon: 'error' })
		} else if (!/^1[3-9]\d{9}$/.test(this.formData.phone)) {
		  uni.showToast({ title: '请输入有效的手机号!', icon: 'error' })
		} else num++;

        if (num === 5) {
          // 转换身份为数字类型
          const postData = {
            ...this.formData,
            identity: this.formData.identity === '用户' ? 1 : 2,
            // register_date: Date.now() // 自动添加注册时间
          };

			
			
          // 提交到数据库
          const db = uniCloud.database();
          const res = await db.collection('User').add(postData);
          if (db.collection('User').where({
		    mp_wx_openid: postData.mp_wx_openid // 假设你用用户名来判断是否已经存在
		  }).get()) {
            uni.showToast({
              title: '注册成功',
              icon: 'success',
              duration: 1500, // 确保 duration 时间足够
              complete: () => {
                setTimeout(() => {
                  uni.switchTab({
                    url: `/pages/Login/Login?Loginstate=1&openid=${this.formData.mp_wx_openid}`
                  });
                }, 1500); // 延迟执行，确保 Toast 先消失
              }
            });
          }
        }
      } catch (err) {
        // 错误处理
        if (err.errCode === 'VALIDATE_FAIL') {
          const firstError = Object.values(err.data)[0][0].errorMessage;
          uni.showToast({ title: firstError, icon: 'none' });
        } else {
          console.error('数据库错误:', err);
          uni.showToast({ title: '注册失败，请重试', icon: 'none' });
        }
      }
    }
  }
}
</script>

<style scoped>
.register-container {
  padding: 20px;
}

.touxiang {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-left: 30px;
}

.radio-label {
  margin-right: 20px;
}

.picker {
  padding: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  color: #666;
}

.submit-btn {
  margin-top: 20px;
  background-color: #007aff;
  color: white;
}

/* 错误提示样式 */
:deep(.uni-forms-item__error) {
  color: #ff5500;
  font-size: 12px;
  margin-top: 4px;
}
</style>
