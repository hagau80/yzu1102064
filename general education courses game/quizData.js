// 題目資料，從 main.js 拆出
export const QUIZ_QUESTIONS = [
    // 第 1 關
    {
        id: 1,
        level: 1,
        title: "英雄光環的試煉",
        difficulty: "一般題",
        question: "群眾在危機中，通常會尋找哪種領袖？",
        options: {
            A: "看起來強大的人",
            B: "沉默的人",
            C: "不參與的人",
            D: "無名小卒"
        },
        answer: "A",
        explanation: "群眾在恐懼或混亂時，會依附「看似有力量」的領袖，尋求心理安全感。"
    },
    {
        id: 2,
        level: 1,
        title: "英雄光環的試煉",
        difficulty: "一般題",
        question: "群眾神化領袖的原因之一是？",
        options: {
            A: "對安全感的需求",
            B: "對制度的信任",
            C: "對經濟的期待",
            D: "對軍事的依賴"
        },
        answer: "A",
        explanation: "群眾在不安時會把希望投射在領袖身上，期待得到保護。"
    },
    {
        id: 3,
        level: 1,
        title: "英雄光環的試煉",
        difficulty: "中等題",
        question: "領袖的魅力可能導致群眾忽略什麼？",
        options: {
            A: "濫權行為",
            B: "經濟發展",
            C: "外交政策",
            D: "軍事力量"
        },
        answer: "A",
        explanation: "魅力型領袖容易讓群眾失去理性，忽略其可能的濫權或制度破壞。"
    },
    {
        id: 4,
        level: 1,
        title: "英雄光環的試煉",
        difficulty: "中等題",
        question: "群眾神化領袖時，最常出現的心理現象是？",
        options: {
            A: "投射心理",
            B: "批判思考",
            C: "制度依賴",
            D: "獨立判斷"
        },
        answer: "A",
        explanation: "群眾會把自己的期待與恐懼投射到領袖身上，形成盲目追隨。"
    },
    {
        id: 5,
        level: 1,
        title: "英雄光環的試煉",
        difficulty: "高難度題",
        question: "群眾神化領袖的風險是？",
        options: {
            A: "容易失去理性判斷",
            B: "制度被忽略",
            C: "權力集中",
            D: "以上皆是"
        },
        answer: "D",
        explanation: "神化領袖會造成群眾盲目追隨，忽略制度，導致權力集中與濫用。"
    },
    // 第 2 關
    {
        id: 6,
        level: 2,
        title: "羅馬的抉擇",
        difficulty: "一般題",
        question: "羅馬元老院代表的是？",
        options: {
            A: "制度",
            B: "領袖",
            C: "軍隊",
            D: "群眾"
        },
        answer: "A",
        explanation: "元老院象徵羅馬的制度與規範，避免權力過度集中在單一領袖。"
    },
    {
        id: 7,
        level: 2,
        title: "羅馬的抉擇",
        difficulty: "一般題",
        question: "為何制度比領袖重要？",
        options: {
            A: "制度能持續運作",
            B: "領袖可能更換",
            C: "制度能防止濫權",
            D: "以上皆是"
        },
        answer: "D",
        explanation: "制度是長期穩定的保障，而領袖只是暫時存在。"
    },
    {
        id: 8,
        level: 2,
        title: "羅馬的抉擇",
        difficulty: "中等題",
        question: "制度的最大功能是什麼？",
        options: {
            A: "提供娛樂",
            B: "防止權力集中",
            C: "增加軍事力量",
            D: "提升領袖魅力"
        },
        answer: "B",
        explanation: "制度設計的目的之一，就是避免權力集中與濫用。"
    },
    {
        id: 9,
        level: 2,
        title: "羅馬的抉擇",
        difficulty: "中等題",
        question: "公民理性與領袖魅力的差異在於？",
        options: {
            A: "理性依靠制度，魅力依靠情感",
            B: "理性依靠情感，魅力依靠制度",
            C: "兩者相同",
            D: "沒有差異"
        },
        answer: "A",
        explanation: "理性判斷需要制度支持，而魅力型領袖則依靠群眾情感來凝聚支持。"
    },
    {
        id: 10,
        level: 2,
        title: "羅馬的抉擇",
        difficulty: "高難度題",
        question: "羅馬歷史告訴我們，當制度被忽略時會發生什麼？",
        options: {
            A: "領袖更換",
            B: "權力集中，走向獨裁",
            C: "經濟繁榮",
            D: "公民更自由"
        },
        answer: "B",
        explanation: "制度失效時，權力容易集中在單一領袖，導致獨裁。"
    },
    // 第 3 關
    {
        id: 11,
        level: 3,
        title: "訊息之戰",
        difficulty: "一般題",
        question: "群眾容易被什麼牽動？",
        options: {
            A: "情緒",
            B: "制度",
            C: "經濟",
            D: "外貌"
        },
        answer: "A",
        explanation: "媒體與社群訊息往往透過情緒影響群眾，而非理性分析。"
    },
    {
        id: 12,
        level: 3,
        title: "訊息之戰",
        difficulty: "一般題",
        question: "媒體塑造英雄形象的方式之一是？",
        options: {
            A: "重複播放正面故事",
            B: "隱藏負面消息",
            C: "創造符號化語言",
            D: "以上皆是"
        },
        answer: "D",
        explanation: "媒體透過選擇性報導與符號化敘事，能塑造領袖的英雄光環。"
    },
    {
        id: 13,
        level: 3,
        title: "訊息之戰",
        difficulty: "中等題",
        question: "群眾在媒體影響下，最常忽略的是？",
        options: {
            A: "真實背景",
            B: "領袖魅力",
            C: "情緒共鳴",
            D: "制度運作"
        },
        answer: "A",
        explanation: "媒體常以片段訊息塑造形象，群眾容易忽略完整背景。"
    },
    {
        id: 14,
        level: 3,
        title: "訊息之戰",
        difficulty: "中等題",
        question: "媒體訊息的危險在於？",
        options: {
            A: "可能偏頗，操控群眾情緒",
            B: "永遠中立",
            C: "完全無影響",
            D: "只影響制度"
        },
        answer: "A",
        explanation: "媒體可能選擇性報導，操控群眾情緒，影響判斷。"
    },
    {
        id: 15,
        level: 3,
        title: "訊息之戰",
        difficulty: "高難度題",
        question: "分辨英雄與暴君的三個指標是？",
        options: {
            A: "是否尊重制度",
            B: "是否濫用恐懼",
            C: "是否鼓勵理性",
            D: "以上皆是"
        },
        answer: "D",
        explanation: "真正的英雄會尊重制度、鼓勵理性，而暴君則常利用恐懼操控群眾。"
    }
];