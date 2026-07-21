# Qwen Harness Tools สำหรับ OpenCode

[English](README.md) | [ไทย](README.th.md)

ปลั๊กอิน OpenCode แบบไม่เป็นทางการสำหรับเปิดใช้ Qwen Harness Tools ซึ่งทำงานฝั่งเซิร์ฟเวอร์ของ Alibaba Token Plan ผ่าน OpenAI Responses API

ปลั๊กอินช่วยให้โมเดล Qwen ที่รองรับสามารถค้นเว็บ ดึงเนื้อหาจากหน้าเว็บ และค้นหารูปภาพผ่านเซิร์ฟเวอร์ของผู้ให้บริการ พร้อมป้องกันไม่ให้ lifecycle events ที่ OpenCode ยังไม่รองรับถูกแสดงเป็นเครื่องมือชื่อ `invalid`

## ทำไมต้องใช้ปลั๊กอินนี้

Alibaba มีเครื่องมือที่ผู้ให้บริการเป็นผู้รันผ่าน Responses API แต่ OpenCode ไม่ได้เพิ่ม Qwen Harness Tools ทุกตัวลงใน request โดยอัตโนมัติ และ lifecycle events บางประเภทของ Qwen อาจถูกตีความเป็น client-side tool ที่ไม่รู้จัก

ปลั๊กอินนี้ช่วยเชื่อมส่วนที่ขาดดังกล่าว:

1. ตรวจหา Responses API endpoint จาก config ของ Alibaba
2. เพิ่ม Harness Tools ที่รองรับลงใน request ที่ตรงเงื่อนไข
3. บอก Qwen ให้เลือกใช้ Harness Tools ก่อน MCP tools ที่ทำหน้าที่ซ้ำกัน
4. กรอง lifecycle events ที่ OpenCode อาจแสดงเป็น `invalid`
5. เก็บ final text response ของโมเดลไว้ครบถ้วน

Request ของ provider, model, endpoint หรือ API route อื่นจะไม่ถูกแก้ไข

## ความสามารถหลัก

- ตรวจหา endpoint อัตโนมัติจาก `provider.options.baseURL`
- กำหนด Harness Tools แยกตามโมเดล
- รองรับ `web_search` และ `web_extractor` ฝั่งเซิร์ฟเวอร์
- รองรับการค้นหารูปด้วยรูปและข้อความในโมเดลที่รองรับ
- เลือกเปิด `code_interpreter` ได้
- กรองทั้ง streaming SSE และ non-streaming JSON
- เลือกบล็อก MCP search tools ที่ทำหน้าที่ซ้ำกันได้
- ไม่ต้อง build และไม่ต้องติดตั้ง runtime package เพิ่ม

## โมเดลที่รองรับ

| โมเดล | `web_search` | `web_extractor` | `i2i_search` | `t2i_search` | `code_interpreter` |
|-------|:------------:|:---------------:|:------------:|:------------:|:------------------:|
| `qwen3.8-max-preview` | รองรับ | รองรับ | รองรับ | รองรับ | ปิดเป็นค่าเริ่มต้น |
| `qwen3.7-max` | รองรับ | รองรับ | ไม่รองรับ | ไม่รองรับ | ปิดเป็นค่าเริ่มต้น |
| `qwen3.7-plus` | รองรับ | รองรับ | รองรับ | รองรับ | ปิดเป็นค่าเริ่มต้น |

รายชื่อโมเดลและเครื่องมือของ Alibaba อาจเปลี่ยนแปลงได้ สามารถใช้ `modelTools` เพื่อเพิ่มหรือแก้รายการโมเดลโดยไม่ต้องแก้ source code ของปลั๊กอิน

## สิ่งที่ต้องมี

- OpenCode ที่รองรับ local TypeScript plugin
- บัญชี Alibaba Token Plan และ API key
- โมเดลที่ตั้งให้ใช้ `@ai-sdk/openai` เพื่อส่ง request ผ่าน Responses API
- Alibaba Token Plan `baseURL` ที่ถูกต้องสำหรับ region ที่ใช้งาน

ทดสอบแล้วกับ OpenCode `1.18.3` และ Bun `1.3.9`

## การติดตั้ง

### ติดตั้งด้วย AI Agent

นี่เป็นวิธีติดตั้งที่ง่ายที่สุด ควรใช้ AI coding agent ที่อ่านไฟล์ แก้ไฟล์ และรันคำสั่ง terminal บนเครื่องที่ติดตั้ง OpenCode ได้

1. เปิด AI coding agent ใน working directory ที่ไม่ใช่โฟลเดอร์ชั่วคราว
2. ส่ง prompt ด้านล่างโดยไม่ใส่ API key ลงไป
3. Agent จะตรวจ config เดิม, clone หรือค้นหา plugin, merge เฉพาะค่าที่จำเป็น และตรวจสอบแบบไม่เสีย Credits
4. ตั้ง API key environment variable ด้วยตัวเองเมื่อ agent แจ้งว่าจำเป็น
5. อนุญาต live test เฉพาะเมื่อยอมรับการใช้ Alibaba Token Plan Credits

Prompt พร้อมใช้:

```text
ติดตั้ง Qwen Harness Tools plugin สำหรับ OpenCode บนเครื่องนี้ ให้ลงมือติดตั้งจริง ไม่ใช่อธิบายอย่างเดียว ก่อนทำงานให้อ่าน https://raw.githubusercontent.com/sorajate/opencode-qwen-harness-plugin/main/INSTALL_WITH_LLM.md และทำตามทุกหัวข้อตามลำดับ ใช้เครื่องมืออ่านไฟล์และ terminal เพื่อตรวจ setup เดิม รักษา config อื่นทั้งหมด ห้ามแสดงหรือเขียน API key จริง ให้ใช้ environment variable ตามคู่มือ รัน validation ที่ไม่เสีย Credits ให้ครบ หากพบค่าขัดแย้งหรือต้องรัน live model test ที่มีค่าใช้จ่าย ให้หยุดและถามผมก่อน เมื่อเสร็จแล้วให้รายงานไฟล์ที่แก้ คำสั่งที่รัน ผล validation และสิ่งที่ผมยังต้องทำเอง
```

[คู่มือติดตั้งสำหรับ LLM](INSTALL_WITH_LLM.md) ถูกเขียนอย่างละเอียดโดยกำหนดลำดับทำงานตายตัว ใช้กฎสั้นและชัดเจน มี stop conditions, config merge instructions, completion checklist และ rollback steps โมเดลขนาดเล็กควรทำตามข้อความในคู่มือตรง ๆ ห้ามข้ามขั้นตอนหรือเดาเมื่อพบค่าขัดแย้ง

ห้ามใส่ Alibaba API key ลงใน prompt Agent ควรตรวจเพียงว่ามี `ALIBABA_TOKEN_PLAN_API_KEY` หรือไม่ และให้ผู้ใช้ตั้งค่าโดยไม่แสดงค่าของ key

### ติดตั้งด้วยตนเอง

#### 1. Clone Repository

Clone repository นี้ไว้ในตำแหน่งที่ไม่ถูกลบเป็นไฟล์ชั่วคราว OpenCode จะโหลดไฟล์ TypeScript โดยตรง จึงไม่ต้องรัน `npm install` หรือ build

```bash
git clone https://github.com/sorajate/opencode-qwen-harness-plugin.git ~/.config/opencode/plugins/qwen-harness
```

ตัวอย่างบน Windows:

```powershell
git clone https://github.com/sorajate/opencode-qwen-harness-plugin.git "$HOME\.config\opencode\plugins\qwen-harness"
```

#### 2. ตั้งค่า Provider

ควรเก็บ API key ไว้ใน environment variable แทนการเขียนลง config โดยตรง:

```bash
export ALIBABA_TOKEN_PLAN_API_KEY="your-api-key"
```

PowerShell:

```powershell
$env:ALIBABA_TOKEN_PLAN_API_KEY = "your-api-key"
```

เพิ่ม provider ใน `~/.config/opencode/opencode.json` และเปลี่ยน endpoint หาก region ที่ใช้งานต่างจากตัวอย่าง:

```json
{
  "provider": {
    "alibaba-token-plan": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Alibaba Token Plan",
      "options": {
        "baseURL": "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        "apiKey": "{env:ALIBABA_TOKEN_PLAN_API_KEY}"
      },
      "models": {
        "qwen3.8-max-preview": {
          "name": "Qwen 3.8 Max Preview",
          "reasoning": true,
          "attachment": true,
          "tool_call": true,
          "limit": {
            "context": 1048576,
            "output": 65536
          },
          "modalities": {
            "input": ["text", "image", "video", "pdf"],
            "output": ["text"]
          },
          "provider": {
            "npm": "@ai-sdk/openai"
          }
        }
      }
    }
  }
}
```

ควรใช้ model block แบบเต็มตามตัวอย่าง เพราะ custom provider model อาจไม่แสดงอย่างถูกต้องเมื่อไม่มีข้อมูล capabilities, limit และ modalities ส่วน model-level override ที่ใช้ `@ai-sdk/openai` ก็มีความสำคัญ เพราะทำให้โมเดลนี้เรียก `/responses` ขณะที่โมเดลอื่นภายใต้ provider เดียวกันยังใช้ OpenAI-compatible provider ได้

#### 3. ลงทะเบียน Plugin

เพิ่ม plugin tuple ลงใน `plugin` array ของ `opencode.json` โดยใช้ absolute path ของไฟล์ `qwen-harness.ts` ที่ clone มา

ตัวอย่าง Unix:

```json
{
  "plugin": [
    ["/home/you/.config/opencode/plugins/qwen-harness/qwen-harness.ts", {
      "providerID": "alibaba-token-plan",
      "disabledTools": ["code_interpreter"],
      "blockMCP": false,
      "suppressHarnessEvents": true,
      "debug": false
    }]
  ]
}
```

Path บน Windows ควรใช้ forward slash หรือ backslash ที่ escape แล้ว:

```json
{
  "plugin": [
    ["C:/Users/you/.config/opencode/plugins/qwen-harness/qwen-harness.ts", {
      "providerID": "alibaba-token-plan",
      "disabledTools": ["code_interpreter"]
    }]
  ]
}
```

Restart OpenCode หลังเปลี่ยน plugin หรือ provider config

## ตัวเลือกการตั้งค่า

| ตัวเลือก | ค่าเริ่มต้น | รายละเอียด |
|---------|------------|------------|
| `providerID` | `alibaba-token-plan` | Provider ที่จะได้รับ Harness instructions และ optional MCP blocking |
| `endpoint` | ตรวจอัตโนมัติ | กำหนด base URL หรือ Responses endpoint เอง โดยปกติไม่จำเป็นต้องใส่ |
| `disabledTools` | `["code_interpreter"]` | Harness Tools ที่จะไม่ถูกเพิ่มลงใน request |
| `modelTools` | รายการที่มากับปลั๊กอิน | เพิ่มโมเดลหรือแทนรายการ tools ของโมเดลเดิม |
| `blockMCP` | `false` | บล็อก MCP tool prefixes ที่กำหนดไว้ใน session ของ provider นี้ |
| `blockedMCPPrefixes` | prefixes ของ search MCP ทั่วไป | Prefixes ที่จะถูกบล็อกเมื่อเปิด `blockMCP` |
| `suppressHarnessEvents` | `true` | กรอง lifecycle events ที่ OpenCode อาจแสดงเป็น `invalid` |
| `debug` | `false` | แสดงข้อมูลการลงทะเบียน endpoint ผ่าน stderr |

### เปิด Code Interpreter

`code_interpreter` ถูกปิดเป็นค่าเริ่มต้น เพราะเครื่องมือ local ของ OpenCode เหมาะกว่าสำหรับงาน repository, file, git, shell และ system

เปิดทุก tool ที่อยู่ใน model map ได้ด้วย:

```json
"disabledTools": []
```

### เพิ่มหรือแก้โมเดล

```json
"modelTools": {
  "qwen3.8-max-preview": ["web_search", "web_extractor"],
  "qwen3.7-max": ["web_search"]
}
```

รายการที่กำหนดเองจะถูกรวมกับ model map ที่มากับปลั๊กอิน หากใช้ model ID ซ้ำ รายการใหม่จะแทนรายการเดิมของโมเดลนั้น

### บล็อก MCP Tools ที่ทำหน้าที่ซ้ำกัน

ตั้ง `blockMCP` เป็น `true` หากต้องการป้องกันไม่ให้โมเดลใช้ MCP search tools ทั่วไปขณะที่ Qwen Harness Tools ทำงาน:

```json
{
  "blockMCP": true,
  "blockedMCPPrefixes": ["brave-search_", "exa_"]
}
```

การบล็อกมีผลเฉพาะ session ที่ user model เลือกใช้ `providerID` นี้ เครื่องมือ local สำหรับ repository และ shell ยังใช้งานได้ตามปกติ

## การกรอง Response ทำงานอย่างไร

Harness Tools ทำงานบนเซิร์ฟเวอร์ของ Alibaba ก่อนที่ Qwen จะส่ง final answer กลับมา OpenCode อาจมอง provider-executed output type ที่ไม่รู้จักว่าเป็น client tool ที่หายไป และซ่อมชื่อเป็น `invalid`

เมื่อใช้ `suppressHarnessEvents: true` ปลั๊กอินจะลบเฉพาะ Harness lifecycle items ที่ตรงกันออกจาก SSE หรือ JSON response ส่วนข้อความปกติ reasoning, completion metadata และ events ของ tools อื่นจะยังผ่านตามเดิม

Alibaba ยังคงรัน Harness Tool และ Qwen ยังคงได้รับผลลัพธ์ การกรองมีผลเฉพาะข้อมูลที่ OpenCode parse และแสดงหลัง server-side execution เท่านั้น

## การแก้ปัญหา

### โมเดลไม่ใช้ Harness Tools

- ตรวจว่าโมเดลอยู่ใน built-in map หรือ `modelTools`
- ตรวจว่าโมเดลใช้ `@ai-sdk/openai` ไม่ใช่เฉพาะ `@ai-sdk/openai-compatible`
- ตรวจว่า `baseURL` ชี้ไปยัง Token Plan endpoint ที่ถูกต้อง
- ตรวจว่า tool ที่ต้องการไม่ได้อยู่ใน `disabledTools`
- เปิด `debug` แล้ว restart OpenCode เพื่อตรวจการลงทะเบียน endpoint

### OpenCode ยังแสดง `invalid`

- ตรวจว่าไม่ได้ตั้ง `suppressHarnessEvents` เป็น `false`
- Restart OpenCode หลังอัปเดตปลั๊กอิน
- ตรวจว่าผู้ให้บริการเพิ่ม tool output type ใหม่หรือไม่ และเพิ่มชื่อ tool ผ่าน `modelTools` เมื่อเหมาะสม

### MCP Search Tool ถูกบล็อก

- ตั้ง `blockMCP` เป็น `false` หรือลบ prefix ของ tool ออกจาก `blockedMCPPrefixes`

### หน้าเว็บต้องใช้ JavaScript

`web_extractor` อาจดึงข้อมูลจากเว็บที่ render ฝั่ง client เป็นหลักไม่สำเร็จ ควรให้โมเดล fallback ไปใช้ browser หรือ extraction tool อื่นสำหรับเว็บเหล่านั้น

## ความเป็นส่วนตัวและค่าใช้จ่าย

- Search queries, URLs, prompts และ model inputs ที่ Harness Tools จัดการจะถูกส่งไปยังบริการของ Alibaba
- การเรียก Harness Tools ใช้ Alibaba Token Plan Credits
- ควรตรวจ terms, privacy policy, regional endpoint requirements และราคาปัจจุบันของ Alibaba ก่อนใช้งาน

## ข้อจำกัด

- การกรองจะซ่อนรายละเอียด Harness call ที่มีอยู่เฉพาะใน provider lifecycle events
- Citation ที่อยู่เฉพาะใน lifecycle items ที่ถูกกรองอาจไม่แสดงใน OpenCode UI
- การตรวจ endpoint อัตโนมัติต้องใช้ `provider.options.baseURL`; หากไม่มีให้กำหนด `endpoint` เอง
- Provider API และการรองรับ tools ของแต่ละโมเดลอาจเปลี่ยนโดยไม่ขึ้นกับปลั๊กอินนี้

## License

MIT ดูรายละเอียดที่ [LICENSE](LICENSE)

## ข้อสงวนสิทธิ์

นี่เป็น community plugin ที่ไม่เป็นทางการ และไม่มีความเกี่ยวข้องหรือการรับรองจาก Alibaba หรือโครงการ OpenCode
