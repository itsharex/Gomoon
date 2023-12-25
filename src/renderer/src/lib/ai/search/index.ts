import axios from 'axios'
import { load } from 'cheerio'
import { nonStreamingAssistant } from '../langchain'
import { parsePageForSearch } from '../url'

async function fetchBaiduResults(keyword) {
  const searchUrl = `http://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`
  const { data } = await axios.get(searchUrl)
  const $ = load(data)
  const links: string[] = []
  $('.t a').each((_, element) => {
    // TODO: 识别广告
    const link = $(element).attr('href')
    link && links.push(link)
  })
  return links
}

function processQuery(content: string) {
  const reg = /<(.+?)>/
  if (content.match(reg)) {
    return {
      suc: true,
      query: content.match(reg)![0].replace(/<(.+?)>$/, '$1')
    }
  }
  return {
    suc: false,
    query: ''
  }
}

// 解析3个链接后生成答案 -> 生成答案
// export async function searchByBaidu(question: string, logger: (content: string) => void) {
//   const prompt = `请根据 ${question} 给我一个使用于搜索引擎的关键词，并使用<>包裹。除了关键词外不要添加任何其他内容。`
//   let times = 3
//   logger('创建查询中...')
//   let processedContent = {
//     suc: false,
//     query: ''
//   }
//   while (times--) {
//     const res = await nonStreamingAssistant(prompt)
//     processedContent = processQuery(res.content as string)
//     if (processedContent.suc) {
//       break
//     }
//     logger('查询创建失败，重新创建中...')
//   }
//   if (!processedContent.suc) {
//     throw new Error('查询创建失败')
//   }
//   logger('收集链接中...')
//   const links = (await fetchBaiduResults(processedContent.query)).sort(() => Math.random() - 0.5)
//   let content = `<gomoon-search question="${question}"/>接下来我将会给你3个与\n ${question} \n这个问题有关的实时的信息（回答是从网络上总结的,可能有无效信息）。请理解信息并直接给出最终答案，不要多余的解释。(一定不要说自己不能联网或获取不到实时信息等):\n`
//   logger(`解析链接中...`)
//   const res = await Promise.all(links.slice(0, 3).map((link) => parsePageForSearch(link, question)))
//   res.map((r, i) => {
//     content += `\n\n\n第${i + 1}个信息：${r.content}`
//   })
//   return content
// }

export async function searchByBaidu(question: string, logger: (content: string) => void) {
  const prompt = `请根据 ${question} 给我一个使用于搜索引擎的关键词，并使用<>包裹。除了关键词外不要添加任何其他内容。`
  let times = 3
  logger('创建查询中...')
  let processedContent = {
    suc: false,
    query: ''
  }
  while (times--) {
    const res = await nonStreamingAssistant(prompt)
    processedContent = processQuery(res.content as string)
    if (processedContent.suc) {
      break
    }
    logger('查询创建失败，重新创建中...')
  }
  if (!processedContent.suc) {
    throw new Error('查询创建失败')
  }
  logger('收集链接中...')
  const links = (await fetchBaiduResults(processedContent.query)).sort(() => Math.random() - 0.5)
  let content = `<gomoon-search question="${question}"/>接下来我将会给你3个与\n ${question} \n这个问题有关的网页文本内容（这其中可能会包括一些标题，用户信息，备案号，相关推荐，按钮内容等。请你剔除无效信息）。请综合理解信息并直接给出最终答案，不要多余的解释。(不要说自己不能联网或获取不到实时信息等):\n`
  logger(`解析链接中...`)
  const res = await Promise.all(links.slice(0, 3).map((link) => parsePageForSearch(link)))
  res.map((r, i) => {
    content += `\n\n\n第${i + 1}个网页信息：${r}`
  })
  return content
}