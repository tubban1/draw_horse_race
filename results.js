/* Personal race receipts: jokes change, the actual time and place never do. */
const RESULT_PERSONAS = {
  banana: {badge:'水果组质检单',metric:'成熟用时',titles:['蕉傲一点，\n你是冠军。','差一点，\n就蕉到冠军。','熟是熟了，\n还差点火候。','熟了，\n但没完全赢。'],taunts:['连香蕉都跑不过？','你来跑，别蕉虑。']},
  wheels: {badge:'疑似改装年检单',metric:'轮上实测',titles:['四轮驱动，\n全场服众。','轮子很圆，\n冠军很远。','底盘很稳，\n排名第三。','轮子没坏，\n只是想摆。'],taunts:['我带轮子，你带什么？','欢迎来查我的马达。']},
  spring: {badge:'弹性上班考勤单',metric:'弹到终点',titles:['弹性上班，\n刚性夺冠。','弹到第二，\n拒绝调休。','弹了半天，\n落在第三。','弹性上班，\n弹走冠军。'],taunts:['你的马有弹性吗？','不服就弹一个。']},
  long: {badge:'超长快递签收单',metric:'全马到齐',titles:['头先夺冠，\n尾巴补票。','身子够长，\n还差一点。','第三到了，\n尾巴在路上。','马是长的，\n命是慢的。'],taunts:['我这匹，你得横着看。','赛道装得下你的马吗？']},
  office: {badge:'牛马下班审批单',metric:'下班耗时',titles:['业绩第一，\n拒绝加班。','绩效第二，\n工资照旧。','卷到第三，\n工位不变。','拒绝内卷，\n准点完赛。'],taunts:['这次卷你，不卷同事。','你的牛马几点下班？']},
  ufo: {badge:'地球着陆检验单',metric:'着陆耗时',titles:['外星科技，\n本地冠军。','跨了星系，\n差了一名。','宇宙很大，\n本场第三。','导航很远，\n排名很后。'],taunts:['地球选手，请接招。','你的马办星际签证了吗？']},
  duck: {badge:'鸭协赛马认证书',metric:'鸭力测试',titles:['嘴上是鸭，\n脚下是王。','嘴硬第一，\n赛跑第二。','鸭力山大，\n勉强前三。','鸭根没急，\n你们先跑。'],taunts:['输给鸭子，算什么事？','来，给你上点鸭力。']},
  giraffe: {badge:'高个选手体测单',metric:'脖子以下用时',titles:['脖子很长，\n冠军很香。','看见冠军，\n没追上它。','视野第一，\n名次第三。','看得挺远，\n跑得挺晚。'],taunts:['别抬头，先追上我。','脖子以下，欢迎挑战。']},
  slipper: {badge:'小区运动会奖状',metric:'出门倒垃圾',titles:['穿着拖鞋，\n拿走奖杯。','出门随便，\n差点夺冠。','居家第三，\n很给面子。','出来遛弯，\n你们还真跑。'],taunts:['你认真跑，我穿拖鞋。','楼下等你，别换跑鞋。']},
  ghost: {badge:'灵体出勤证明',metric:'显灵时长',titles:['看不见马，\n看得见冠。','身体缺席，\n亚军到场。','魂到第三，\n人还没来。','马没了，\n冠军也没了。'],taunts:['追不上我，还是看不见我？','你的马敢见我吗？']},
  noodle: {badge:'碳水出餐小票',metric:'出餐速度',titles:['面没坨，\n冠军到手。','差一口气，\n再加份面。','三分实力，\n七分碳水。','面都坨了，\n马才到了。'],taunts:['这碗面，你追得上吗？','别加辣，加点马力。']},
  rocket: {badge:'发射任务回执',metric:'点火到落地',titles:['马上起飞，\n冠军归位。','推力很大，\n还差一点。','起飞成功，\n落在第三。','点火半天，\n原地冒烟。'],taunts:['你的马还在地面吗？','倒数三秒，等你点火。']},
  longDraw: {badge:'超长生物检测单',metric:'头尾全部到站',titles:['拉得够长，\n赢得漂亮。','长成这样，\n还差一点。','长度超标，\n名次第三。','身子拉长，\n战线也拉长。'],taunts:['这么长的马，你见过吗？','别数腿了，先追上来。']},
  tallDraw: {badge:'高海拔选手报告',metric:'长腿实测',titles:['站得挺高，\n跑得挺快。','高出一截，\n差了一名。','个子很高，\n排名第三。','高是高了，\n快是真没快。'],taunts:['长这么高，跑得过吗？','抬头看马，低头接战。']},
  minimal: {badge:'极简艺术成交单',metric:'几笔跑完百米',titles:['寥寥几笔，\n全场没敌。','少画几笔，\n差赢一点。','艺术极简，\n稳定前三。','能省的笔，\n能摆的名次。'],taunts:['这几笔，就问你服不服。','我随手画的，你认真跑。']},
  colorful: {badge:'彩色物种鉴定书',metric:'一路掉色用时',titles:['五彩斑斓，\n一路夺冠。','颜色很满，\n还差一名。','颜值在线，\n跑进前三。','配色赢了，\n比赛随缘。'],taunts:['颜色不重要，追上才重要。','这配色，够你追一阵。']},
  doodle: {badge:'未知物种体测单',metric:'离谱百米实测',titles:['长得随意，\n赢得具体。','差点夺冠，\n差点像马。','画风自由，\n名次第三。','物种存疑，\n完赛属实。'],taunts:['我画的这玩意，你跑得过？','先别管像不像，追上再说。']}
};
function receiptHash(text) {
  let value=2166136261;
  for(const c of text)value=Math.imul(value^c.charCodeAt(0),16777619);
  return value>>>0;
}
function resultPersona(horse) {
  if(RESULT_PERSONAS[horse.petId])return horse.petId;
  // Exact catalog names preserve character jokes for older saved adopted horses.
  if(typeof ADOPTION_CATALOG!=='undefined'){
    const pet=ADOPTION_CATALOG.find(p=>p.name===horse.name);
    if(pet)return pet.id;
  }
  if(/下班|加班|牛马|打工|周一/.test(horse.name))return 'office';
  if(/蕉|香蕉/.test(horse.name))return 'banana';
  let minX=1,maxX=0,minY=1,maxY=0;
  for(const s of horse.strokes)for(const [x,y] of s.p){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
  const ratio=(maxX-minX)*(horse.aspect||1)/Math.max(.001,maxY-minY);
  if(ratio>3.3)return 'longDraw';
  if(ratio<.7)return 'tallDraw';
  if(new Set(horse.strokes.map(s=>s.c)).size>=3)return 'colorful';
  if(horse.strokes.length<=2)return 'minimal';
  return 'doodle';
}
function raceReceipt({horse,place,combo,seed,challengeTime,previousBest}) {
  const persona=resultPersona(horse),pack=RESULT_PERSONAS[persona];
  const fingerprint=receiptHash(JSON.stringify([horse.name,horse.strokes,horse.time,combo,seed]));
  const lines=[
    `「${horse.name}」的物种还没定，成绩先定了。`,
    `裁判反复确认：跑完这 100 米的，确实是「${horse.name}」。`,
    `「${horse.name}」已到站。请带好你的下巴和胜负欲。`,
    `赛前：这也算马？赛后：「${horse.name}」还真能跑。`
  ];
  let performance;
  if(combo===0)performance='全程零连击：主打一个随马而安。';
  else if(combo>=8)performance=`${combo} 连击：手在踩点，马在开挂（精神上）。`;
  else if(combo>=3)performance=`${combo} 连击：找到节奏了，建议这双手单独出道。`;
  else performance=`${combo} 连击：偶尔认真，其他时间交给缘分。`;
  let verdict;
  if(Number.isFinite(challengeTime)){
    const delta=+(horse.time-challengeTime).toFixed(2);
    verdict=delta<0?`快朋友 ${(-delta).toFixed(2)} 秒。聊天框可以嚣张一下了。`:delta>0?`还差 ${delta.toFixed(2)} 秒。嘴硬可以，建议再跑。`:'精确到百分秒，打成平手。友谊暂时保住了。';
  }else if(!previousBest||horse.time<previousBest)verdict='刷新本机纪录。建议截图，趁你还在巅峰。';
  else verdict=`离本机最佳差 ${Math.max(0,horse.time-previousBest).toFixed(2)} 秒。上次的你有点东西。`;
  return {persona,title:pack.titles[Math.max(0,Math.min(3,place-1))],badge:pack.badge,metric:pack.metric,
    intro:lines[fingerprint%lines.length],performance,verdict,taunt:pack.taunts[fingerprint%pack.taunts.length],
    serial:fingerprint.toString(36).toUpperCase().padStart(7,'0'),
    stats:`100 米 · ${horse.time.toFixed(2)} 秒 · 第 ${place} 名 · 最高 ${combo} 连击`};
}
