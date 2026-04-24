import type { SongSheet } from '../songSheet';

export const huoche: SongSheet = {
  id: 'huoche',
  title: '火车驶向云外,梦安魂与九霄',
  key: 'D#',
  strum: '↑ ↑↓↑↓↑↓',
  sections: [
    {
      name: '主歌 1',
      lines: [
        {
          bars: [
            { degree: 1, source: '我[那]些残梦' },
            { degree: 3, source: '灵异[九]霄' },
            { degree: 6, source: '徒忙[漫]奋斗' },
            { degree: 4, source: '满目[沧]愁' },
          ],
        },
        {
          bars: [
            { degree: 2, source: '在[滑]翔之后' },
            { degree: 6, source: '   [完]美坠落' },
            { degree: 3, source: '在[四]维宇宙' },
            { degree: 5, source: '眩目[遨]游' },
          ],
        },
      ],
    },
    {
      name: '主歌 2',
      lines: [
        {
          bars: [
            { degree: 1, source: '我[那]些烂曲' },
            { degree: 3, source: '流窜[九]州' },
            { degree: 6, source: '云游[魂]飞奏' },
            { degree: 4, source: '音愤[符]吼' },
          ],
        },
        {
          bars: [
            { degree: 2, source: '在[宿]命身后' },
            { degree: 6, source: '   [不]停挥手' },
            { degree: 3, source: '视死[如]归仇' },
            { degree: 5, source: '毫无[保]留' },
          ],
        },
      ],
    },
    {
      name: '副歌',
      lines: [
        {
          bars: [
            { degree: 1, source: '黑[色]的不是夜晚' },
            { degree: 3, source: '是漫[长]的孤单' },
            { degree: 6, source: '看[脚]下一片黑暗' },
            { degree: 4, source: '望[头]顶星光璀璨' },
          ],
        },
        {
          bars: [
            { degree: 2, source: '叹[世]万物皆可盼' },
            { degree: 6, source: '唯[真]爱最短暂' },
            { degree: 3, source: '失[去]的永不复返' },
            { degree: 5, source: '世[守]恒而今倍还' },
          ],
        },
        {
          bars: [
            { degree: 1, source: '摇[旗]呐喊的热情' },
            { degree: 3, source: '携[光]阴渐远去' },
            { degree: 6, source: '人[世]间悲喜烂剧' },
            { degree: 4, source: '昼[夜]轮播不停' },
          ],
        },
        {
          bars: [
            { degree: 2, source: '纷[飞]的滥情男女' },
            { degree: 6, source: '情[仇]爱恨别离' },
            { degree: 3, source: '一[代]人终将老去' },
            { degree: 5, source: '但[总]有人正年轻' },
          ],
        },
      ],
    },
  ],
};
