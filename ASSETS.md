# 素材来源与署名

## 汽车模型

- 标题：Transparency Mercedes AMG One
- 作者：[Dave Love SketchFab (Tyler_Dave)](https://sketchfab.com/Tyler_Dave)
- 来源：[https://sketchfab.com/3d-models/transparency-mercedes-amg-one-31e09c5fe7a04ef2b47f998485de9cf6](https://sketchfab.com/3d-models/transparency-mercedes-amg-one-31e09c5fe7a04ef2b47f998485de9cf6)
- 许可：[Creative Commons Attribution 4.0 / CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 文件：`public/models/amg-one.glb`
- 核验：2026-10-27，通过 Sketchfab 官方模型 API 核对标题、作者、源页面与许可。

模型来自用户提供的压缩包。包内 GLB 原有署名元数据指向不相关作品，现已按用户给出的正确 Sketchfab 来源修正。仅重写 GLB 的署名 JSON 元数据，网格、材质和图像数据均保持一致。

应用在运行时克隆网格、归一化尺寸、替换部分材质，并调整部件显示和变换。外观缩略图是该模型在应用中的渲染结果，应随同模型保留以上署名。

## 当前全景环境

用户提供的三张 1920 × 960 RGB AVIF 全景图，原图及水印保留：

| 文件 | 场景 |
| --- | --- |
| `public/environments/environment-01.avif` | 暗色展馆 |
| `public/environments/environment-02.avif` | 工业展厅 |
| `public/environments/environment-03.avif` | 明亮机库 |

这些图像是普通 RGB 全景图，结合代码生成的浮点反射灯带用于照明。未提供可独立核实的原作者及再分发许可记录；这些第三方全景图不属于项目 MIT 许可范围，本仓库不为其授予额外许可。

## 程序化内容

`src/materials.ts` 的混凝土颜色、粗糙度和法线，以及碳纤维样式、补光和 SVG 视角图标由项目代码生成。

## 字体与图标

- Lucide 图标：[ISC](https://github.com/lucide-icons/lucide/blob/main/LICENSE)。
- Barlow Condensed：[Google Fonts 来源](https://github.com/google/fonts/tree/main/ofl/barlowcondensed)，SIL Open Font License，许可证保存在 `public/fonts/Barlow-OFL.txt`。
- DM Sans：[Google Fonts 来源](https://github.com/google/fonts/tree/main/ofl/dmsans)，SIL Open Font License，许可证保存在 `public/fonts/DM-Sans-OFL.txt`。
- 中文使用系统字体回退，不分发系统字体。

## 本地保留的历史资源

旧版 Poly Haven Studio Small 03（Greg Zaal）和 Studio Small 09（Sergej Majboroda）HDR 文件在当前场景中不启用，也不包含在本次源码发布中。其资源采用 [CC0](https://polyhaven.com/license)。

项目原创代码的 MIT 许可证不覆盖第三方资产的独立许可或商标权。
