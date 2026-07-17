const cloud = require('./utils/cloud');

App({
  onLaunch() {
    cloud.init();
  },
  globalData: {
    appName: '奖状模版大全',
    h5Base: 'https://hhonghua2008.github.io/honor_card'
  }
});
