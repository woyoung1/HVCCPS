# HVCCPS V1.4

[![Bilibili followers](https://img.shields.io/badge/dynamic/json?color=blue&label=BiliBili&labelColor=white&query=$.data.follower&url=https://api.bilibili.com/x/relation/stat?vmid=1084866085&logo=bilibili)](https://space.bilibili.com/1084866085)
[![YouTube](https://img.shields.io/badge/YouTube-white?logo=youtube&logoColor=FF0000)](https://www.youtube.com/@lyyontop)
[![GitHub last commit](https://img.shields.io/github/last-commit/AzidoPP/HVCCPS-V1.4?color=yellow&logo=github&labelColor=black&label=Latest)](https://github.com/AzidoPP/HVCCPS-V1.4)
[![Star History Chart](https://api.star-history.com/svg?repos=AzidoPP/HVCCPS-V1.4&type=date&legend=top-left)](https://www.star-history.com/#AzidoPP/HVCCPS-V1.4&type=date&legend=top-left)

📺 **项目说明视频：** [在哔哩哔哩观看](https://www.bilibili.com/video/BV1GMjm6cExY)

**QQ交流群：582594264**

<div style="max-width: 1040px; margin: 20px auto 40px; padding: 26px 26px 32px; background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 55%, #e9eef4 100%); border: 1px solid #dbe2ea; color: #1c2733; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; font-size: 15px; line-height: 1.85;">

  <div style="border: 1px solid #e0c7c4; border-left: 4px solid #b3261e; background: #fdf3f2; padding: 14px 16px; margin: 0 0 12px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #b3261e; margin-bottom: 6px;">CAUTION · 致命高压</div>
    <div style="font-size: 15px; line-height: 1.8; color: #4a2320;">本项目涉及致命高压。设备断电后，输出端及电容仍可能储存大量能量。调试和使用前，请确保绝缘保护措施齐备；请勿在缺乏高压操作经验或无人监护的情况下使用。</div>
  </div>

  <div style="border: 1px solid #e3d3ab; border-left: 4px solid #c98a00; background: #fff8ea; padding: 12px 16px; margin: 0 0 24px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #8a5a00; margin-bottom: 6px;">立创开源社区镜像版 · 请以 GitHub 主仓库为准</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #4d3a12;">由于社区审核时间较长、页面缓存和附件同步等因素，本页可能滞后于主仓库。复刻、调试、烧录或采购前，请以 GitHub 仓库中的 README、Release、BOM 和工程文件为准：<a href="https://github.com/AzidoPP/HVCCPS-V1.4" style="color: #8a5a00; font-weight: 800; text-decoration: underline;">github.com/AzidoPP/HVCCPS-V1.4</a></div>
  </div>

  <div style="border: 1px solid #d5dde6; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <img src="https://image.lceda.cn/oshwhub/pullImage/c596c4f2c02e48db8a4622354f19884a.png" alt="HVCCPS V1.4 封面" style="display: block; width: 100%;">
    <div style="padding: 14px 18px; border-top: 1px solid #d5dde6; background: #f6f9fc;">
      <div style="font-size: 11.5px; letter-spacing: 2px; color: #5d6b7a; font-weight: 800;">DIGITAL HIGH VOLTAGE DC-DC POWER SUPPLY</div>
      <div style="font-size: 14.5px; color: #1c2733; margin-top: 6px;">基于 STM32G474CBT6 的数控高压电源 · PSFB 移相全桥拓扑 · 公开固件支持 CV / CC / CP 控制 · GPL-3.0</div>
    </div>
  </div>

  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; border: 1px solid #d5dde6; background: #fff; padding: 13px 16px; margin: 10px 0 22px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <div style="flex: 1 1 340px; font-size: 14.5px; line-height: 1.75; color: #33465c;">如果本项目对您有帮助，欢迎在 GitHub 点亮 Star&nbsp;⭐，这是对开源项目最直接的支持。</div>
    <a href="https://github.com/AzidoPP/HVCCPS-V1.4" style="flex: 0 0 auto; display: inline-block; padding: 8px 15px; border: 1px solid #0f2b46; background: #0f2b46; color: #fff; font-size: 13.5px; font-weight: 700; text-decoration: none;">前往 GitHub 主仓库 ⭐</a>
  </div>

  <div style="border: 1px solid #d5dde6; background: #fff; padding: 4px 0; margin: 0 0 10px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <div style="padding: 10px 16px 8px; font-size: 11.5px; letter-spacing: 1.6px; color: #5d6b7a; font-weight: 800;">目录</div>
    <div style="display: flex; flex-wrap: wrap;">
      <a href="#intro" style="flex: 1 1 460px; display: block; padding: 9px 16px; text-decoration: none; border-top: 1px solid #eef2f6;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 9px;">01</span><span style="color: #0f2b46; font-weight: 700;">项目简介</span><span style="color: #5d6b7a; font-size: 13px;"> · 概述、固件与许可证</span></a>
      <a href="#specs" style="flex: 1 1 460px; display: block; padding: 9px 16px; text-decoration: none; border-top: 1px solid #eef2f6;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 9px;">02</span><span style="color: #0f2b46; font-weight: 700;">技术参数</span><span style="color: #5d6b7a; font-size: 13px;"> · 电气、保护、通信、高压侧</span></a>
      <a href="#arch" style="flex: 1 1 460px; display: block; padding: 9px 16px; text-decoration: none; border-top: 1px solid #eef2f6;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 9px;">03</span><span style="color: #0f2b46; font-weight: 700;">架构</span><span style="color: #5d6b7a; font-size: 13px;"> · PCB、电源、硬件、控制策略</span></a>
      <a href="#build" style="flex: 1 1 460px; display: block; padding: 9px 16px; text-decoration: none; border-top: 1px solid #eef2f6;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 9px;">04</span><span style="color: #0f2b46; font-weight: 700;">制作与装配</span><span style="color: #5d6b7a; font-size: 13px;"> · 制板、变压器、BOM、焊接</span></a>
      <a href="#firmware" style="flex: 1 1 460px; display: block; padding: 9px 16px; text-decoration: none; border-top: 1px solid #eef2f6;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 9px;">05</span><span style="color: #0f2b46; font-weight: 700;">固件烧录与 IAP</span><span style="color: #5d6b7a; font-size: 13px;"> · 固件组成、烧录步骤</span></a>
      <a href="#hostui" style="flex: 1 1 460px; display: block; padding: 9px 16px; text-decoration: none; border-top: 1px solid #eef2f6;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 9px;">06</span><span style="color: #0f2b46; font-weight: 700;">上位机</span><span style="color: #5d6b7a; font-size: 13px;"> · 电源控制、输出校准、Bootloader</span></a>
      <a href="#test" style="flex: 1 1 460px; display: block; padding: 9px 16px; text-decoration: none; border-top: 1px solid #eef2f6;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 9px;">07</span><span style="color: #0f2b46; font-weight: 700;">测试</span><span style="color: #5d6b7a; font-size: 13px;"> · ZVS、波形、启动、纹波、整机</span></a>
      <a href="#license" style="flex: 1 1 460px; display: block; padding: 9px 16px; text-decoration: none; border-top: 1px solid #eef2f6;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 9px;">08</span><span style="color: #0f2b46; font-weight: 700;">许可证与修改记录</span><span style="color: #5d6b7a; font-size: 13px;"> · GPL-3.0、log.md</span></a>
    </div>
  </div>

  <h2 id="intro" style="margin: 46px 0 16px; padding: 0 0 9px; border-bottom: 2px solid #0f2b46; color: #0f2b46; font-size: 23px; font-weight: 800;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 11px;">01</span>项目简介</h2>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">1.1 项目概述</h3>
  <p style="margin: 0 0 12px;">HVCCPS V1.4 是一款基于 <strong>STM32G474CBT6</strong> 的数控高压 DC-DC 电源，功率级采用 <strong>PSFB（Phase-Shifted Full Bridge，移相全桥）</strong>拓扑。它可用于高压电容充电及实验室高压供电，公开版固件支持 <strong>CV（恒压）、CC（恒流）和 CP（恒功率）</strong>控制。</p>
  <p style="margin: 0 0 12px;">在推荐工作条件下，电源输入为 18–28 V DC，公开固件输出限制为 <strong>0–2200 V、0–200 mA、0–400 W</strong>。项目功率密度约为 <strong>40 W/in³</strong>。</p>
  <p style="margin: 0 0 12px;">PCB 使用 EasyEDA（立创 EDA 专业版）设计，GitHub 仓库提供完整的 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/PCB/ProPrj_HVCCPS_V1.4_Release.epro2" style="color: #0b5394; font-weight: 700;">EasyEDA 工程文件</a>、<a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/PCB/Gerber_HVCCPS_V1.4.zip" style="color: #0b5394; font-weight: 700;">Gerber 制板文件</a>和 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/Docs/BOM.xlsx" style="color: #0b5394; font-weight: 700;">BOM</a>，便于复刻与二次开发。</p>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">1.2 固件与许可证说明</h3>
  <p style="margin: 0 0 12px;">为预防闭源商用或闭源抄袭，GitHub 公开仓库目前仅提供编译后的固件，固件源码不直接放在公开分支中。如需源码，请加入 <strong>QQ 群 582594264</strong>，或发送邮件至 <strong>Lanyyontop@gmail.com</strong> 后<strong>免费</strong>获取。</p>
  <p style="margin: 0 0 12px;">本项目公开内容采用 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/LICENSE" style="color: #0b5394; font-weight: 700;">GPL-3.0</a> 许可证。获取、修改或再分发源码及衍生作品时，请遵守许可证条款。</p>

  <h2 id="specs" style="margin: 46px 0 16px; padding: 0 0 9px; border-bottom: 2px solid #0f2b46; color: #0f2b46; font-size: 23px; font-weight: 800;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 11px;">02</span>技术参数</h2>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">2.1 电气参数</h3>

  <table style="width: 100%; border-collapse: collapse; margin: 14px 0 10px; font-size: 14px; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <thead>
      <tr>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left;">参数</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: right;">最小值</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: right;">典型值</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: right;">最大值</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: center;">单位</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left;">说明</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6;">输入电压（DC）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">18</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">24</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">28</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; color: #5d6b7a;">V</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">额定输入电压</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">输入电流（DC）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">20</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; background: #f6f9fc; color: #5d6b7a;">A</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">额定输入电流</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6;">输出电压（DC）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">0</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #5d6b7a;">可调</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">2200</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; color: #5d6b7a;">V</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">输出电流（DC）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">0</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #5d6b7a;">可调</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">200</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; background: #f6f9fc; color: #5d6b7a;">mA</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6;">输出功率（DC）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">0</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #5d6b7a;">可调</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">400</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; color: #5d6b7a;">W</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">开关频率</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">11</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">35</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">45</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; background: #f6f9fc; color: #5d6b7a;">kHz</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">默认自动变频，35 kHz 为基准频率</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6;">栅极驱动死区</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">200</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; color: #5d6b7a;">ns</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">变换效率</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">96</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; background: #f6f9fc; color: #5d6b7a;">%</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">实测峰值，见<a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/Test_Data/efficiency-test.txt" style="color: #0b5394; font-weight: 700;">效率测试数据</a></td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6;">输出电压步进</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">1</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; color: #5d6b7a;">V</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">输出电流步进</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">1</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; background: #f6f9fc; color: #5d6b7a;">mA</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6;">输出电压精度</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">±0.5</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; color: #5d6b7a;">%</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">输出电流精度</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">±1</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; background: #f6f9fc; color: #5d6b7a;">%</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6;">功率密度</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">40</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; color: #5d6b7a;">W/in³</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">按整机有效体积计算</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">整机重量</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">292</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: right; background: #f6f9fc; color: #8b98a6;">—</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; text-align: center; background: #f6f9fc; color: #5d6b7a;">g</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; color: #8b98a6;">—</td></tr>
    </tbody>
  </table>

  <div style="border: 1px solid #cddcef; border-left: 4px solid #2a6db5; background: #f1f6fc; padding: 12px 15px; margin: 14px 0 20px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #0b5394; margin-bottom: 5px;">NOTE</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #24384f;">表中的 28 V 是推荐工作范围上限，母线电容耐压为 35 V，切勿超过 35 V。</div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">2.2 控制与保护参数</h3>

  <table style="width: 100%; border-collapse: collapse; margin: 14px 0 10px; font-size: 14px; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <thead>
      <tr>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left; width: 22%;">项目</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left; width: 30%;">参数</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left;">说明</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-weight: 700;">控制模式</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">CV / CC / CP</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">三环 PI 自动仲裁</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-weight: 700;">固定占空比模式</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">0–100%</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">仅用于调试，仍受软启动约束</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-weight: 700;">软启动</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">每个控制周期最多增加 10% 占空比</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">默认值，可通过上位机配置管理器调整</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-weight: 700;">运行定时</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">连续或 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">1–65534 s</span></td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">到时自动关闭输出</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-weight: 700;">供电 UVLO / OVP</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">母线 &gt;32 V；12 V、5 V、3.3 V 窗口保护</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">下位机内部抑制实际输出，软件 enable 与通讯保持</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-weight: 700;">硬件过流保护（OCP）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">原边 SW 节点交流峰值约 60 A</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">COMP1 → HRTIM FAULT4 异步关断；<strong style="color: #8a5a00;">不是 60 A 输入额定值</strong></td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-weight: 700;">软件过温保护（OTP）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">70 °C</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">MOS NTC 或 MCU 内部温度任一路超过阈值即关断</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-weight: 700;">独立看门狗（IWDG）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">约 200 ms</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">主循环或控制 ISR 异常时触发复位</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-weight: 700;">按键</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">A / B 两组预设</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">可保存 CV、CC、CP 和运行时间，支持脱机运行及停机</td></tr>
    </tbody>
  </table>
  <p style="margin: 0 0 12px; font-size: 13.5px; color: #5d6b7a;">OCP 和 OTP 触发后均会锁存停机状态。再次启动时固件会清除锁存；如果故障条件仍然存在，保护会立即再次触发。</p>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">2.3 控制器与通信参数</h3>

  <div style="display: flex; flex-wrap: wrap; gap: 14px; margin: 14px 0 20px;">
    <div style="flex: 1 1 330px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="padding: 9px 12px; background: #0f2b46; color: #fff; font-size: 12.5px; font-weight: 700; letter-spacing: 0.6px; border: 1px solid #c4cfdb; border-bottom: none;">控制器</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
        <tbody>
          <tr><td style="padding: 9px 12px; border: 1px solid #d5dde6; width: 42%; color: #5d6b7a;">MCU</td><td style="padding: 9px 12px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">STM32G474CBT6</td></tr>
          <tr><td style="padding: 9px 12px; border: 1px solid #d5dde6; background: #f6f9fc; color: #5d6b7a;">外部晶振</td><td style="padding: 9px 12px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">8 MHz HSE</td></tr>
          <tr><td style="padding: 9px 12px; border: 1px solid #d5dde6; color: #5d6b7a;">系统主频</td><td style="padding: 9px 12px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">170 MHz</td></tr>
        </tbody>
      </table>
    </div>
    <div style="flex: 1 1 330px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="padding: 9px 12px; background: #0f2b46; color: #fff; font-size: 12.5px; font-weight: 700; letter-spacing: 0.6px; border: 1px solid #c4cfdb; border-bottom: none;">串口通信</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
        <tbody>
          <tr><td style="padding: 9px 12px; border: 1px solid #d5dde6; width: 42%; color: #5d6b7a;">通信接口</td><td style="padding: 9px 12px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">USART3 · PB10 / PB11</td></tr>
          <tr><td style="padding: 9px 12px; border: 1px solid #d5dde6; background: #f6f9fc; color: #5d6b7a;">串口格式</td><td style="padding: 9px 12px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">115200 baud · 8N1</td></tr>
          <tr><td style="padding: 9px 12px; border: 1px solid #d5dde6; color: #5d6b7a;">上位机接口</td><td style="padding: 9px 12px; border: 1px solid #d5dde6;">WebSerial</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px;">
    <div style="flex: 1 1 240px; border: 1px solid #d5dde6; background: #fff; padding: 11px 14px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">输入连接器</div>
      <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">XT30</div>
    </div>
    <div style="flex: 1 1 240px; border: 1px solid #d5dde6; background: #fff; padding: 11px 14px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">高压输出连接器</div>
      <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">M3</div>
    </div>
  </div>
  <p style="margin: 0 0 12px; font-size: 13.5px; color: #5d6b7a;">USART3 引脚分配为 PB10（TX）/ PB11（RX）。</p>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">2.4 高压侧设计说明</h3>
  <p style="margin: 0 0 12px;">高压副边的 PCB 电气间隙均 <strong>≥ 9.5 mm</strong>，如有需求可以适当改版增加输出电压。</p>
  <p style="margin: 0 0 12px;">如需更高输出电压，必须重新核算并验证变压器匝比、整流二极管、输出电容和反馈网络，同时修改固件参数。</p>

  <h2 id="arch" style="margin: 46px 0 16px; padding: 0 0 9px; border-bottom: 2px solid #0f2b46; color: #0f2b46; font-size: 23px; font-weight: 800;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 11px;">03</span>架构</h2>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">3.1 PCB 布局</h3>
  <p style="margin: 0 0 14px;">PCB 采用 <strong>4 层、1.6 mm 板厚、1 oz 铜厚</strong>设计，常用阻容器件全部采用 0805 封装，便于焊接。顶层主要布置主功率变压器，底层主要布置驱动、控制和采样电路。</p>
  <div style="display: flex; flex-wrap: wrap; gap: 14px; margin: 0 0 22px;">
    <div style="flex: 1 1 320px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/2c29796dbac541de83bec83f04e137e6.png" alt="PCB 顶层" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;"><strong style="color: #0f2b46;">顶层</strong> · 主功率变压器与功率回路</p>
    </div>
    <div style="flex: 1 1 320px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/46c3b7af1b924aa08cf7887466256f91.png" alt="PCB 底层" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;"><strong style="color: #0f2b46;">底层</strong> · 驱动、控制与采样电路</p>
    </div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">3.2 电源架构</h3>
  <p style="margin: 0 0 14px;">功率级采用 PSFB 移相全桥拓扑，通过改变两组桥臂之间的相移调节传输功率。</p>
  <div style="max-width: 940px; margin: 0 auto 22px;">
    <img src="https://image.lceda.cn/oshwhub/pullImage/b349107d51914c9f8f0f85b3dfc7d57b.png" alt="电源架构" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
    <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">电源架构：输入母线 → 全桥 → 变压器 → 高压整流与滤波 → 输出。</p>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">3.3 硬件架构</h3>
  <p style="margin: 0 0 14px;">控制器负责电压、电流、温度和辅助电源采样，并通过 HRTIM 产生带固定死区的四路全桥驱动信号。独立比较器和 HRTIM Fault 通路用于硬件过流关断。</p>
  <div style="max-width: 940px; margin: 0 auto 22px;">
    <img src="https://image.lceda.cn/oshwhub/pullImage/86baa95a7f284a8e82966bb8c7454091.png" alt="硬件架构" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
    <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">硬件架构：采样链路、HRTIM 驱动输出与 COMP1 → FAULT4 硬件保护通路。</p>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">3.4 控制策略架构</h3>
  <p style="margin: 0 0 14px;">每个控制周期按下列顺序执行，构成一条从采样到功率级、再回到采样的闭合信号链。</p>

  <div style="border: 1px solid #d5dde6; background: #fff; margin: 0 0 16px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <div style="display: flex; align-items: stretch;">
      <div style="flex: 0 0 58px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 17px; font-weight: 700; color: #0f2b46;">01</div>
      <div style="flex: 1 1 auto; padding: 12px 16px;">
        <div style="font-weight: 800; color: #0f2b46; margin-bottom: 3px;">运行目标</div>
        <div style="font-size: 14px; line-height: 1.75; color: #33465c;">上位机或 A/B 按键提供 CV、CC、CP 和运行时间；active 配置提供 PI、软启动与变频参数。</div>
      </div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 58px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 17px; font-weight: 700; color: #0f2b46;">02</div>
      <div style="flex: 1 1 auto; padding: 12px 16px;">
        <div style="font-weight: 800; color: #0f2b46; margin-bottom: 3px;">采样与滤波</div>
        <div style="font-size: 14px; line-height: 1.75; color: #33465c;">同步采集 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">VSEC</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">ISEC</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">VPRI</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">IPRI_DC</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">AUX12</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">AUX5</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">VCC</span> 和温度，进行 24 点高速均值 / 峰值及辅助电源滑动平均。</div>
      </div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 58px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 17px; font-weight: 700; color: #0f2b46;">03</div>
      <div style="flex: 1 1 auto; padding: 12px 16px;">
        <div style="font-weight: 800; color: #0f2b46; margin-bottom: 3px;">保护判断</div>
        <div style="font-size: 14px; line-height: 1.75; color: #33465c;">UVLO/OVP 或 OTP 使实际输出关断并令 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">duty = 0</span>；OCP 通过 HRTIM FAULT4 硬件异步关断；正常时形成 Vout、Iout、Pin/Pout 反馈量。</div>
      </div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 58px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 17px; font-weight: 700; color: #0f2b46;">04</div>
      <div style="flex: 1 1 auto; padding: 12px 16px;">
        <div style="font-weight: 800; color: #0f2b46; margin-bottom: 3px;">闭环仲裁</div>
        <div style="font-size: 14px; line-height: 1.75; color: #33465c;">CV、CC、CP 三个 PI 并行计算，取 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; background: #eef2f7; border: 1px solid #dde5ee; padding: 1px 5px;">min(CV, CC, CP)</span> 的最小占空比，经只限制 duty 上升的软启动限速后写入 HRTIM CMP3。</div>
      </div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 58px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 17px; font-weight: 700; color: #0f2b46;">05</div>
      <div style="flex: 1 1 auto; padding: 12px 16px;">
        <div style="font-weight: 800; color: #0f2b46; margin-bottom: 3px;">功率与变频</div>
        <div style="font-size: 14px; line-height: 1.75; color: #33465c;">HRTIM 驱动带固定约 200 ns 死区的 PSFB 功率级，输出返回 ADC 采样；TIM7 根据 duty 计分与前馈自动调整开关频率。</div>
      </div>
    </div>
  </div>

  <div style="border-left: 4px solid #0f2b46; background: #f6f9fc; padding: 12px 16px; margin: 0 0 20px;">
    <p style="margin: 0; font-size: 14.5px; line-height: 1.8;">控制器本质上是<strong>三环并联的占空比限制器</strong>：CV、CC、CP 三个 PI 同时给出允许的移相占空比，固件取其中最小值作为实际控制量，再经过软启动限速后写入 HRTIM。</p>
  </div>

  <h2 id="build" style="margin: 46px 0 16px; padding: 0 0 9px; border-bottom: 2px solid #0f2b46; color: #0f2b46; font-size: 23px; font-weight: 800;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 11px;">04</span>制作与装配</h2>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">4.1 制板</h3>
  <p style="margin: 0 0 14px;">从 GitHub 仓库下载 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/PCB/Gerber_HVCCPS_V1.4.zip" style="color: #0b5394; font-weight: 700;">Gerber 制板文件</a>后下单，推荐参数如下：</p>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 22px;">
    <div style="flex: 1 1 180px; border: 1px solid #d5dde6; background: #fff; padding: 11px 14px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">层数</div>
      <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 19px; font-weight: 700; color: #0f2b46;">4 层</div>
    </div>
    <div style="flex: 1 1 180px; border: 1px solid #d5dde6; background: #fff; padding: 11px 14px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">板厚</div>
      <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 19px; font-weight: 700; color: #0f2b46;">1.6 mm</div>
    </div>
    <div style="flex: 1 1 180px; border: 1px solid #d5dde6; background: #fff; padding: 11px 14px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">外层铜厚</div>
      <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 19px; font-weight: 700; color: #0f2b46;">1 oz</div>
    </div>
    <div style="flex: 1 1 180px; border: 1px solid #d5dde6; background: #fff; padding: 11px 14px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">内层铜厚</div>
      <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 19px; font-weight: 700; color: #0f2b46;">0.5 oz</div>
    </div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">4.2 变压器</h3>
  <div style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 18px; margin: 14px 0 16px;">
    <div style="flex: 1 1 340px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/55bef8b8b71141f8857a10ec88f47625.jpg" alt="变压器打样参数" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">交付打样厂的绕组与引脚定义图。</p>
    </div>
    <div style="flex: 1 1 340px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
        <tbody>
          <tr><td style="padding: 8px 12px; border: 1px solid #d5dde6; width: 42%; color: #5d6b7a;">磁芯</td><td style="padding: 8px 12px; border: 1px solid #d5dde6; font-weight: 700; color: #0f2b46;">EC49，40 材</td></tr>
          <tr><td style="padding: 8px 12px; border: 1px solid #d5dde6; background: #f6f9fc; color: #5d6b7a;">匝数</td><td style="padding: 8px 12px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">初级 9 匝 / 次级 900 匝</td></tr>
          <tr><td style="padding: 8px 12px; border: 1px solid #d5dde6; color: #5d6b7a;">匝数比</td><td style="padding: 8px 12px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">1:100</td></tr>
          <tr><td style="padding: 8px 12px; border: 1px solid #d5dde6; background: #f6f9fc; color: #5d6b7a;">初级绕组引脚</td><td style="padding: 8px 12px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">2–3</td></tr>
          <tr><td style="padding: 8px 12px; border: 1px solid #d5dde6; color: #5d6b7a;">次级绕组引脚</td><td style="padding: 8px 12px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">5–8</td></tr>
          <tr><td style="padding: 8px 12px; border: 1px solid #d5dde6; background: #f6f9fc; color: #5d6b7a;">次级线径</td><td style="padding: 8px 12px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">0.3 mm</td></tr>
          <tr><td style="padding: 8px 12px; border: 1px solid #d5dde6; color: #5d6b7a;">气隙</td><td style="padding: 8px 12px; border: 1px solid #d5dde6;">不需要</td></tr>
          <tr><td style="padding: 8px 12px; border: 1px solid #d5dde6; background: #f6f9fc; color: #5d6b7a;">其他要求</td><td style="padding: 8px 12px; border: 1px solid #d5dde6; background: #f6f9fc;">尽量减小漏感，完成后灌胶密封</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <p style="margin: 0 0 12px;">初级绕组应尽量选用较粗导线，载流能力需 <strong>≥ 30 A</strong>。灌胶前裁掉 1、4、6、7 脚及中间两个多余引脚；绕线方向正反均可。</p>
  <p style="margin: 0 0 12px;">当前项目的变压器是在淘宝店铺“<a href="https://shop339657327.taobao.com" style="color: #0b5394; font-weight: 700;">祥润电子磁芯骨架</a>”定做打样的。</p>
  <div style="border: 1px solid #cddcef; border-left: 4px solid #2a6db5; background: #f1f6fc; padding: 12px 15px; margin: 14px 0 20px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #0b5394; margin-bottom: 5px;">NOTE · 收货验收</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #24384f;">变压器打样后漏感应小于 <strong>10 µH</strong>，励磁电感应大于 <strong>300 µH</strong>。</div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">4.3 BOM 与关键器件</h3>

  <div style="border: 1px solid #e3d3ab; border-left: 4px solid #c98a00; background: #fff8ea; padding: 12px 15px; margin: 14px 0 16px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #8a5a00; margin-bottom: 5px;">IMPORTANT · 采购前必读</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #4d3a12;">BOM 以 GitHub 仓库中的 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/Docs/BOM.xlsx" style="color: #8a5a00; font-weight: 800; text-decoration: underline;">Docs/BOM.xlsx</a> 及本节关键器件说明为准，<strong>请勿使用立创 EDA 工程导出的 BOM</strong>。</div>
  </div>

  <p style="margin: 0 0 12px;">完整物料清单见 GitHub 仓库中的 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/Docs/BOM.xlsx" style="color: #0b5394; font-weight: 700;">Docs/BOM.xlsx</a>。以下器件在采购时需要特别留意，表中<span style="color: #8a5a00; font-weight: 700;">琥珀色</span>标注的是最容易买错的几项：</p>

  <table style="width: 100%; border-collapse: collapse; margin: 14px 0 10px; font-size: 14px; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <thead>
      <tr>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left; width: 12%;">位号</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left; width: 45%;">器件 / 建议</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left;">注意事项</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">L1</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;"><a href="https://item.taobao.com/item.htm?id=524929973196" style="color: #0b5394; font-weight: 700;">参考链接</a></td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">R8</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">10 kΩ NTC，B = 3450 K（<a href="https://detail.tmall.com/item.htm?id=610279139920" style="color: #0b5394; font-weight: 700;">参考链接</a>）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; color: #8a5a00; font-weight: 700;">注意核对 B 值</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">Q1–Q4</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">CSD18540 或 CSD19531</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8a5a00; font-weight: 700;">注意管子来源</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">R24–R28</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">Viking（光颉）高压电阻，2 MΩ、2512、3000 V（<a href="https://item.taobao.com/item.htm?id=987002402599" style="color: #0b5394; font-weight: 700;">参考链接</a>）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; color: #8b98a6;">—</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">U7、U8</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">UCC27211；可替换为 SLM27211</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8a5a00; font-weight: 700;">市面上 UCC27211 假货较多，SLM27211 可 Pin-to-Pin 替换</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">U9</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">EE8.3 1:200 电流互感器（<a href="https://item.taobao.com/item.htm?id=721406076659" style="color: #0b5394; font-weight: 700;">参考链接</a>）</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; color: #8a5a00; font-weight: 700;">注意是 1:200，而不是 1:100</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">U6</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">ACS712-20A</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; color: #8a5a00; font-weight: 700;">注意是 20 A 量程的版本，不是 30 A</td></tr>
    </tbody>
  </table>
  <p style="margin: 0 0 12px; font-size: 13.5px; color: #5d6b7a;">其余元器件请按照 BOM 采购。</p>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">4.4 焊接与检查</h3>
  <p style="margin: 0 0 14px;">推荐使用锡膏和加热台或回流焊完成贴片焊接。这里就不过多赘述了，相信复刻本项目的同学都是焊接老手了。</p>
  <div style="display: flex; flex-wrap: wrap; gap: 14px; margin: 0 0 20px;">
    <div style="flex: 0 1 320px; max-width: 320px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/6640d359660946fb9f9c18479000e8ce.png" alt="制作完成正面" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;"><strong style="color: #0f2b46;">制作完成 · 正面</strong></p>
    </div>
    <div style="flex: 0 1 320px; max-width: 320px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/a42465ba650147b5ba4522648195e70e.png" alt="制作完成背面" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;"><strong style="color: #0f2b46;">制作完成 · 背面</strong></p>
    </div>
  </div>

  <div style="border: 1px solid #e0c7c4; border-left: 4px solid #b3261e; background: #fdf3f2; padding: 12px 15px; margin: 0 0 16px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #b3261e; margin-bottom: 5px;">CAUTION · 上电前检查</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #4a2320;">焊接完成后，为避免造成无谓的损失，请一定要通过丝印标记检查各个芯片（尤其是驱动芯片）的朝向无误。如果方向错误，很可能导致<strong>主控烧毁</strong>。</div>
  </div>
  <div style="max-width: 360px; margin: 0 0 22px;">
    <img src="https://image.lceda.cn/oshwhub/pullImage/f0b15405fd60425090a1e6cab46d95a3.png" alt="检查芯片安装方向" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
    <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">对照丝印逐一核对芯片第 1 脚方向。</p>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">4.5 输出电容</h3>
  <div style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 18px; margin: 14px 0 22px;">
    <div style="flex: 0 1 460px; max-width: 460px;">
      <p style="margin: 0 0 12px;">作为通用高压电源使用时，可外接薄膜电容作为输出滤波电容（<a href="https://item.taobao.com/item.htm?id=814880889031" style="color: #0b5394; font-weight: 700;">购买链接</a>）；作为高压电容充电器使用时，可以不安装该电容。</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px;">
        <div style="flex: 1 1 130px; border: 1px solid #d5dde6; background: #fff; padding: 10px 13px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
          <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">耐压</div>
          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">4000 V</div>
        </div>
        <div style="flex: 1 1 130px; border: 1px solid #d5dde6; background: #fff; padding: 10px 13px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
          <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">容量</div>
          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">0.2 µF</div>
        </div>
      </div>
      <p style="margin: 0;">连接电容的时候先在引脚上焊接端子，再使用螺丝固定到输出端。</p>
    </div>
    <div style="flex: 0 1 300px; max-width: 300px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/fe16bb532e42410d98fdd04c98ca2bd2.png" alt="输出电容连接" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">端子先焊后拧，避免直接在输出端子上施焊。</p>
    </div>
  </div>

  <h2 id="firmware" style="margin: 46px 0 16px; padding: 0 0 9px; border-bottom: 2px solid #0f2b46; color: #0f2b46; font-size: 23px; font-weight: 800;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 11px;">05</span>固件烧录与 IAP 更新</h2>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">5.1 固件组成</h3>
  <p style="margin: 0 0 14px;">发布固件由两个 Intel HEX 文件组成，可从 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/releases" style="color: #0b5394; font-weight: 700;">GitHub Releases</a> 下载：</p>
  <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px; font-size: 14px; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <thead>
      <tr>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left; width: 26%;">固件</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left; width: 20%;">起始地址</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left;">作用</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-weight: 700; color: #0f2b46;">Bootloader HEX</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">0x08000000</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">启动检查及串口 IAP 更新</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-weight: 700; color: #0f2b46;">App HEX</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #0f2b46;">0x08004000</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">电源控制、保护、遥测和上位机通信</td></tr>
    </tbody>
  </table>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">5.2 烧录准备</h3>
  <div style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 18px; margin: 14px 0 16px;">
    <div style="flex: 0 1 300px; max-width: 300px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/6849ec03bda242669d860d72b38f338a.png" alt="烧录所需设备" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">烧录所需的全部硬件。</p>
    </div>
    <div style="flex: 1 1 340px;">
      <div style="border: 1px solid #d5dde6; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
        <div style="padding: 9px 14px; background: #f6f9fc; border-bottom: 1px solid #d5dde6; font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 800;">需要准备的硬件</div>
        <div style="padding: 10px 14px; border-bottom: 1px solid #eef2f6;">ST-Link V2</div>
        <div style="padding: 10px 14px; border-bottom: 1px solid #eef2f6;">USB 转 TTL 模块</div>
        <div style="padding: 10px 14px; border-bottom: 1px solid #eef2f6;">SH1.0 转 2.54 mm 转接板</div>
        <div style="padding: 10px 14px;">SH1.0 接口连接线</div>
      </div>
    </div>
  </div>
  <p style="margin: 0 0 12px;">在电脑中下载安装 <a href="https://www.st.com/en/development-tools/stsw-link004.html" style="color: #0b5394; font-weight: 700;">STM32 ST-LINK Utility</a>。IAP 烧录页面和上位机无需安装，可直接在浏览器中打开：<a href="https://azidopp.github.io/HVCCPS-V1.4/BootLoaderHostUI/" style="color: #0b5394; font-weight: 700;">在线烧录器</a>、<a href="https://azidopp.github.io/HVCCPS-V1.4/AppHostUI/" style="color: #0b5394; font-weight: 700;">在线上位机</a>；也可以从 <a href="https://github.com/AzidoPP/HVCCPS-V1.4" style="color: #0b5394; font-weight: 700;">GitHub 仓库</a>下载后离线使用。</p>
  <p style="margin: 0 0 20px;"><strong>完整操作过程见：<a href="https://github.com/AzidoPP/HVCCPS-V1.4/releases/download/videos-v1.4/HVCCPS-V1.4-Flashing-Tutorial.mp4" style="color: #0b5394;">固件烧录视频教程</a>。</strong></p>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">5.3 烧录方法</h3>
  <p style="margin: 0 0 10px;">板上通信接口引脚依次为：</p>
  <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 16px;">
    <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: #eef2f7; border: 1px solid #dde5ee; padding: 5px 11px; color: #0f2b46; font-weight: 700;">SWCLK</span>
    <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: #eef2f7; border: 1px solid #dde5ee; padding: 5px 11px; color: #0f2b46; font-weight: 700;">SWDIO</span>
    <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: #eef2f7; border: 1px solid #dde5ee; padding: 5px 11px; color: #0f2b46; font-weight: 700;">TX</span>
    <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: #eef2f7; border: 1px solid #dde5ee; padding: 5px 11px; color: #0f2b46; font-weight: 700;">RX</span>
    <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: #eef2f7; border: 1px solid #dde5ee; padding: 5px 11px; color: #0f2b46; font-weight: 700;">GND</span>
    <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: #eef2f7; border: 1px solid #dde5ee; padding: 5px 11px; color: #0f2b46; font-weight: 700;">3.3 V</span>
    <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: #eef2f7; border: 1px solid #dde5ee; padding: 5px 11px; color: #0f2b46; font-weight: 700;">SDA</span>
    <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: #eef2f7; border: 1px solid #dde5ee; padding: 5px 11px; color: #0f2b46; font-weight: 700;">SCL</span>
  </div>
  <p style="margin: 0 0 10px;">烧录分为以下两个阶段：</p>
  <table style="width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: 14px; background: #fff; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <thead>
      <tr>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left; width: 26%;">阶段</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left; width: 34%;">需要连接的引脚</th>
        <th style="padding: 10px 11px; border: 1px solid #c4cfdb; background: #0f2b46; color: #fff; font-size: 12.5px; letter-spacing: 0.6px; text-align: left;">连接设备</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-weight: 700;">首次烧录 Bootloader</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">SWCLK · SWDIO · GND · 3.3 V</td><td style="padding: 9px 11px; border: 1px solid #d5dde6;">ST-Link V2</td></tr>
      <tr><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-weight: 700;">IAP 烧录 App</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">TX · RX · GND · 3.3 V</td><td style="padding: 9px 11px; border: 1px solid #d5dde6; background: #f6f9fc;">USB 转 TTL 模块，TX/RX 交叉连接</td></tr>
    </tbody>
  </table>

  <div style="border: 1px solid #e3d3ab; border-left: 4px solid #c98a00; background: #fff8ea; padding: 12px 15px; margin: 0 0 18px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #8a5a00; margin-bottom: 5px;">WARNING</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #4d3a12;">操作前必须断开高压输出负载。确保安全。</div>
  </div>

  <div style="border: 1px solid #d5dde6; background: #fff; margin: 0 0 22px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <div style="display: flex; align-items: stretch;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">1</div>
      <div style="flex: 1 1 auto; padding: 12px 16px; font-size: 14.5px; line-height: 1.75;">将板卡的 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">SWCLK</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">SWDIO</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">GND</span> 和 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">3.3 V</span> 与 ST-Link V2 对应连接。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">2</div>
      <div style="flex: 1 1 auto; padding: 12px 16px; font-size: 14.5px; line-height: 1.75;">
        打开 STM32 ST-LINK Utility，选择 Bootloader HEX 文件并执行烧录。
        <div style="max-width: 560px; margin: 12px 0 2px;">
          <img src="https://image.lceda.cn/oshwhub/pullImage/38f43fc627214e75aa7420e296def66e.png" alt="使用 ST-LINK Utility 烧录 Bootloader" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
        </div>
      </div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">3</div>
      <div style="flex: 1 1 auto; padding: 12px 16px; font-size: 14.5px; line-height: 1.75;">烧录完成后复位板卡。<span style="color: #16713a; font-weight: 700;">完成判据：<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">LED_A</span> 点亮，说明 Bootloader 已正常启动。</span></div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">4</div>
      <div style="flex: 1 1 auto; padding: 12px 16px; font-size: 14.5px; line-height: 1.75;">断开 ST-Link，改用 USB 转 TTL 模块连接板卡的 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">TX</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">RX</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">GND</span> 和 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">3.3 V</span>，其中 TX 与 RX 需要交叉连接。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">5</div>
      <div style="flex: 1 1 auto; padding: 12px 16px; font-size: 14.5px; line-height: 1.75;">打开<a href="https://azidopp.github.io/HVCCPS-V1.4/BootLoaderHostUI/" style="color: #0b5394; font-weight: 700;">在线 IAP 烧录页面</a>；也可以从 <a href="https://github.com/AzidoPP/HVCCPS-V1.4" style="color: #0b5394; font-weight: 700;">GitHub 仓库</a>下载后离线打开。请使用最新版 Chrome 或 Edge。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">6</div>
      <div style="flex: 1 1 auto; padding: 12px 16px; font-size: 14.5px; line-height: 1.75;">
        在页面中连接串口并选择 App HEX 文件，点击烧录后按下板卡的 <strong>RST</strong> 键。
        <div style="max-width: 700px; margin: 12px 0 2px;">
          <img src="https://image.lceda.cn/oshwhub/pullImage/6512dad1e02b4845b77f222e0731e220.png" alt="使用 IAP 页面烧录 App 固件" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
        </div>
      </div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">7</div>
      <div style="flex: 1 1 auto; padding: 12px 16px; font-size: 14.5px; line-height: 1.75;">等待传输和校验完成，再次复位板卡。<span style="color: #16713a; font-weight: 700;">完成判据：<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">LED_A</span> 持续闪烁，说明 App 已成功启动。</span></div>
    </div>
  </div>

  <h2 id="hostui" style="margin: 46px 0 16px; padding: 0 0 9px; border-bottom: 2px solid #0f2b46; color: #0f2b46; font-size: 23px; font-weight: 800;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 11px;">06</span>上位机</h2>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">6.1 电源控制上位机</h3>
  <p style="margin: 0 0 12px;">用 Chrome 或 Edge 打开<a href="https://azidopp.github.io/HVCCPS-V1.4/AppHostUI/" style="color: #0b5394; font-weight: 700;">在线电源控制上位机</a>即可使用；也可以从 <a href="https://github.com/AzidoPP/HVCCPS-V1.4" style="color: #0b5394; font-weight: 700;">GitHub 仓库</a>下载后离线打开，无需构建步骤和网络连接。</p>
  <p style="margin: 0 0 14px;">首次使用建议先观看：<a href="https://github.com/AzidoPP/HVCCPS-V1.4/releases/download/videos-v1.4/HVCCPS-V1.4-Host-Control-Tutorial.mp4" style="color: #0b5394; font-weight: 700;">上位机连接与控制视频教程</a>。</p>

  <div style="border: 1px solid #d5dde6; background: #fff; margin: 0 0 16px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <div style="padding: 9px 16px; background: #f6f9fc; border-bottom: 1px solid #d5dde6; font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 800;">页面通过 WebSerial 提供以下功能</div>
    <div style="padding: 11px 16px; border-bottom: 1px solid #eef2f6; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">固定命令栏</strong> · 启停控制以及 CV、CC、CP 目标的实时更新，定时运行过程中修改目标不会重置计时</div>
    <div style="padding: 11px 16px; border-bottom: 1px solid #eef2f6; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">固定占空比调试</strong> · 发送开环指令前会弹出显式确认对话框</div>
    <div style="padding: 11px 16px; border-bottom: 1px solid #eef2f6; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">遥测</strong> · 电压、电流、功率、温度和保护状态</div>
    <div style="padding: 11px 16px; border-bottom: 1px solid #eef2f6; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">实时曲线与单周期采样波形</strong> · 纵轴刻度对准所选基准信号，点击图例即可切换；暂停只冻结显示，采样不中断，恢复后曲线连续</div>
    <div style="padding: 11px 16px; border-bottom: 1px solid #eef2f6; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">参数配置</strong> · PI、开关频率、自动变频及软启动</div>
    <div style="padding: 11px 16px; border-bottom: 1px solid #eef2f6; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">预设管理</strong> · 前面板 A/B 按键预设</div>
    <div style="padding: 11px 16px; border-bottom: 1px solid #eef2f6; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">中英文切换</strong> · 命令栏与导航控件的位置不会移动</div>
    <div style="padding: 11px 16px; border-bottom: 1px solid #eef2f6; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">Tools 区域</strong> · 运行摘要、帧检查和声明式自动测试序列</div>
    <div style="padding: 11px 16px; font-size: 14.5px; line-height: 1.75;"><strong style="color: #0f2b46;">离线校准</strong> · 校准表可离线编辑与预览，只有写入或启用校准时才需要连接设备</div>
  </div>

  <div style="margin: 0 0 16px;">
    <img src="https://image.lceda.cn/oshwhub/pullImage/41dbbd78c6a14702a8850ca1d7ec0439.png" alt="电源控制上位机" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
    <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">电源控制上位机界面。</p>
  </div>

  <p style="margin: 0 0 12px;">连接参数为 <strong>115200 baud、8N1</strong>。建议使用最新版 Chrome 或 Edge，并一次只打开一个占用该串口的页面。</p>

  <div style="border: 1px solid #cddcef; border-left: 4px solid #2a6db5; background: #f1f6fc; padding: 12px 15px; margin: 14px 0 16px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #0b5394; margin-bottom: 5px;">NOTE · 串口授权</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #24384f;">通过 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">file://</span> 打开时，浏览器无法持久保存串口授权，重新打开页面后需要再次选择串口；如果希望保留授权，可以用 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">http://127.0.0.1</span> 提供该目录。</div>
  </div>

  <div style="border: 1px solid #e2e8ef; background: #f8fafc; padding: 12px 15px; margin: 0 0 20px;">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #5d6b7a; margin-bottom: 5px;">开发者说明</div>
    <div style="font-size: 13.5px; line-height: 1.8; color: #4a5766;">上位机仍然是纯 HTML/CSS/JavaScript，但实现已拆分为 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">AppHostUI/src/</span> 下的 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">core</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">protocol</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">device</span>、<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">ui</span> 和 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">plugins</span> 分层。<span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">AppHostUI/src/loader.js</span> 提供了一个小型的 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">HV.define()</span> / <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">HV.require()</span> 注册表，因此模块化源码仍然可以通过普通 script 标签从 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">file://</span> 加载。扩展可以通过插件宿主注册工具面板和状态芯片，测试或回放工具可以使用受支持的 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">window.HVCCPS</span> API。</div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">6.2 输出校准步骤</h3>
  <p style="margin: 0 0 14px;">输出 V/I 校准需要使用 <strong>V0.0.3 或更新版本 App 固件</strong>。校准表会写入 App 独立保留的 flash 区，IAP 更新 App 时不会擦除；但写表和启用校准都会操作 flash，必须在输出关闭时进行。</p>

  <div style="border: 1px solid #e0c7c4; border-left: 4px solid #b3261e; background: #fdf3f2; padding: 12px 15px; margin: 0 0 18px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #b3261e; margin-bottom: 5px;">CAUTION</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #4a2320;">校准时仍然会接触高压输出。接线、测量、换挡和改负载前必须关闭输出并确认输出端已经充分放电。不要在无人监护或绝缘措施不足的情况下校准。</div>
  </div>

  <div style="border: 1px solid #d5dde6; background: #fff; margin: 0 0 16px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
    <div style="display: flex; align-items: stretch;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">1</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">烧录或更新到 V0.0.3 App 固件，连接电源控制上位机，确认串口通讯正常。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">2</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">打开上位机顶栏的 <strong>Calibrate</strong> 面板，先保持 <strong>Apply calibration to the control loop</strong> 关闭。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">3</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">在目标电压、电流和负载点下运行电源，用外部万用表或高压表记录实际输出。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">4</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">
        停止输出并放电，在校准面板中填写采样点：
        <ul style="margin: 8px 0 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">电压点填写上位机显示的 <strong>RAW VSEC</strong> 和外部表测得的电压。</li>
          <li style="margin-bottom: 4px;">如果该电压点对应固定负载电流，可同时填写外部表测得的电流，用于负载相关的二维电压修正。</li>
          <li>电流点填写上位机显示的 <strong>RAW ISEC</strong> 和外部表测得的电流。</li>
        </ul>
      </div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">5</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">建议先采 2–5 个覆盖常用工作区的电压点；如果只关心某个工作点，也可以先采单点。电流校准可按常用负载电流范围补充 1–3 个点。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">6</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">点击 <strong>Compile &amp; Preview</strong>，检查预览表中的修正量是否合理。固件会把电压修正钳位在 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">±50 V</span>、电流修正钳位在 <span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">±50 mA</span>，超出这个范围说明采样点或外部测量可能有误。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">7</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">确认输出仍为关闭状态后，点击 <strong>Write Table to Flash</strong>，等待上传进度完成。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">8</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">勾选 <strong>Apply calibration to the control loop</strong>，上位机会把启用开关写入并保存到配置 flash。</div>
    </div>
    <div style="display: flex; align-items: stretch; border-top: 1px solid #d5dde6;">
      <div style="flex: 0 0 50px; background: #f6f9fc; border-right: 1px solid #d5dde6; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 700; color: #0f2b46;">9</div>
      <div style="flex: 1 1 auto; padding: 11px 16px; font-size: 14.5px; line-height: 1.75;">重新低功率启动，使用外部表复测输出。如果误差仍偏大，保持校准关闭重新采集 RAW 点，或补充新的采样点后再次写表。</div>
    </div>
  </div>

  <div style="border: 1px solid #cddcef; border-left: 4px solid #2a6db5; background: #f1f6fc; padding: 12px 15px; margin: 0 0 20px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #0b5394; margin-bottom: 5px;">NOTE · 不要重复叠加修正</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #24384f;">校准点应始终使用校准关闭时的 RAW 值作为输入。不要把已经应用校准后的普通 VSEC / ISEC 读数再次填入 RAW 列，否则会把修正量重复叠加。</div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">6.3 Bootloader 上位机</h3>
  <p style="margin: 0 0 14px;"><a href="https://azidopp.github.io/HVCCPS-V1.4/BootLoaderHostUI/" style="color: #0b5394; font-weight: 700;">在线 IAP 烧录页面</a>（同样可从 GitHub 仓库下载后离线使用）支持 Intel HEX 解析、地址范围校验、串口握手、分块传输、进度显示和错误日志，仅用于更新 App 固件。</p>
  <div style="margin: 0 0 22px;">
    <img src="https://image.lceda.cn/oshwhub/pullImage/f88bce7b1618450e84d71942d73f5c17.png" alt="Bootloader 上位机" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
    <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">Bootloader 上位机（IAP 烧录页面）界面。</p>
  </div>

  <h2 id="test" style="margin: 46px 0 16px; padding: 0 0 9px; border-bottom: 2px solid #0f2b46; color: #0f2b46; font-size: 23px; font-weight: 800;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 11px;">07</span>测试</h2>

  <p style="margin: 0 0 14px;">本项目的教程及测试视频统一收录在 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/releases/tag/videos-v1.4" style="color: #0b5394; font-weight: 700;">HVCCPS V1.4 视频教程与测试 Release</a> 中。</p>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 22px;">
    <div style="flex: 1 1 240px; border: 1px solid #d5dde6; background: #fff; padding: 11px 14px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">示波器</div>
      <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">SDS804X</div>
    </div>
    <div style="flex: 1 1 240px; border: 1px solid #d5dde6; background: #fff; padding: 11px 14px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
      <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">万用表</div>
      <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">VC980D</div>
    </div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">7.1 ZVS 零电压开通</h3>
  <p style="margin: 0 0 14px;">实测主功率管能够实现 ZVS 零电压开通：开关节点电压先降至 0 V 附近，随后栅极驱动信号到来并使 MOSFET 导通。移相全桥利用变压器漏感续流实现软开关，以降低高频开关损耗。</p>
  <p style="margin: 0 0 14px;">测试重点观察较难实现 ZVS 的滞后桥臂下管；当滞后桥臂满足 ZVS 条件时，超前桥臂通常也能实现 ZVS。</p>
  <div style="max-width: 300px; margin: 0 0 18px;">
    <img src="https://image.lceda.cn/oshwhub/pullImage/5a5729cd4cd94275a723c7829a9dc62c.png" alt="ZVS 测试探头连接" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
    <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">示波器探头连接方式。</p>
  </div>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 12px;">
    <div style="flex: 1 1 240px;"><img src="https://image.lceda.cn/oshwhub/pullImage/4d54e5a30e12479489c3e1627275b0eb.png" alt="ZVS 波形 1" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
    <div style="flex: 1 1 240px;"><img src="https://image.lceda.cn/oshwhub/pullImage/40796f044c9c4a83b60e77b274b3b40f.png" alt="ZVS 波形 2" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
    <div style="flex: 1 1 240px;"><img src="https://image.lceda.cn/oshwhub/pullImage/a66d5b1b37a3442cbc7921ef9c1f7d91.png" alt="ZVS 波形 3" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
  </div>
  <div style="border: 1px solid #e2e8ef; background: #f8fafc; padding: 10px 14px; margin: 0 0 16px; font-size: 13px; color: #4a5766;">
    <span style="display: inline-block; width: 11px; height: 11px; background: #2f6fd0; border: 1px solid #1f4f9c; vertical-align: middle;"></span> <strong style="color: #0f2b46;">蓝色</strong> 滞后桥臂 SW　　<span style="display: inline-block; width: 11px; height: 11px; background: #c0392b; border: 1px solid #8f2a20; vertical-align: middle;"></span> <strong style="color: #0f2b46;">红色</strong> 超前桥臂 SW　　<span style="display: inline-block; width: 11px; height: 11px; background: #e0b000; border: 1px solid #a88300; vertical-align: middle;"></span> <strong style="color: #0f2b46;">黄色</strong> 滞后桥臂下管的栅极驱动信号
  </div>
  <div style="border: 1px solid #cddcef; border-left: 4px solid #2a6db5; background: #f1f6fc; padding: 12px 15px; margin: 0 0 20px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #0b5394; margin-bottom: 5px;">NOTE</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #24384f;">本项目属于升压电源，原边电流显著大于副边电流，因此能够在较宽的输入范围内实现 ZVS，而不是仅在重载条件下实现。</div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">7.2 电流波形</h3>

  <h4 style="margin: 20px 0 10px; color: #33465c; font-size: 15px; font-weight: 700;">原边电流</h4>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 12px;">
    <div style="flex: 1 1 320px;"><img src="https://image.lceda.cn/oshwhub/pullImage/9fe67f698f2a4fd7a7a3a64bcfd8a83d.png" alt="原边电流波形 1" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
    <div style="flex: 1 1 320px;"><img src="https://image.lceda.cn/oshwhub/pullImage/e1297cf75bef4f3fbe2852a99b9cac63.png" alt="原边电流波形 2" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
  </div>
  <div style="border: 1px solid #e2e8ef; background: #f8fafc; padding: 10px 14px; margin: 0 0 20px; font-size: 13px; color: #4a5766;">
    <span style="display: inline-block; width: 11px; height: 11px; background: #2f6fd0; border: 1px solid #1f4f9c; vertical-align: middle;"></span> <strong style="color: #0f2b46;">蓝色</strong> 滞后桥臂 SW　　<span style="display: inline-block; width: 11px; height: 11px; background: #c0392b; border: 1px solid #8f2a20; vertical-align: middle;"></span> <strong style="color: #0f2b46;">红色</strong> 超前桥臂 SW　　<span style="display: inline-block; width: 11px; height: 11px; background: #e0b000; border: 1px solid #a88300; vertical-align: middle;"></span> <strong style="color: #0f2b46;">黄色</strong> 电流互感器信号经整流采样后转换得到的电压信号
  </div>

  <h4 style="margin: 20px 0 10px; color: #33465c; font-size: 15px; font-weight: 700;">副边电流</h4>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 12px;">
    <div style="flex: 1 1 320px;"><img src="https://image.lceda.cn/oshwhub/pullImage/0602681886c44358835bb51e7f6bbf63.png" alt="副边电流波形 1" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
    <div style="flex: 1 1 320px;"><img src="https://image.lceda.cn/oshwhub/pullImage/3b308e9f52634190aed3617cb1d7271f.png" alt="副边电流波形 2" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
  </div>
  <div style="border: 1px solid #e2e8ef; background: #f8fafc; padding: 10px 14px; margin: 0 0 20px; font-size: 13px; color: #4a5766;">
    <span style="display: inline-block; width: 11px; height: 11px; background: #2f6fd0; border: 1px solid #1f4f9c; vertical-align: middle;"></span> <strong style="color: #0f2b46;">蓝色</strong> 滞后桥臂 SW　　<span style="display: inline-block; width: 11px; height: 11px; background: #c0392b; border: 1px solid #8f2a20; vertical-align: middle;"></span> <strong style="color: #0f2b46;">红色</strong> 超前桥臂 SW　　<span style="display: inline-block; width: 11px; height: 11px; background: #e0b000; border: 1px solid #a88300; vertical-align: middle;"></span> <strong style="color: #0f2b46;">黄色</strong> AMC1301 采样信号经差分放大后反馈至原边的电压信号
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">7.3 电压波形</h3>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 14px 0 12px;">
    <div style="flex: 1 1 320px;"><img src="https://image.lceda.cn/oshwhub/pullImage/c1ced01a821f4a0e95371ffe9b088f03.png" alt="副边电压波形 1" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
    <div style="flex: 1 1 320px;"><img src="https://image.lceda.cn/oshwhub/pullImage/494dc2b0f29b4177af55c49b78e236f3.png" alt="副边电压波形 2" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);"></div>
  </div>
  <div style="border: 1px solid #e2e8ef; background: #f8fafc; padding: 10px 14px; margin: 0 0 16px; font-size: 13px; color: #4a5766;">
    <span style="display: inline-block; width: 11px; height: 11px; background: #2f6fd0; border: 1px solid #1f4f9c; vertical-align: middle;"></span> <strong style="color: #0f2b46;">蓝色</strong> 滞后桥臂 SW　　<span style="display: inline-block; width: 11px; height: 11px; background: #c0392b; border: 1px solid #8f2a20; vertical-align: middle;"></span> <strong style="color: #0f2b46;">红色</strong> 超前桥臂 SW　　<span style="display: inline-block; width: 11px; height: 11px; background: #e0b000; border: 1px solid #a88300; vertical-align: middle;"></span> <strong style="color: #0f2b46;">黄色</strong> AMC1311B 采样信号经差分放大后反馈至原边的电压信号
  </div>
  <div style="border: 1px solid #cddcef; border-left: 4px solid #2a6db5; background: #f1f6fc; padding: 12px 15px; margin: 0 0 20px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #0b5394; margin-bottom: 5px;">NOTE</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #24384f;">由于电压采样分压器的回路面积较大，且采样回路位于变压器正下方，反馈信号受到了一定干扰。固件中因此加入了针对性的数字滤波算法，以改善采样效果。</div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">7.4 启动波形</h3>
  <p style="margin: 0 0 14px;">启动波形在 <strong>3 kΩ 阻性负载</strong>下测得；150 V 输出时负载电流约为 50 mA，230 V 输出时负载电流约为 77 mA。测试用于观察闭环启动过程中的输出电压建立情况。</p>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 22px;">
    <div style="flex: 1 1 320px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/0c3a8f85fe4944d483cb7fc726ed9ee1.png" alt="150 V 启动波形" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;"><strong style="color: #0f2b46; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">150 V / 50 mA</strong></p>
    </div>
    <div style="flex: 1 1 320px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/681565dee10146c3a9a1d363cf0e6488.png" alt="230 V 启动波形" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;"><strong style="color: #0f2b46; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">230 V / 77 mA</strong></p>
    </div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">7.5 输出电压纹波</h3>
  <p style="margin: 0 0 14px;">输出电压纹波同样在 <strong>3 kΩ 阻性负载</strong>下测得；下图分别对应 150 V / 50 mA 和 230 V / 77 mA 两组工况。</p>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 16px;">
    <div style="flex: 1 1 320px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/0b59dcb7fa864fbfb4b4b32855286661.png" alt="150 V 输出电压纹波" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;"><strong style="color: #0f2b46; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">150 V / 50 mA</strong></p>
    </div>
    <div style="flex: 1 1 320px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/1607b2d4a8da47458818cc78b66d00dd.png" alt="230 V 输出电压纹波" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;"><strong style="color: #0f2b46; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;">230 V / 77 mA</strong></p>
    </div>
  </div>
  <div style="border: 1px solid #cddcef; border-left: 4px solid #2a6db5; background: #f1f6fc; padding: 12px 15px; margin: 0 0 20px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #0b5394; margin-bottom: 5px;">NOTE</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #24384f;">由于没有高压探头，所以先在较低压范围测试。</div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">7.6 电容恒流充电测试</h3>
  <div style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 18px; margin: 14px 0 22px;">
    <div style="flex: 1 1 420px;">
      <p style="margin: 0 0 12px;">测试使用两个 1100 µF 电容串联，等效容量约为 550 µF；上位机设置目标电压为 2000 V、限流为 200 mA。电容电压基本呈线性上升，平均充电功率由电容储能公式计算得出。</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px;">
        <div style="flex: 1 1 130px; border: 1px solid #d5dde6; background: #fff; padding: 10px 13px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
          <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">充电耗时</div>
          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">5.6 s</div>
        </div>
        <div style="flex: 1 1 130px; border: 1px solid #d5dde6; background: #fff; padding: 10px 13px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
          <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">等效容量</div>
          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">550 µF</div>
        </div>
        <div style="flex: 1 1 130px; border: 1px solid #d5dde6; background: #fff; padding: 10px 13px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
          <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">峰值输出功率</div>
          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">390 W</div>
        </div>
        <div style="flex: 1 1 130px; border: 1px solid #d5dde6; background: #fff; padding: 10px 13px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
          <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">平均充电功率</div>
          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">195 W</div>
        </div>
      </div>
      <p style="margin: 0;"><a href="https://github.com/AzidoPP/HVCCPS-V1.4/releases/download/videos-v1.4/HVCCPS-V1.4-Capacitor-CC-Charging-Test.mp4" style="color: #0b5394; font-weight: 700;">▶ 观看完整测试视频</a></p>
    </div>
    <div style="flex: 0 1 195px; max-width: 195px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/3de0009200974f91ab8fa34ff4fd6f4c.jpg" alt="电容恒流充电测试第 6 秒画面" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">充电进行到第 6 秒的画面。</p>
    </div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">7.7 阻性负载恒压测试</h3>
  <div style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 18px; margin: 14px 0 22px;">
    <div style="flex: 1 1 420px;">
      <p style="margin: 0 0 12px;">测试将铝壳电阻连接至输出端并设定输出电压。测试过程中输出电压保持稳定，用于验证恒压环路及持续输出能力。</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px;">
        <div style="flex: 1 1 130px; border: 1px solid #d5dde6; background: #fff; padding: 10px 13px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
          <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">设定输出电压</div>
          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">800 V</div>
        </div>
        <div style="flex: 1 1 130px; border: 1px solid #d5dde6; background: #fff; padding: 10px 13px;box-shadow: 0 1px 2px rgba(15, 43, 70, 0.06);">
          <div style="font-size: 11.5px; letter-spacing: 1.2px; color: #5d6b7a; font-weight: 700;">负载</div>
          <div style="margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 18px; font-weight: 700; color: #0f2b46;">5 kΩ</div>
        </div>
      </div>
      <p style="margin: 0;"><a href="https://github.com/AzidoPP/HVCCPS-V1.4/releases/download/videos-v1.4/HVCCPS-V1.4-Resistive-CV-Test.mp4" style="color: #0b5394; font-weight: 700;">▶ 观看完整测试视频</a></p>
    </div>
    <div style="flex: 0 1 195px; max-width: 195px;">
      <img src="https://image.lceda.cn/oshwhub/pullImage/25db73a166ae4cfd820d96cf77618603.jpg" alt="阻性负载恒压测试第 9 秒画面" style="display: block; width: 100%; border: 1px solid #d5dde6; box-shadow: 0 1px 4px rgba(15, 43, 70, 0.10);">
      <p style="margin: 7px 0 0; font-size: 12.5px; color: #5d6b7a;">恒压运行到第 9 秒的画面。</p>
    </div>
  </div>

  <h3 style="margin: 28px 0 10px; padding-left: 10px; border-left: 3px solid #0f2b46; color: #0f2b46; font-size: 17px; font-weight: 800;">7.8 拉弧测试</h3>
  <p style="margin: 0 0 14px;">拉弧测试用于直观展示高压输出效果。<a href="https://github.com/AzidoPP/HVCCPS-V1.4/releases/download/videos-v1.4/HVCCPS-V1.4-Arc-Test.mp4" style="color: #0b5394; font-weight: 700;">▶ 观看完整测试视频</a></p>
  <div style="border: 1px solid #e0c7c4; border-left: 4px solid #b3261e; background: #fdf3f2; padding: 12px 15px; margin: 0 0 14px; box-shadow: 0 1px 2px rgba(15, 43, 70, 0.05);">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #b3261e; margin-bottom: 5px;">CAUTION · 请勿模仿</div>
    <div style="font-size: 14.5px; line-height: 1.8; color: #4a2320;">电弧测试具有极高危险性，必须采取可靠的绝缘、接地、限流、放电及外部急停措施，请勿模仿或在无人监护的情况下操作。</div>
  </div>
  <div style="border: 1px solid #d5dde6; background: #f8fafc; padding: 14px 16px; margin: 0 0 22px;">
    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.6px; color: #5d6b7a; margin-bottom: 5px;">拉弧测试画面</div>
    <div style="font-size: 14px; line-height: 1.8; color: #4a5766;">该画面可能触发图片审核限制，请前往 GitHub 查看：<a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/Docs/test-arc-10s.jpg" style="color: #0b5394; font-weight: 700;">Docs/test-arc-10s.jpg</a></div>
  </div>

  <h2 id="license" style="margin: 46px 0 16px; padding: 0 0 9px; border-bottom: 2px solid #0f2b46; color: #0f2b46; font-size: 23px; font-weight: 800;"><span style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #8b98a6; font-weight: 700; margin-right: 11px;">08</span>许可证与修改记录</h2>
  <p style="margin: 0 0 12px;">本项目采用 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/LICENSE" style="color: #0b5394; font-weight: 700;">GPL-3.0</a> 许可证。版本变化和详细修改内容见 GitHub 仓库中的 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/log.md" style="color: #0b5394; font-weight: 700;">log.md</a>。</p>
  <p style="margin: 0 0 12px;">项目不保存 MCU 厂商手册副本；使用的官方资料入口见 <a href="https://github.com/AzidoPP/HVCCPS-V1.4/blob/main/Docs/references.md" style="color: #0b5394; font-weight: 700;">MCU 参考资料</a>。</p>

  <div style="border: 1px solid #d5dde6; background: #f6f9fc; padding: 16px 18px; margin: 28px 0 0;">
    <p style="margin: 0 0 8px; font-size: 14.5px; line-height: 1.8; color: #33465c;"><strong style="color: #0f2b46;">再次提醒：</strong>立创开源社区页面可能存在审核和同步延迟，正式复刻前请回到 <a href="https://github.com/AzidoPP/HVCCPS-V1.4" style="color: #0b5394; font-weight: 800;">GitHub 主仓库</a>核对最新文档与附件。</p>
    <p style="margin: 0; font-size: 14.5px; line-height: 1.8; color: #33465c;">使用中遇到问题，欢迎加入 QQ 群 <strong>582594264</strong> 交流。</p>
  </div>

</div>
