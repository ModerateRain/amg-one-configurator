import { useState, useRef, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, Box, Camera, Check, ChevronDown, ChevronRight, CircleHelp, Eye, EyeOff, Focus, Layers3, Maximize, MousePointer2, Move, Palette, Pause, Play, RotateCcw, Save, Settings2, Sparkles, Sun, X, ZoomIn, Image, SlidersHorizontal, Aperture, Upload } from 'lucide-react';
import { useProgress } from '@react-three/drei';
import Scene, { captureCar } from './Scene';
import { colors, defaults, environments, finishNames, floorDefaults, floorLimits, selectedColor, studioNames, useStore, viewNames, type Configuration, type Finish, type Part, type Studio, type View } from './store';

const partNames:Record<Part,string>={body:'车身与车漆',wheels:'轮毂与轮胎',glass:'车窗玻璃',interior:'座舱内饰',spoiler:'空气动力尾翼'};
const presetIds=['transparent','black','white','red','blue','green'];
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function Range({label,value,min,max,step=1,display,onChange}:{label:string;value:number;min:number;max:number;step?:number;display:string;onChange:(v:number)=>void}){
  return <label className="range-field"><span><span>{label}</span><output>{display}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} style={{'--range':`${(value-min)/(max-min)*100}%`} as React.CSSProperties} onChange={e=>onChange(+e.target.value)} /></label>;
}
function Toggle({label,description,checked,onChange}:{label:string;description?:string;checked:boolean;onChange:()=>void}){
  return <button type="button" className="toggle-row" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span><strong>{label}</strong>{description&&<small>{description}</small>}</span><i className={checked?'switch on':'switch'} /></button>;
}
function Section({title,meta,children}:{title:string;meta?:ReactNode;children:ReactNode}){return <section className="control-section"><div className="section-heading"><h3>{title}</h3>{meta}</div>{children}</section>;}
function Loader(){const {progress}=useProgress();return <div className="loading-screen"><div className="loader-mark">///</div><span>PREPARING YOUR ONE</span><h2>光影，即将就绪。</h2><div className="load-track"><i style={{width:`${Math.max(progress,5)}%`}} /></div><p>正在载入汽车模型与摄影棚环境 · {Math.round(progress)}%</p></div>;}
function ColorPanel(){
  const c=useStore(s=>s.config),patch=useStore(s=>s.patch);const active=selectedColor(c);
  function finish(value:Finish){patch({finish:value,roughness:value==='transparent'?0.09:value==='satin'?0.65:value==='carbon'?0.3:value==='gloss'?0.15:0.23,clearcoat:value==='satin'?0.25:1});}
  return <>
    <Section title="车身颜色" meta={<span className="muted-small">{active.name}</span>}>
      <div className="color-grid">{colors.map(color=><button key={color.id} className={`color-choice ${c.color===color.id?'selected':''}`} onClick={()=>patch({color:color.id})} title={color.name} aria-label={`车漆：${color.name}`} aria-pressed={c.color===color.id}><i style={{'--swatch':color.hex} as React.CSSProperties}>{c.color===color.id&&<Check size={13}/>}</i><span>{color.name}</span></button>)}</div>
      <label className={`custom-color ${c.color==='custom'?'active':''}`}><Palette size={14}/><span>专属定制色</span><code>{c.color==='custom'?c.customColor.toUpperCase():'选择色值'}</code><input aria-label="自定义车漆颜色" type="color" value={c.customColor} onChange={e=>patch({color:'custom',customColor:e.target.value})}/></label>
    </Section>
    <Section title="车身材质" meta={<span className="tiny-tag">PBR</span>}><div className="finish-grid">{(['transparent','metallic','gloss','satin','carbon'] as Finish[]).map(f=><button key={f} className={`finish-choice ${c.finish===f?'selected':''}`} aria-pressed={c.finish===f} onClick={()=>finish(f)}><i className={`finish-ball ${f}`} style={{'--paint':active.hex} as React.CSSProperties}/><span>{finishNames[f]}</span>{c.finish===f&&<Check size={11}/>}</button>)}</div></Section>
    <Section title="表面细节" meta={<Sparkles size={13}/>}>
      {c.finish==='transparent'&&<Range label="车身不透明度" value={c.bodyOpacity} min={0.12} max={0.85} step={0.01} display={`${Math.round(c.bodyOpacity*100)}%`} onChange={bodyOpacity=>patch({bodyOpacity})}/>}
      <Range label="表面粗糙度" value={c.roughness} min={0.06} max={0.8} step={0.01} display={`${Math.round(c.roughness*100)}%`} onChange={roughness=>patch({roughness})}/>
      <Range label="清漆光泽" value={c.clearcoat} min={0} max={1} step={0.01} display={`${Math.round(c.clearcoat*100)}%`} onChange={clearcoat=>patch({clearcoat})}/>
      <Range label="车窗深色度" value={c.tint} min={0} max={1} step={0.01} display={`${Math.round(c.tint*100)}%`} onChange={tint=>patch({tint})}/>
    </Section>
    <div className="material-note"><Aperture size={17}/><p>每一处反光，都是你的选择。<span>透明复合材质 · 全景环境反射</span></p></div>
  </>;
}
function ComponentPanel(){const c=useStore(s=>s.config),patch=useStore(s=>s.patch);return <>
  <Section title="锻造轮毂" meta={<span className="tiny-tag">FINISH</span>}><p className="section-copy">保留原车轮毂结构，定制金属饰面。</p><div className="rim-grid">{[{id:'graphite',name:'石墨黑',color:'#343a40'},{id:'silver',name:'抛光银',color:'#bbc4cb'},{id:'bronze',name:'香槟铜',color:'#8b7053'}].map(r=><button key={r.id} aria-label={r.name} onClick={()=>patch({rimFinish:r.id})} className={c.rimFinish===r.id?'selected':''} aria-pressed={c.rimFinish===r.id}><i style={{'--rim':r.color} as React.CSSProperties}>✳</i><span>{r.name}</span></button>)}</div></Section>
  <Section title="外观组件"><Toggle label="竞速涂装" description="显示原模型车身贴花" checked={c.livery} onChange={()=>patch({livery:!c.livery})}/><Toggle label="日间行车灯" description="冷白色灯光" checked={c.lights} onChange={()=>patch({lights:!c.lights})}/><Toggle label="空气动力尾翼" description="安装 / 移除原车尾翼" checked={c.visible.spoiler} onChange={()=>patch({visible:{...c.visible,spoiler:!c.visible.spoiler}})}/></Section>
  <Section title="部件显示">{(Object.keys(partNames) as Part[]).filter(p=>p!=='spoiler').map(p=><Toggle key={p} label={partNames[p]} checked={c.visible[p]} onChange={()=>patch({visible:{...c.visible,[p]:!c.visible[p]}})}/>)}</Section>
 </>;}
function FloorPanel(){const c=useStore(s=>s.config),patch=useStore(s=>s.patch);return <>
  <Section title="地面材质" meta={<Layers3 size={14}/>}>
    <div className="floor-presets"><button onClick={()=>patch({...floorDefaults,floorSmoothness:0.15,floorReflection:0.25,floorSharpness:0.3,floorEnvironment:0.1,floorBrightness:0.75,floorTexture:1})}>哑光地面</button><button onClick={()=>patch({...floorDefaults,floorSmoothness:0.94,floorReflection:0.9,floorSharpness:1,floorEnvironment:0.2,floorBrightness:0.8,floorTexture:0.15})}>镜面地面</button></div>
    <Range label="地面光滑度" value={c.floorSmoothness} min={0} max={1} step={0.01} display={`${Math.round(c.floorSmoothness*100)}%`} onChange={floorSmoothness=>patch({floorSmoothness})}/>
    <Range label="地面明暗" value={c.floorBrightness} min={0.2} max={1.6} step={0.05} display={`${c.floorBrightness.toFixed(2)}×`} onChange={floorBrightness=>patch({floorBrightness})}/>
    <Range label="纹理凹凸" value={c.floorTexture} min={0} max={2} step={0.05} display={`${c.floorTexture.toFixed(2)}×`} onChange={floorTexture=>patch({floorTexture})}/>
  </Section>
  <Section title="倒影与高光" meta={<Sparkles size={14}/>}>
    <Range label="倒影强度" value={c.floorReflection} min={0} max={1} step={0.01} display={`${Math.round(c.floorReflection*100)}%`} onChange={floorReflection=>patch({floorReflection})}/>
    <Range label="倒影清晰度" value={c.floorSharpness} min={0} max={1} step={0.01} display={`${Math.round(c.floorSharpness*100)}%`} onChange={floorSharpness=>patch({floorSharpness})}/>
    <Range label="环境反光" value={c.floorEnvironment} min={0} max={1.5} step={0.05} display={`${c.floorEnvironment.toFixed(2)}×`} onChange={floorEnvironment=>patch({floorEnvironment})}/>
    <Range label="高光抑制" value={c.floorHighlightSuppression} min={0} max={1} step={0.01} display={`${Math.round(c.floorHighlightSuppression*100)}%`} onChange={floorHighlightSuppression=>patch({floorHighlightSuppression})}/>
    <p className="section-copy">泛白时降低环境反光或地面明暗，提高高光抑制。倒影清晰度控制反射的虚实。</p>
    <button className="text-button wide" onClick={()=>patch(floorDefaults)}><RotateCcw size={13}/>重置地面参数</button>
  </Section>
 </>;}
function ParameterPanel(){const c=useStore(s=>s.config),patch=useStore(s=>s.patch);return <>
  <Section title="姿态调整" meta={<SlidersHorizontal size={14}/>}><Range label="车身高度" value={c.rideHeight} min={-30} max={60} display={`${c.rideHeight>0?'+':''}${c.rideHeight} mm`} onChange={rideHeight=>patch({rideHeight})}/><Range label="尾翼角度" value={c.spoilerAngle} min={-8} max={18} display={`${c.spoilerAngle}°`} onChange={spoilerAngle=>patch({spoilerAngle})}/><p className="section-copy">姿态参数用于外观预览，部件按模型轴向调整。</p></Section>
  <Section title="摄影环境" meta={<Sun size={14}/>}><Range label="环境旋转" value={c.environmentRotation} min={0} max={360} display={`${c.environmentRotation}°`} onChange={environmentRotation=>patch({environmentRotation})}/><Range label="环境亮度" value={c.environmentIntensity} min={0.25} max={2.25} step={0.05} display={`${c.environmentIntensity.toFixed(2)}×`} onChange={environmentIntensity=>patch({environmentIntensity})}/><Range label="曝光强度" value={c.exposure} min={0.5} max={1.8} step={0.01} display={`${c.exposure.toFixed(2)}×`} onChange={exposure=>patch({exposure})}/></Section>
  <Section title="当前配置"><div className="config-summary"><p><span>车身颜色</span><b>{selectedColor(c).name}</b></p><p><span>漆面工艺</span><b>{finishNames[c.finish]}</b></p><p><span>摄影环境</span><b>{studioNames[c.studio]}</b></p><p><span>轮毂饰面</span><b>{{graphite:'石墨黑',silver:'抛光银',bronze:'香槟铜'}[c.rimFinish]}</b></p></div><button className="text-button wide" onClick={()=>patch({rideHeight:0,spoilerAngle:0,exposure:defaults.exposure})}><RotateCcw size={13}/>重置姿态与曝光</button></Section>
 </>;}
function App(){
  const [tab,setTab]=useState<'appearance'|'components'|'parameters'|'floor'>('appearance');
  const [leftTab,setLeftTab]=useState<'parts'|'scenes'>('parts');
  const [help,setHelp]=useState(false);const [busy,setBusy]=useState(false);
  const [mobilePanel,setMobilePanel]=useState(false);
  const [activePart,setActivePart]=useState<Part>('body');
  const s=useStore(); const c=s.config;const color=selectedColor(c);
  const importRef=useRef<HTMLInputElement>(null);
  async function screenshot(){setBusy(true);try{const blob=await captureCar();download(blob,`ONE-ATELIER-${c.color}-${Date.now()}.png`);s.notify('2400 × 1500 高清影像已导出');}catch(e){s.notify(e instanceof Error?e.message:'图片导出失败');}finally{setBusy(false);}}
  function exportConfig(){download(new Blob([JSON.stringify({schema:'one-atelier/v2',model:'amg-one',configuration:c},null,2)],{type:'application/json'}),'one-atelier-config.json');s.notify('配置 JSON 已导出，可重新导入');}
  async function importConfig(file?:File){
    if(!file)return;
    try{
      const data=JSON.parse(await file.text());const x=data.configuration;
      if(!['one-atelier/v1','one-atelier/v2'].includes(data.schema)||!x||!(x.finish in finishNames)||!(x.studio in studioNames))throw new Error();
      const numeric:Record<string,[number,number]>={roughness:[0.06,0.8],clearcoat:[0,1],tint:[0,1],exposure:[0.5,1.8],rideHeight:[-30,60],spoilerAngle:[-8,18]};
      const next={...defaults} as Configuration;
      for(const [key,[min,max]] of Object.entries(numeric)){if(typeof x[key]!=='number'||!Number.isFinite(x[key]))throw new Error();(next as any)[key]=Math.min(max,Math.max(min,x[key]));}
      if(!/^#[0-9a-f]{6}$/i.test(x.customColor)||(!colors.some(v=>v.id===x.color)&&x.color!=='custom')||!['graphite','silver','bronze'].includes(x.rimFinish))throw new Error();
      if(typeof x.lights!=='boolean'||typeof x.livery!=='boolean'||!Object.keys(defaults.visible).every(k=>typeof x.visible?.[k]==='boolean'))throw new Error();
      for(const [key,min,max] of [['bodyOpacity',0.12,0.85],['environmentRotation',0,360],['environmentIntensity',0.25,2.25]] as [keyof Configuration,number,number][]){if(x[key]!==undefined){if(typeof x[key]!=='number'||!Number.isFinite(x[key]))throw new Error();(next as any)[key]=Math.min(max,Math.max(min,x[key]));}}
      for(const key of Object.keys(floorLimits) as (keyof typeof floorDefaults)[]){if(x[key]!==undefined){if(typeof x[key]!=='number'||!Number.isFinite(x[key]))throw new Error();const [min,max]=floorLimits[key];next[key]=Math.min(max,Math.max(min,x[key]));}}
      Object.assign(next,{color:x.color,customColor:x.customColor,finish:x.finish,studio:x.studio,rimFinish:x.rimFinish,lights:x.lights,livery:x.livery,visible:{...x.visible}});
      s.patch(next);s.notify('配置已导入');
    }catch{s.notify('配置文件无效，请导入本工坊导出的 JSON');}
    if(importRef.current)importRef.current.value='';
  }
  function setPreset(id:string){s.patch({color:id==='transparent'?'silver':id,finish:id==='transparent'?'transparent':'metallic',roughness:id==='transparent'?0.09:0.23,clearcoat:1,visible:{...defaults.visible}});}
  function presetActive(id:string){return id==='transparent'?c.finish==='transparent':c.color===id&&c.finish!=='transparent';}
  function selectPart(p:Part){setActivePart(p);setTab(p==='body'||p==='glass'?'appearance':'components');}
  return <div className={`app ${s.clean?'clean-mode':''}`} data-ready={s.ready}>
    <header className="topbar"><a className="brand" href="/" aria-label="ONE ATELIER 首页"><span className="brand-mark">///</span><strong>ONE<span>ATELIER</span></strong></a><div className="project-label"><i/>3D CONFIGURATION STUDIO<span className="beta">LIVE</span></div><div className="header-car">AMG <b>ONE</b><span>01 / 01</span></div><div className="header-actions"><button className="icon-button reset-header" title="重置全部配置" aria-label="重置全部配置" onClick={()=>{s.reset();s.notify('已恢复初始配置');}}><RotateCcw size={16}/></button><button className="save-button" onClick={s.save}>{s.saved?<Check size={15}/>:<Save size={15}/>}<span>{s.saved?'已保存':'保存配置'}</span></button><button className="export-button" onClick={exportConfig}><ArrowDownToLine size={15}/><span>导出配置</span></button></div></header>
    <div className="workspace">
      <aside className="left-panel">
        <div className="panel-tabs left-tabs"><button className={leftTab==='parts'?'active':''} onClick={()=>setLeftTab('parts')}><Layers3 size={14}/>车辆部件</button><button className={leftTab==='scenes'?'active':''} onClick={()=>setLeftTab('scenes')}><Sun size={14}/>环境</button></div>
        {leftTab==='parts'?<><div className="tree-root"><Box size={15}/><b>Mercedes-AMG ONE</b><ChevronDown size={13}/></div><div className="part-tree">{(Object.keys(partNames) as Part[]).map((p,i)=><div className={`part-row ${activePart===p?'active':''}`} key={p}><button className="part-select" onClick={()=>selectPart(p)}><span className="part-index">0{i+1}</span><span>{partNames[p]}</span></button><button className="visibility" aria-label={`${c.visible[p]?'隐藏':'显示'}${partNames[p]}`} onClick={()=>s.patch({visible:{...c.visible,[p]:!c.visible[p]}})}>{c.visible[p]?<Eye size={13}/>:<EyeOff size={13}/>}</button></div>)}</div><div className="asset-badge"><i/><span>完整车辆模型</span><span>152 MESHES</span></div></>:<div className="scene-list">{(['noir','soft','neon'] as Studio[]).map((v,i)=><button key={v} className={`scene-card ${v} ${c.studio===v?'selected':''}`} onClick={()=>s.patch({studio:v})}><i className="scene-art" style={{backgroundImage:`linear-gradient(180deg,transparent 15%,#090d16e6 100%),url(${environments[v].file})`}}/><span><b>{studioNames[v]}</b><small>{environments[v].english}</small></span>{c.studio===v&&<Check size={14}/>}</button>)}</div>}
        <div className="left-divider"/><div className="left-heading">视角预设<span>CAMERA</span></div><div className="view-grid">{(Object.keys(viewNames) as View[]).map(v=><button key={v} className={s.view===v?'active':''} onClick={()=>s.setView(v)} aria-pressed={s.view===v}><span className={`view-car ${v}`}><CarGlyph/></span><span>{viewNames[v]}</span></button>)}</div>
        <button className={`rotation-button ${s.rotate?'active':''}`} onClick={()=>s.set({rotate:!s.rotate})} aria-pressed={s.rotate}>{s.rotate?<Pause size={13}/>:<Play size={13}/>}<span>{s.rotate?'暂停自动环绕':'自动环绕展示'}</span><span className="key">360°</span></button>
        <div className="left-bottom"><div className="studio-mini"><span className="mini-orbit"/><div><small>LIGHTING ENVIRONMENT</small><strong>{studioNames[c.studio]}</strong></div><button className="icon-button" title="更换摄影环境" aria-label="更换摄影环境" onClick={()=>setLeftTab('scenes')}><ChevronRight size={15}/></button></div><button className="help-button" onClick={()=>setHelp(true)}><CircleHelp size={14}/><span>操作指南与素材来源</span><ArrowRight size={13}/></button></div>
      </aside>
      <main className="center-column">
        <section className="stage" aria-label="交互式汽车 3D 预览"><Scene/>{!s.ready&&<Loader/>}
          <div className="stage-top"><div><div className="eyebrow"><span/>MATERIAL. LIGHT. YOUR SIGNATURE.</div><h1>AMG <em>ONE</em><span>光影之下，自成一格。</span></h1></div><button className="icon-button stage-fullscreen" title={s.clean?'退出纯净视图':'纯净视图'} aria-label={s.clean?'退出纯净视图':'纯净视图'} onClick={s.toggleClean}>{s.clean?<X size={18}/>:<Maximize size={17}/>}</button></div>
          <div className="stage-specs"><div><strong>01</strong><span>你的 ONE，独一无二。</span></div><div className="live-indicator"><i/>实时渲染</div></div>
          <div className="stage-bottom"><div className="current-paint"><i style={{background:color.hex}}/><span>{color.english}<small>{finishNames[c.finish]} / {studioNames[c.studio]}</small></span></div><div className="stage-tools"><button title="恢复最佳视角" aria-label="恢复最佳视角" onClick={()=>s.setView('hero')}><Focus size={16}/></button><button title="切换环境" aria-label="切换环境" onClick={()=>s.patch({studio:c.studio==='noir'?'soft':c.studio==='soft'?'neon':'noir'})}><Sun size={16}/></button><button title="高清截图" aria-label="高清截图" disabled={!s.ready||busy} onClick={screenshot}><Camera size={16}/></button></div></div>
          <div className="interaction-hint"><span><MousePointer2 size={12}/>拖拽旋转</span><i/><span><ZoomIn size={12}/>滚轮缩放</span><i/><span><Move size={12}/>右键平移</span></div>
        </section>
        <section className="presets-panel"><div className="presets-heading"><div><span className="accent-dot"/><h2>灵感，从这里开始</h2><span className="presets-english">CURATED FINISHES</span></div><span className="muted-small">06 种风格 / 无限可能</span></div><div className="preset-cards">{presetIds.map((id,i)=>{const p=id==='transparent'?{id,name:'透明复合',english:'CLEAR COMPOSITE',hex:'#b4bfcd'}:colors.find(x=>x.id===id)!;return <button key={id} onClick={()=>setPreset(id)} className={`preset-card ${presetActive(id)?'selected':''}`} aria-label={`应用${p.name}预设`} aria-pressed={presetActive(id)}><div className="preset-art" style={{'--car-color':p.hex} as React.CSSProperties}><img src={`/previews/${id}.webp`} alt="" onError={e=>{e.currentTarget.style.display='none';}}/><CarGlyph/><span className="preset-number">0{i+1}</span>{presetActive(id)&&<i><Check size={10}/></i>}</div><div className="preset-caption"><strong>{p.name}</strong><span>{p.english}</span></div></button>;})}</div></section>
      </main>
      <aside className={`right-panel ${mobilePanel?'mobile-open':''}`}><div className="right-title"><div><span className="eyebrow">MAKE IT YOURS</span><h2>定制你的 ONE<span>.</span></h2></div><span className="configuration-count">01</span><button className="mobile-close icon-button" onClick={()=>setMobilePanel(false)} aria-label="关闭定制面板"><X size={18}/></button></div><div className="panel-tabs right-tabs"><button className={tab==='appearance'?'active':''} onClick={()=>setTab('appearance')}><Palette size={15}/>外观</button><button className={tab==='components'?'active':''} onClick={()=>setTab('components')}><Layers3 size={15}/>零件</button><button className={tab==='floor'?'active':''} onClick={()=>setTab('floor')}><Layers3 size={15}/>地面</button><button className={tab==='parameters'?'active':''} onClick={()=>setTab('parameters')}><Settings2 size={15}/>参数</button></div><div className="right-content">{tab==='appearance'?<ColorPanel/>:tab==='components'?<ComponentPanel/>:tab==='floor'?<FloorPanel/>:<ParameterPanel/>}</div><div className="capture-area"><div className="export-details"><Image size={13}/><span>影像导出</span><span>2400 × 1500 · PNG</span></div><button className="capture-button" disabled={!s.ready||busy} onClick={screenshot}><Camera size={17}/><span>{busy?'正在生成影像…':'捕捉这一刻'}</span><ArrowRight size={16}/></button><button className="reset-link" onClick={()=>{s.reset();s.notify('已恢复初始配置');}}><RotateCcw size={11}/>恢复初始配置</button></div></aside>
    </div>
    <footer className="statusbar"><span><i className="status-dot"/> {s.ready?'ALL SYSTEMS READY':'LOADING ASSETS'}</span><span>DESIGNED AROUND YOUR OBSESSION.</span><div><button onClick={()=>importRef.current?.click()}><Upload size={11}/>导入配置</button><span>WEBGL 2 / PBR</span></div></footer>
    <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={e=>importConfig(e.target.files?.[0])}/>
    <button className="mobile-customize" onClick={()=>setMobilePanel(true)}><SlidersHorizontal size={16}/>定制你的 ONE</button>
    {s.toast&&<div className="toast" role="status"><Check size={15}/>{s.toast}</div>}
    {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><div className="help-modal" role="dialog" aria-modal="true" aria-label="操作指南与素材来源" onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" aria-label="关闭指南" onClick={()=>setHelp(false)}><X size={18}/></button><span className="eyebrow">WELCOME TO YOUR ATELIER</span><h2>把每一面，都变成主角。</h2><p>鼠标左键拖拽旋转，滚轮缩放，右键拖拽平移。触屏使用单指旋转、双指缩放和平移。左侧可切换预设视角和摄影环境。</p><p>“保存配置”保存在当前浏览器；“导出配置”生成可再次导入的 JSON。“捕捉这一刻”导出 2400 × 1500 PNG，画面仅包含车辆与场景。</p><div className="modal-rule"/><h3>素材与致谢</h3><p>车模来自你提供的压缩包。模型为 Dave Love SketchFab（Tyler_Dave）的 Transparency Mercedes AMG One，采用 CC BY 4.0 许可。<a href="/credits.html" target="_blank" rel="noreferrer">查看完整模型署名 ↗</a></p><p>当前摄影环境使用你提供的三张 AVIF 全景图，分别为暗色展馆、工业展厅和明亮机库，结合反射灯带照亮车身。地面使用程序化混凝土纹理与实时平面反射。</p><p className="modal-footnote">独立交互设计演示，与 Mercedes-Benz 官方无关联。部件与姿态调整仅用于视觉展示。</p></div></div>}
  </div>;
}
function CarGlyph(){return <svg viewBox="0 0 160 70" fill="none" aria-hidden="true"><path d="m18 44 10-15 27-7 24-12 28 3 15 17 22 7 7 15-14 7H25l-11-7 4-8Z" fill="var(--car-color, #7c898b)" stroke="currentColor" strokeWidth="1.2"/><path d="m58 23 23-10 23 3 11 14-57-7Z" fill="#162024" stroke="#829091" strokeWidth=".8"/><path d="m80 14-3 13M27 33l28-7 62 8m-92 6 30-7 60 5 25 9" stroke="#c2d1cf" strokeOpacity=".45"/><path d="m26 40 11 2-3 4-12-1m116-1 8 1" stroke="#edfff3" strokeWidth="2"/><ellipse cx="45" cy="52" rx="12" ry="14" fill="#111514" stroke="#687373"/><ellipse cx="45" cy="52" rx="7" ry="10" stroke="#9caaa9" strokeWidth="2"/><ellipse cx="126" cy="53" rx="12" ry="14" fill="#111514" stroke="#687373"/><ellipse cx="126" cy="53" rx="7" ry="10" stroke="#9caaa9" strokeWidth="2"/></svg>;}
export default App;
