import { create } from 'zustand';

export const colors = [
  { id: 'silver', name: '液态银', english: 'LIQUID SILVER', hex: '#a7b4b8' },
  { id: 'black', name: '曜石黑', english: 'OBSIDIAN BLACK', hex: '#181d21' },
  { id: 'white', name: '极地白', english: 'POLAR WHITE', hex: '#e2e4dc' },
  { id: 'red', name: '熔岩红', english: 'MAGMA RED', hex: '#9c0b14' },
  { id: 'blue', name: '电光蓝', english: 'HYPER BLUE', hex: '#075db4' },
  { id: 'green', name: '深林绿', english: 'FOREST GREEN', hex: '#163f35' },
  { id: 'yellow', name: '竞速黄', english: 'RACING YELLOW', hex: '#b7a62a' },
  { id: 'purple', name: '星云紫', english: 'NEBULA VIOLET', hex: '#56365c' },
];
export type Finish = 'transparent' | 'metallic' | 'gloss' | 'satin' | 'carbon';
export type Studio = 'noir' | 'soft' | 'neon';
export type View = 'hero' | 'front' | 'side' | 'rear' | 'top';
export type Part = 'body' | 'wheels' | 'glass' | 'interior' | 'spoiler';
export type Configuration = {
  color: string; customColor: string; finish: Finish; studio: Studio;
  roughness: number; clearcoat: number; tint: number; exposure: number;
  bodyOpacity: number; environmentRotation: number; environmentIntensity: number;
  floorSmoothness: number; floorReflection: number; floorSharpness: number;
  floorEnvironment: number; floorBrightness: number; floorTexture: number; floorHighlightSuppression: number;
  rideHeight: number; spoilerAngle: number; rimFinish: string;
  lights: boolean; livery: boolean; visible: Record<Part, boolean>;
};
export const floorDefaults = {
  floorSmoothness: 0.58, floorReflection: 2/3, floorSharpness: 0.96,
  floorEnvironment: 0.35, floorBrightness: 1, floorTexture: 0.6, floorHighlightSuppression: 1,
};
export const floorLimits: Record<keyof typeof floorDefaults,[number,number]> = {
  floorSmoothness:[0,1],floorReflection:[0,1],floorSharpness:[0,1],
  floorEnvironment:[0,1.5],floorBrightness:[0.2,1.6],floorTexture:[0,2],floorHighlightSuppression:[0,1],
};
export const defaults: Configuration = {
  ...floorDefaults,
  color: 'silver', customColor: '#88b9ff', finish: 'transparent', studio: 'noir',
  roughness: 0.09, clearcoat: 1, tint: 0.38, exposure: 1.2,
  bodyOpacity: 0.44, environmentRotation: 42, environmentIntensity: 1.65,
  rideHeight: 0, spoilerAngle: 0, rimFinish: 'graphite',
  lights: true, livery: false,
  visible: { body:true, wheels:true, glass:true, interior:true, spoiler:true },
};
export const finishNames: Record<Finish,string> = {transparent:'透明车身',metallic:'金属漆',gloss:'高光漆',satin:'哑光漆',carbon:'碳纤维'};
export const studioNames: Record<Studio,string> = {noir:'暗色展馆',soft:'工业展厅',neon:'明亮机库'};
export const environments: Record<Studio,{file:string;english:string;description:string}> = {
  noir:{file:'/environments/environment-01.avif',english:'DARK PAVILION',description:'暗色顶棚 · 多点灯阵'},
  soft:{file:'/environments/environment-02.avif',english:'INDUSTRIAL HALL',description:'钢结构 · 冷暖混合光'},
  neon:{file:'/environments/environment-03.avif',english:'BRIGHT HANGAR',description:'高挑机库 · 均匀天光'},
};
export const viewNames: Record<View,string> = {hero:'前侧 45°',front:'正面',side:'侧面',rear:'后侧',top:'俯视'};
function restore(): Configuration {
  try {
    const current=localStorage.getItem('one-atelier-config-v2');
    const raw=current??localStorage.getItem('one-atelier-config-v1');
    if (!raw) return structuredClone(defaults);
    const j=JSON.parse(raw);
    const floor={...floorDefaults};
    for(const key of Object.keys(floorLimits) as (keyof typeof floorDefaults)[]){
      const value=j[key],range=floorLimits[key];
      if(typeof value==='number'&&Number.isFinite(value))floor[key]=Math.min(range[1],Math.max(range[0],value));
    }
    return { ...defaults, ...j, ...floor, ...(!current?{finish:'transparent',roughness:0.09}:{}), visible: {...defaults.visible,...j.visible} };
  } catch { return structuredClone(defaults); }
}
type Store = {
  config: Configuration; view: View; viewRevision: number; rotate: boolean;
  clean: boolean; ready: boolean; toast: string; saved: boolean;
  patch: (value: Partial<Configuration>) => void;
  setView: (value: View) => void; reset: () => void;
  toggleClean: () => void;
  set: (value: Partial<Store>) => void; notify: (message: string) => void; save: () => void;
};
let toastTimer: ReturnType<typeof setTimeout>;
export const useStore = create<Store>((set,get)=>({
  config: restore(), view:'hero', viewRevision:0, rotate:false,clean:false,ready:false,toast:'',saved:false,
  patch: value => set(s=>({config:{...s.config,...value},saved:false})),
  setView: view => set(s=>({view,viewRevision:s.viewRevision+1,rotate:false})),
  reset: () => set(s=>({config:structuredClone(defaults),view:'hero',viewRevision:s.viewRevision+1,saved:false,rotate:false})),
  toggleClean: () => set(s=>({clean:!s.clean,...(!s.clean?{view:'hero' as View,viewRevision:s.viewRevision+1,rotate:false}:{} )})),
  set,
  notify: message => { clearTimeout(toastTimer);set({toast:message});toastTimer=setTimeout(()=>set({toast:''}),3000); },
  save: () => {try{localStorage.setItem('one-atelier-config-v2',JSON.stringify(get().config));set({saved:true});get().notify('配置已保存到此浏览器');}catch{get().notify('浏览器无法保存，请导出配置文件');}},
}));
export const selectedColor = (c:Configuration) => colors.find(x=>x.id===c.color) ?? {id:'custom',name:'自定义',english:'BESPOKE COLOR',hex:c.customColor};
