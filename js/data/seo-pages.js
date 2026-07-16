(function () {
  const PAGES = [
    {
      slug: 'san-haoxuesheng-jiangzhuang',
      title: '三好学生奖状模板',
      h1: '三好学生奖状 · 免费在线制作',
      desc: '期末表彰、班级评优必备。选模板 → 填姓名荣誉 → 一键下载 PNG/PDF，支持全班批量生成。',
      keywords: '三好学生,奖状模板,期末表彰,小学奖状',
      tpl: 'tpl-01', preset: 0, scene: 'campus'
    },
    {
      slug: 'youxiu-xuesheng-biaoyang',
      title: '优秀学生表扬状模板',
      h1: '优秀学生表扬状',
      desc: '适用于进步之星、学习标兵、文明学生等场景，竖版/横版/照片奖状任选。',
      keywords: '优秀学生,表扬状,学生表彰',
      tpl: 'tpl-04', scene: 'campus'
    },
    {
      slug: 'yundonghui-jiangzhuang',
      title: '运动会奖状模板',
      h1: '运动会奖状 · 体育竞技表彰',
      desc: '校运会、班级接力、趣味运动会专用绿金/运动风模板，可放运动员照片。',
      keywords: '运动会奖状,体育奖状,校运会',
      tpl: 'tpl-04', preset: 0
    },
    {
      slug: 'youeryuan-biaoyangzhuang',
      title: '幼儿园表扬状模板',
      h1: '幼儿园表扬状 · 可爱动物风',
      desc: '小熊、小兔、恐龙、猫咪……横版童趣模板，适合 3-6 岁小朋友。',
      keywords: '幼儿园奖状,表扬状,小朋友',
      tpl: 'tpl-23', scene: 'photo'
    },
    {
      slug: 'yuangong-biaozhang-zhengshu',
      title: '员工表彰证书模板',
      h1: '员工表彰证书 · 企业 HR 专用',
      desc: '年度优秀员工、销售冠军、最佳新人。蓝金商务风，支持 Logo 与批量 PDF。',
      keywords: '员工表彰,荣誉证书,HR,企业',
      tpl: 'tpl-03', scene: 'corporate'
    },
    {
      slug: 'niandu-youxiu-yuangong',
      title: '年度优秀员工证书',
      h1: '年度优秀员工 · 荣誉证书',
      desc: '年终盛典、部门表彰、年会颁奖。香槟/黑金/蓝金多款正式模板。',
      keywords: '年度优秀员工,年终表彰,企业证书',
      tpl: 'tpl-10', scene: 'corporate'
    },
    {
      slug: 'zhiyuanzhe-zhengshu',
      title: '志愿者证书模板',
      h1: '志愿者证书 · 公益感谢',
      desc: '社区志愿、活动服务、公益项目感谢信。橙光暖意模板，可批量出图。',
      keywords: '志愿者证书,公益,感谢状',
      tpl: 'tpl-06', scene: 'activity'
    },
    {
      slug: 'bisai-huojiang-zhengshu',
      title: '比赛获奖证书模板',
      h1: '比赛获奖证书',
      desc: '摄影大赛、征文比赛、科技创新节。支持一等奖/优秀奖等内容模版一键套用。',
      keywords: '获奖证书,比赛,一等奖',
      tpl: 'tpl-07', scene: 'activity'
    },
    {
      slug: 'jiaoshijie-ganxie',
      title: '教师节感谢证书',
      h1: '教师节 · 感谢恩师',
      desc: '牡丹师恩模板，感谢辛勤付出。家长委员会落款，适合家委/学生制作。',
      keywords: '教师节,感谢老师,师恩',
      tpl: 'tpl-21', scene: 'activity'
    },
    {
      slug: 'chunjie-xinyuan-zhengshu',
      title: '春节喜庆荣誉证书',
      h1: '春节 · 节日荣誉证书',
      desc: '联欢晚会、社区活动、节日表彰。红金节日风，支持中国红/烫金配色。',
      keywords: '春节,节日证书,红金',
      tpl: 'tpl-08', scene: 'festival'
    },
    {
      slug: 'rongyu-zhengshu-shu',
      title: '竖版荣誉证书模板',
      h1: '竖版荣誉证书 · 打印级',
      desc: 'A4 竖版经典布局，适合打印张贴。16 套竖版模板，照片/纯文字可选。',
      keywords: '竖版证书,荣誉证书,A4',
      tpl: 'tpl-01', filter: 'port'
    },
    {
      slug: 'rongyu-zhengshu-heng',
      title: '横版荣誉证书模板',
      h1: '横版荣誉证书 · 桌面摆放',
      desc: '1216×712 横版证书，适合相框、桌面展示、批量横版 PDF。',
      keywords: '横版证书,荣誉证书',
      tpl: 'tpl-13', filter: 'land'
    },
    {
      slug: 'zhaopian-jiangzhuang',
      title: '照片奖状模板',
      h1: '照片奖状 · 上传头像一键出图',
      desc: '圆形/圆角/方形照片槽，适合学生个人表彰、成长记录册。',
      keywords: '照片奖状,带照片,学生',
      tpl: 'tpl-01', scene: 'photo'
    },
    {
      slug: 'youxiu-shao-xian-duiyuan',
      title: '优秀少先队员证书',
      h1: '优秀少先队员 · 荣誉证书',
      desc: '少先队大队部落款，内容模版一键套用，支持批量替换姓名。',
      keywords: '少先队员,少先队,校园',
      tpl: 'tpl-02', preset: 1
    },
    {
      slug: 'xiaoheiban-biaoyang',
      title: '小黑板风格表扬状',
      h1: '卡通童趣表扬状',
      desc: '色彩活泼、适合低年龄段。趣味挑战、闯关表扬、亲子活动。',
      keywords: '表扬状,卡通,儿童',
      tpl: 'tpl-11', scene: 'photo'
    },
    {
      slug: 'heise-jin-pinpai-zhengshu',
      title: '黑金高端证书模板',
      h1: '黑金精英 · 高端商务证书',
      desc: '竞赛精英、高端商务、董事会嘉奖。暗夜精英模板，香槟金/银白配色。',
      keywords: '黑金证书,高端,商务',
      tpl: 'tpl-22', scene: 'corporate'
    },
    {
      slug: 'lanjin-qiye-zhengshu',
      title: '蓝金企业证书模板',
      h1: '蓝金典藏 · 企业正式证书',
      desc: '居中对称布局，兹证明式正文，适合 HR 正式发文。',
      keywords: '蓝金,企业证书,正式',
      tpl: 'tpl-14', scene: 'corporate'
    },
    {
      slug: 'quanban-piliang-jiangzhuang',
      title: '全班批量奖状生成',
      h1: '批量奖状 · Excel 名单一键出图',
      desc: '粘贴名单或导入 Excel，自动替换姓名，ZIP 打包 PNG/PDF。教师/HR 效率神器。',
      keywords: '批量奖状,Excel,全班',
      tpl: 'tpl-01', cta: 'batch'
    },
    {
      slug: 'xuesheng-zhengshu-mianfei',
      title: '免费学生证书在线制作',
      h1: '免费在线制作学生证书',
      desc: '无需注册即可开始，Free 版含 10 套模板。升级 Pro 解锁全部 28 套与去水印导出。',
      keywords: '免费,在线制作,学生证书',
      tpl: 'tpl-02'
    },
    {
      slug: 'youxiu-jiazhang-zhengshu',
      title: '优秀家长证书模板',
      h1: '优秀家长 · 家委会表彰',
      desc: '感谢家长支持班级与学校工作。红金/粉彩模板，可自定义落款为家委会。',
      keywords: '优秀家长,家委会,感谢',
      tpl: 'tpl-21'
    }
  ];

  function find(slug) {
    return PAGES.find(p => p.slug === slug);
  }

  function all() { return PAGES; }

  window.HC_SEO_PAGES = PAGES;
  window.HC_SEO_DATA = { find, all };
})();
