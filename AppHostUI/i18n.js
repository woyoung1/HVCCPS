"use strict";

(function initHvccpsI18n(global) {
  const STORAGE_KEY = "hvccps-ui-language";
  const SUPPORTED = new Set(["en", "zh-CN"]);
  const ATTRIBUTES = ["title", "aria-label", "placeholder"];

  const zh = {
    "G474 HVCCPS Operator Console": "G474 HVCCPS 操作控制台",
    "Operator Console": "操作控制台",
    "System status": "系统状态",
    "Open serial connection panel": "打开串口连接面板",
    "Open run controls": "打开运行控制面板",
    "Monitor view active": "监控视图已启用",
    "live dashboard": "实时仪表盘",
    "Primary work areas": "主要工作区",
    "Serial link": "串口连接",
    "Connect": "连接",
    "Run control": "运行控制",
    "Run": "运行",
    "Single-cycle waveform": "单周期波形",
    "Cycle Plot": "周期波形",
    "Configuration": "配置",
    "Configure": "配置",
    "Front-panel key presets": "前面板按键预设",
    "Presets": "预设",
    "Output calibration": "输出校准",
    "Calibrate": "校准",
    "Undo (Ctrl+Z)": "撤销 (Ctrl+Z)",
    "Redo (Ctrl+Y)": "重做 (Ctrl+Y)",
    "Undo": "撤销",
    "Redo": "重做",
    "Language": "语言",
    "OUTPUT LIVE": "输出已开启",
    "OUTPUT OFF": "输出已关闭",
    "Disable Now": "立即关闭",
    "Telemetry plot": "遥测曲线",
    "Update Targets": "更新目标值",
    "Disable": "关闭输出",
    "Telemetry Plot": "遥测曲线",
    "Select plotted signals": "选择要绘制的信号",
    "Pause plot scrolling": "暂停曲线滚动",
    "Pause": "暂停",
    "Resume": "继续",
    "Restore default plotted signals": "恢复默认绘制信号",
    "Default": "默认",
    "Selected plot signals": "已选择的绘图信号",
    "NO SIGNALS SELECTED": "未选择信号",
    "Signal picker": "信号选择器",
    "Signals": "信号",
    "Close signal picker": "关闭信号选择器",
    "Search": "搜索",
    "vsec, current, raw": "vsec、电流、raw",
    "All": "全选",
    "Clear": "清除",
    "No matching signals": "没有匹配的信号",
    "Power status": "电源状态",
    "Power Status": "电源状态",
    "heartbeat idle": "等待心跳",
    "Secondary Indicators": "次级侧指标",
    "Raw / Debug": "原始值 / 调试",
    "Close serial panel": "关闭串口面板",
    "Authorized Port": "已授权端口",
    "Select Port": "选择端口",
    "Disconnect": "断开连接",
    "Status": "状态",
    "Packet Rate": "数据包速率",
    "Idle": "空闲",
    "READY": "就绪",
    "Run Control": "运行控制",
    "Close run panel": "关闭运行面板",
    "Serial link required": "需要串口连接",
    "Open Serial Link": "打开串口连接",
    "OUTPUT LIVE: target values stay available; start mode and duration are locked.": "输出已开启：仍可调整目标值，启动模式和持续时间已锁定。",
    "OUTPUT LIVE IN FIXED DUTY: disable before changing operating mode or duty.": "输出正以固定占空比运行：请先关闭输出，再更改运行模式或占空比。",
    "Targets": "目标值",
    "Duration": "持续时间",
    "Seconds": "秒",
    "Continuous": "连续运行",
    "Start Mode": "启动模式",
    "Closed-loop CC / CV / CP": "闭环 CC / CV / CP",
    "Fixed duty debug": "固定占空比调试",
    "Fixed Duty": "固定占空比",
    "Fixed duty requires a verified load.": "固定占空比模式必须连接经过确认的负载。",
    "Start Output": "启动输出",
    "Close configuration panel": "关闭配置面板",
    "Configuration tabs": "配置选项卡",
    "Control Loop": "控制环路",
    "Defaults": "默认配置",
    "Configuration locked while output is live": "输出开启时配置已锁定",
    "Disable Output": "关闭输出",
    "Soft-start Step": "软启动步长",
    "Frequency (set · live)": "频率（设定值 · 实时值）",
    "Dead Time": "死区时间",
    "200 ns fixed": "固定 200 ns",
    "Sampling": "采样",
    "Master Timing": "主定时器",
    "Frequency (Hz)": "频率 (Hz)",
    "Frequency Policy": "频率策略",
    "Auto": "自动",
    "Fixed": "固定",
    "Rated 11-45 kHz (fixed MUL4 prescaler); the firmware applies a new period reload on the fly. 24 ADC sub-period triggers fit each switching period.": "额定频率 11–45 kHz（固定 MUL4 预分频）；固件可在线更新周期重载值。每个开关周期包含 24 次 ADC 子周期触发。",
    "ADC Sampling (fixed)": "ADC 采样（固定）",
    "12-bit, 2 ranks (Vsec, Vpri), 2.5 cycle S+H, no oversampling.": "12 位，2 个序列（Vsec、Vpri），2.5 周期采样保持，不使用过采样。",
    "8-bit, 3 ranks (Ipri_ac, Isec, Ipri_dc), 2.5 cycle S+H, no oversampling.": "8 位，3 个序列（Ipri_ac、Isec、Ipri_dc），2.5 周期采样保持，不使用过采样。",
    "Both triggered by HRTIM ADC TRG1 = MASTER·CMP1 + TIM C period (24× per switching cycle). Per-rank sample-time / oversampling are fixed in firmware; the full sequence fits T_sw / 24.": "两路 ADC 均由 HRTIM ADC TRG1 = MASTER·CMP1 + TIM C 周期触发（每个开关周期 24 次）。各序列的采样时间和过采样设置在固件中固定，完整序列可在 T_sw / 24 内完成。",
    "Device configuration actions": "设备配置操作",
    "Draft changes stay in RAM until Save writes a full config record to flash.": "草稿更改仅保存在 RAM 中，点击保存后才会将完整配置记录写入 Flash。",
    "Sync Draft": "同步草稿",
    "Load Flash": "加载 Flash",
    "Load Defaults": "加载默认值",
    "Factory Reset": "恢复出厂设置",
    "Apply Settings": "应用设置",
    "Save Flash": "保存到 Flash",
    "Button Presets": "按键预设",
    "KEY A / B run presets": "按键 A / B 运行预设",
    "Close presets panel": "关闭预设面板",
    "Each front-panel key runs a stored closed-loop preset with no host attached. Press a key to start its preset; while the output is live, pressing any key stops it. Saved presets persist in flash and are available right after power-up.": "无需连接上位机，每个前面板按键都可运行已保存的闭环预设。按下按键启动相应预设；输出开启时按任意键即可停止。预设保存在 Flash 中，上电后立即可用。",
    "OUTPUT LIVE: presets are locked while the output is running.": "输出已开启：运行期间预设已锁定。",
    "Button A": "按键 A",
    "Button B": "按键 B",
    "Enable preset (key A starts it)": "启用预设（按键 A 启动）",
    "Enable preset (key B starts it)": "启用预设（按键 B 启动）",
    "Run Time": "运行时间",
    "Run A now (test)": "立即运行 A（测试）",
    "Run B now (test)": "立即运行 B（测试）",
    "Save Presets to Flash": "保存预设到 Flash",
    "Output Calibration": "输出校准",
    "Close calibration panel": "关闭校准面板",
    "Enter the uncalibrated RAW value reported by the device and the value an external meter measured. The host compiles a residual table (exact at your points, linear between them, smoothly decaying to zero outside) and streams it to a dedicated flash region. Corrections are clamped to ±50 V / ±50 mA in firmware. Writing and enabling calibration touch flash, so the output must be off.": "输入设备报告的未校准 RAW 值和外部仪表实测值。上位机会编译残差表（在输入点处精确匹配、点间线性插值、范围外平滑衰减至零），并将其传输到专用 Flash 区域。固件将校正量限制在 ±50 V / ±50 mA。写入或启用校准会操作 Flash，因此必须先关闭输出。",
    "Collect points with Apply calibration OFF. Use RAW VSEC / RAW ISEC as the input columns, then enter the external meter readings in the measured columns.": "请在“应用校准”关闭时采集数据点。输入列使用 RAW VSEC / RAW ISEC，并在实测列中填写外部仪表读数。",
    "OUTPUT LIVE: calibration is locked while the output is running.": "输出已开启：运行期间校准已锁定。",
    "Device table": "设备校准表",
    "Applied": "应用状态",
    "Apply calibration to the control loop (saved to config flash)": "将校准应用到控制环路（保存到配置 Flash）",
    "Voltage points": "电压校准点",
    "RAW VSEC, meter V, and optionally meter current (mA) for load-dependent correction.": "填写 RAW VSEC、仪表电压，以及用于负载相关校正的可选仪表电流 (mA)。",
    "Meter V": "仪表电压",
    "Meter I (mA, opt)": "仪表电流（mA，可选）",
    "+ Add voltage point": "+ 添加电压点",
    "Current points": "电流校准点",
    "RAW ISEC (mA) and meter I (mA), collected while calibration is disabled.": "填写关闭校准时采集的 RAW ISEC (mA) 和仪表电流 (mA)。",
    "Meter I (mA)": "仪表电流 (mA)",
    "+ Add current point": "+ 添加电流点",
    "Advanced: decay radius": "高级：衰减半径",
    "Voltage R (V)": "电压 R (V)",
    "Current R (mA)": "电流 R (mA)",
    "A lone point fades to zero roughly R away from it. Larger R spreads each correction further.": "单个校准点的影响会在距离约 R 处衰减至零；R 越大，每个校正量的作用范围越广。",
    "Compile & Preview": "编译并预览",
    "Write Table to Flash": "写入校准表到 Flash",
    "Single-Cycle Waveform": "单周期波形",
    "awaiting telemetry": "等待遥测数据",
    "Close cycle plot": "关闭周期波形",
    "Cycle plot signals": "周期波形信号",
    "Overlay": "叠加显示",
    "PWM bands (lead / lag bridge ON)": "PWM 区间（超前桥臂 / 滞后桥臂导通）",
    "Y mode": "Y 轴模式",
    "Normalized 0..full-scale": "归一化 0..满量程",
    "Per-signal full-scale": "各信号独立满量程",
    "Notes": "说明",
    "Plot shows the 24 raw samples per period straight from the device DMA, no smoothing. Slot 0 is at 0% of T_sw, slot 23 is at 95.83%; there is no sample at 100% (the next cycle's slot 0 starts there). Each rank's sample-and-hold happens at a small offset from the trigger; dots are placed at the true sample instant, so you can see VPRI sit ~382 ns after VSEC inside the same trigger slot.": "曲线直接显示设备 DMA 在每个周期内采集的 24 个原始样本，不做平滑。槽位 0 位于 T_sw 的 0%，槽位 23 位于 95.83%；100% 处没有样本（下一周期的槽位 0 从该处开始）。各序列的采样保持时刻相对触发存在微小偏移；数据点绘制在真实采样时刻，因此可看到同一触发槽内 VPRI 比 VSEC 晚约 382 ns。",
    "Debug tools": "调试工具",
    "Debug Tools": "调试工具",
    "Last Enable Summary": "最近一次输出汇总",
    "Duty": "占空比",
    "View Summary": "查看汇总",
    "Copy": "复制",
    "Click View Summary": "点击“查看汇总”",
    "no completed enable window": "暂无已完成的输出时段",
    "No previous enable window": "暂无之前的输出时段",
    "Voltage": "电压",
    "Current": "电流",
    "Power": "功率",
    "Temperature": "温度",
    "Control": "控制",
    "Debug": "调试",
    "Buttons": "按键",
    "Calibration": "校准",
    "Timing": "时序",
    "Auto Frequency": "自动频率",
    "OUTPUT POWER": "输出功率",
    "OUTPUT POWER / W": "输出功率 / W",
    "MOS TEMP": "MOS 温度",
    "MOS TEMP / C": "MOS 温度 / C",
    "MCU TEMP": "MCU 温度",
    "MCU TEMP / C": "MCU 温度 / C",
    "DUTY": "占空比",
    "DUTY / %": "占空比 / %",
    "RUN LEFT": "剩余时间",
    "RUN LEFT / s": "剩余时间 / s",
    "STATUS": "状态",
    "KEY FLAGS": "按键标志",
    "MODE RAW": "原始模式",
    "CONFIG OK": "配置正常",
    "FIXED DUTY": "固定占空比",
    "LATCH ON": "锁存开启",
    "LATCH OFF": "锁存关闭",
    "DRIVE ON": "驱动开启",
    "DRIVE OFF": "驱动关闭",
    "KEY NONE": "无按键",
    "CFG SYNCED": "配置已同步",
    "CFG UNKNOWN": "配置未知",
    "CONFIG BUSY": "配置处理中",
    "DRAFT SYNCED": "草稿已同步",
    "SYNC NEEDED": "需要同步",
    "WEBSERIAL READY": "Web Serial 可用",
    "WEBSERIAL NOT AVAILABLE": "Web Serial 不可用",
    "CONNECTED": "已连接",
    "CONNECTING": "连接中",
    "RECONNECTING": "正在重连",
    "DISCONNECTED": "未连接",
    "opening port": "正在打开端口",
    "serial connecting": "正在连接串口",
    "serial reconnecting": "正在重新连接串口",
    "serial disconnected": "串口未连接",
    "Connected": "已连接",
    "Opening serial port": "正在打开串口",
    "Auto reconnecting": "正在自动重连",
    "Port authorized": "端口已授权",
    "No port selected": "未选择端口",
    "NOT SELECTED": "未选择",
    "AUTHORIZED PORT": "已授权端口",
    "RUN --": "运行 --",
    "RUN CONT": "连续运行",
    "MODE --": "模式 --",
    "MODE FIXED": "固定占空比模式",
    "MODE CC": "恒流模式",
    "MODE CV": "恒压模式",
    "MODE CP": "恒功率模式",
    "MODE ?": "模式未知",
    "SET PENDING": "等待设置",
    "UPLOAD BUSY": "正在上传",
    "TABLE VALID": "校准表有效",
    "TABLE EMPTY": "校准表为空",
    "TABLE UNKNOWN": "校准表未知",
    "NO VALID TABLE": "无有效校准表",
    "ENABLED": "已启用",
    "DISABLED": "已禁用",
    "CHART.JS NOT LOADED": "Chart.js 未加载",
    "No signals": "无信号",
    "no signals": "无信号",
    "No signals selected": "未选择信号",
    "invalid": "无效",
    "optional": "可选",
    "Remove point": "删除校准点",
    "Remove voltage point": "删除电压点",
    "Remove current point": "删除电流点",
    "Dismiss": "关闭",
    "OK": "正常",
    "CONFIGURATION HAS ERRORS": "配置存在错误",
    "CONNECT FIRST": "请先连接",
    "DISABLE OUTPUT BEFORE APPLYING CONFIGURATION": "应用配置前请先关闭输出",
    "DISABLE OUTPUT BEFORE CHANGING CONFIGURATION": "更改配置前请先关闭输出",
    "DISABLE OUTPUT BEFORE SAVING CONFIGURATION": "保存配置前请先关闭输出",
    "DISABLE OUTPUT BEFORE CHANGING CALIBRATION": "更改校准前请先关闭输出",
    "DISABLE OUTPUT BEFORE WRITING CALIBRATION": "写入校准前请先关闭输出",
    "DISABLE OUTPUT BEFORE SAVING PRESETS": "保存预设前请先关闭输出",
    "DEVICE DRAFT SYNCED": "设备草稿已同步",
    "DRAFT APPLIED TO ACTIVE CONFIG": "草稿已应用到当前配置",
    "DRAFT SAVED TO FLASH LOG": "草稿已保存到 Flash 日志",
    "DEFAULTS LOADED TO DRAFT": "默认值已加载到草稿",
    "FLASH LOADED TO DRAFT": "Flash 配置已加载到草稿",
    "FACTORY RESET COMPLETE": "恢复出厂设置完成",
    "START COMMAND SENT": "启动命令已发送",
    "TARGET UPDATE SENT": "目标值更新命令已发送",
    "DISABLE COMMAND SENT": "关闭输出命令已发送",
    "SERIAL PORT AUTHORIZED": "串口已授权",
    "SERIAL LINK CLOSED": "串口连接已关闭",
    "PRESETS APPLIED AND SAVED TO FLASH": "预设已应用并保存到 Flash",
    "CALIBRATION TABLE INFO SYNCED": "校准表信息已同步",
    "CALIBRATION TABLE COMPILED": "校准表已编译",
    "CALIBRATION TABLE WRITTEN TO FLASH": "校准表已写入 Flash",
    "CALIBRATION ENABLED AND SAVED": "校准已启用并保存",
    "CALIBRATION DISABLED AND SAVED": "校准已禁用并保存",
    "RUN SUMMARY COPIED": "运行汇总已复制",
    "NO PREVIOUS ENABLE WINDOW": "暂无之前的输出时段",
    "Another config request is pending.": "已有配置请求正在处理。",
    "Another calibration request is pending.": "已有校准请求正在处理。",
    "Configuration request is pending.": "配置请求正在处理。",
    "Serial not connected.": "串口未连接。",
    "Config response timeout.": "配置响应超时。",
    "copy command rejected": "复制命令被拒绝",
    "RUN DURATION 1..65534 s OR CONTINUOUS": "运行时间应为 1..65534 秒，或选择连续运行",
    "FIXED DUTY 0..100 %": "固定占空比范围为 0..100 %",
    "Voltage decay radius must be >= 10 V": "电压衰减半径必须 ≥ 10 V",
    "Current decay radius must be >= 5 mA": "电流衰减半径必须 ≥ 5 mA",
    "Compiled table preview": "已编译校准表预览",
    "Full voltage dV table": "完整电压 dV 表",
    "Full current dI table": "完整电流 dI 表",
    "RAW V / corrected I axis": "RAW V / 校正电流轴",
    "Cal ISEC": "校准后 ISEC",
    "per-signal full-scale": "各信号独立满量程",
    "normalized 0..full-scale": "归一化 0..满量程",
    "switching period (μs)": "开关周期 (μs)",
    "switching period (% of T_sw)": "开关周期（T_sw 百分比）",
    "effective sample instant": "实际采样时刻",
    "blue = lead bridge": "蓝色 = 超前桥臂",
    "magenta = lag bridge": "品红色 = 滞后桥臂",
    "Q1/PA8 lead": "Q1/PA8 超前桥臂",
    "Q2/PA10 lag": "Q2/PA10 滞后桥臂",
    "live": "实时",
    "preview (no telemetry)": "预览（无遥测数据）",
    "awaiting telemetry": "等待遥测数据"
  };

  const prefixZh = [
    ["APPLY FAILED: ", "应用失败："],
    ["CONFIG COMMAND FAILED: ", "配置命令失败："],
    ["CONFIG SYNC FAILED: ", "配置同步失败："],
    ["CONNECT FAILED: ", "连接失败："],
    ["PORT SELECTION FAILED: ", "端口选择失败："],
    ["COPY FAILED: ", "复制失败："],
    ["SAVE FAILED: ", "保存失败："],
    ["SAVE PRESETS FAILED: ", "保存预设失败："],
    ["SEND FAILED: ", "发送失败："],
    ["CAL INFO FAILED: ", "校准信息读取失败："],
    ["CALIBRATION COMPILE FAILED: ", "校准表编译失败："],
    ["CALIBRATION ENABLE FAILED: ", "校准启用失败："],
    ["CALIBRATION WRITE FAILED: ", "校准写入失败："],
    ["SERIAL READ FAILED: ", "串口读取失败："]
  ];

  const patternsZh = [
    [/^(\d+) selected$/, (m) => `已选择 ${m[1]} 项`],
    [/^(\d+) pkt\/s$/, (m) => `${m[1]} 包/秒`],
    [/^attempt (\d+)$/, (m) => `第 ${m[1]} 次尝试`],
    [/^RUN (\d+) s$/, (m) => `运行剩余 ${m[1]} 秒`],
    [/^KEY (.+)$/, (m) => `按键 ${m[1]}`],
    [/^STATUS (.+)$/, (m) => `状态 ${m[1]}`],
    [/^Remove (.+)$/, (m) => `移除 ${translateNormalized(m[1])}`],
    [/^base (.+) kHz \/ live (.+)$/, (m) => `设定 ${m[1]} kHz / 实时 ${m[2]}`],
    [/^(\d+) packets \/ (.+)$/, (m) => `${m[1]} 个数据包 / ${m[2]}`],
    [/^CV RANGE 0\.\.(.+) V$/, (m) => `CV 范围 0..${m[1]} V`],
    [/^CC RANGE 0\.\.(.+) mA$/, (m) => `CC 范围 0..${m[1]} mA`],
    [/^CP RANGE 0\.\.(.+) W$/, (m) => `CP 范围 0..${m[1]} W`],
    [/^FIXED DUTY (.+) % START SENT$/, (m) => `固定占空比 ${m[1]} % 启动命令已发送`],
    [/^PRESET ([AB]) START SENT$/, (m) => `预设 ${m[1]} 启动命令已发送`],
    [/^Button ([AB]) (CV|CC|CP) 0\.\.(.+) (V|mA|W)$/, (m) => `按键 ${m[1]} ${m[2]} 范围 0..${m[3]} ${m[4]}`],
    [/^Button ([AB]) time 1\.\.65534 s or Continuous$/, (m) => `按键 ${m[1]} 时间应为 1..65534 秒，或选择连续运行`],
    [/^Voltage row (\d+): measured I 0\.\.(.+) mA$/, (m) => `电压行 ${m[1]}：实测电流范围 0..${m[2]} mA`],
    [/^Voltage row (\d+): measured V invalid$/, (m) => `电压行 ${m[1]}：实测电压无效`],
    [/^Voltage row (\d+): RAW VSEC 0\.\.(.+) V$/, (m) => `电压行 ${m[1]}：RAW VSEC 范围 0..${m[2]} V`],
    [/^Current row (\d+): measured I invalid$/, (m) => `电流行 ${m[1]}：实测电流无效`],
    [/^Current row (\d+): RAW ISEC 0\.\.(.+) mA$/, (m) => `电流行 ${m[1]}：RAW ISEC 范围 0..${m[2]} mA`],
    [/^(\d+) voltage points \/ (\d+) current points$/, (m) => `${m[1]} 个电压点 / ${m[2]} 个电流点`],
    [/^image (.+) B \/ full voltage table (.+)$/, (m) => `镜像 ${m[1]} B / 完整电压表 ${m[2]}`],
    [/^showing every compiled dV cell \/ max \|dV\| (.+) V$/, (m) => `显示全部已编译 dV 单元 / 最大 |dV| ${m[1]} V`],
    [/^live raw (.+) -> (.+)$/, (m) => `实时原始值 ${m[1]} -> ${m[2]}`],
    [/^Programming (.+)$/, (m) => `正在写入 ${m[1]}`],
    [/^(.+) response timeout\.$/, (m) => `${m[1]} 响应超时。`],
    [/^duty (.+)% · awaiting telemetry$/, (m) => `占空比 ${m[1]}% · 等待遥测数据`],
    [/^(live|preview \(no telemetry\)) · period (.+)$/, (m) => `${translateNormalized(m[1])} · 周期 ${m[2]}`]
  ];

  let language = resolveInitialLanguage();
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  let observer = null;

  function resolveInitialLanguage() {
    try {
      const stored = global.localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.has(stored)) return stored;
    } catch (_) {}
    return String(global.navigator.language || "en").toLowerCase().startsWith("zh") ? "zh-CN" : "en";
  }

  function normalize(value) {
    return String(value).replace(/\s+/g, " ").trim();
  }

  function translateNormalized(source) {
    if (language === "en" || !source) return source;
    if (Object.prototype.hasOwnProperty.call(zh, source)) return zh[source];
    for (const [prefix, translatedPrefix] of prefixZh) {
      if (source.startsWith(prefix)) return translatedPrefix + translateNormalized(source.slice(prefix.length));
    }
    for (const [pattern, replace] of patternsZh) {
      const match = source.match(pattern);
      if (match) return replace(match);
    }
    return source;
  }

  function translateLine(value) {
    const leading = value.match(/^\s*/)[0];
    const trailing = value.match(/\s*$/)[0];
    const body = normalize(value);
    if (!body) return value;
    const timestamp = body.match(/^(\[[^\]]+\]\s*)(.*)$/);
    const translated = timestamp
      ? timestamp[1] + translateNormalized(timestamp[2])
      : translateNormalized(body);
    return leading + translated + trailing;
  }

  function render(value) {
    if (language === "en") return value;
    const normalized = normalize(value);
    if (Object.prototype.hasOwnProperty.call(zh, normalized)) {
      const leading = value.match(/^\s*/)[0];
      const trailing = value.match(/\s*$/)[0];
      return leading + zh[normalized] + trailing;
    }
    return String(value).split("\n").map(translateLine).join("\n");
  }

  function translateTextNode(node, force = false) {
    const current = node.nodeValue;
    let source = textSources.get(node);
    if (source === undefined || (!force && current !== render(source))) {
      source = current;
      textSources.set(node, source);
    }
    const translated = render(source);
    if (current !== translated) node.nodeValue = translated;
  }

  function translateAttributes(element, force = false) {
    let sources = attributeSources.get(element);
    if (!sources) {
      sources = new Map();
      attributeSources.set(element, sources);
    }
    for (const attribute of ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      let source = sources.get(attribute);
      if (source === undefined || (!force && current !== render(source))) {
        source = current;
        sources.set(attribute, source);
      }
      const translated = render(source);
      if (current !== translated) element.setAttribute(attribute, translated);
    }
  }

  function translateTree(root, force = false) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root, force);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root, force);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, force);
      else translateAttributes(node, force);
      node = walker.nextNode();
    }
  }

  function syncSelectors() {
    document.querySelectorAll("[data-i18n-language]").forEach((select) => {
      select.value = language;
      if (!select.dataset.i18nBound) {
        select.dataset.i18nBound = "true";
        select.addEventListener("change", () => setLanguage(select.value));
      }
    });
  }

  function setLanguage(nextLanguage, persist = true) {
    const next = SUPPORTED.has(nextLanguage) ? nextLanguage : "en";
    const changed = next !== language;
    language = next;
    document.documentElement.lang = next;
    if (persist) {
      try { global.localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    }
    syncSelectors();
    translateTree(document, changed);
    if (changed) document.dispatchEvent(new CustomEvent("hvccps-languagechange", { detail: { language } }));
  }

  function start() {
    setLanguage(language, false);
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTextNode(mutation.target);
        if (mutation.type === "attributes") translateAttributes(mutation.target);
        for (const node of mutation.addedNodes || []) translateTree(node);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES
    });
  }

  global.HvccpsI18n = {
    get language() { return language; },
    setLanguage,
    t(value) { return translateNormalized(normalize(value)); },
    translateTree
  };

  document.addEventListener("DOMContentLoaded", start, { once: true });
})(window);
