// 在腾讯云 CloudBase 控制台创建环境后，只需修改 env。
// envId 属于前端公开配置，不要在这里填写 SecretId、SecretKey 或任何管理员密钥。
export const cloudbaseConfig = {
  env: '请替换为你的-CloudBase-环境ID',
  region: 'ap-shanghai'
};

export const isCloudbaseConfigured = () => (
  Boolean(cloudbaseConfig.env) && !cloudbaseConfig.env.includes('请替换')
);
