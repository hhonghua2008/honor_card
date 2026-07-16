const { h5Base } = require('../../utils/config');

Page({
  data: { url: '' },
  onLoad() {
    this.setData({ url: h5Base + '/#/pricing' });
  }
});
