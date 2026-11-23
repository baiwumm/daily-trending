/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-11-23 10:20:00
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-11-23 10:20:00
 * @Description: 结构化数据（JSON-LD）注入组件
 */

/**
 * @description: 将结构化数据以 application/ld+json 脚本内联到页面；
 * 数据全部构建期从配置静态派生，不请求任何上游，零请求期成本
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    // 序列化交给 JSON.stringify：自动处理引号/换行/尖括号转义，避免手写 JSON 字符串的转义遗漏
    <script dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} type="application/ld+json" />
  )
}
