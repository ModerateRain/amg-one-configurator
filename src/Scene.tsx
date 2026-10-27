import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { CameraControls, ContactShadows, Environment, Lightformer, MeshReflectorMaterial, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { MeshReflectorMaterial as ReflectorMaterial } from '@react-three/drei/materials/MeshReflectorMaterial';
import { defaults, environments, selectedColor, useStore, type Configuration, type Part } from './store';
import { CAMERA_OPTIONS, aspectFactor, cameraPose, moveToCameraPose } from './camera';
import { createConcreteTextures } from './materials';

type Runtime = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: CameraControls | null };
let runtime: Runtime | null = null;
let capturing = false;
export async function captureCar(width=2400, height=1500): Promise<Blob> {
  if (!runtime || !useStore.getState().ready) throw new Error('模型尚未加载完成');
  if (capturing) throw new Error('正在导出，请稍候');
  capturing=true;
  const {renderer,scene,camera}=runtime;
  const oldSize=renderer.getSize(new THREE.Vector2()); const oldDpr=renderer.getPixelRatio();
  const aspect=camera.aspect;
  const rotate=useStore.getState().rotate;
  useStore.getState().set({rotate:false});
  try {
    renderer.setPixelRatio(1); renderer.setSize(width,height,false);
    camera.aspect=width/height; camera.updateProjectionMatrix();
    // Let the reflection pass update at the export camera's aspect ratio.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    renderer.render(scene,camera);
    return await new Promise<Blob>((resolve,reject)=>renderer.domElement.toBlob(b=>b?resolve(b):reject(new Error('图片导出失败')),'image/png'));
  } finally {
    camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setPixelRatio(oldDpr);renderer.setSize(oldSize.x,oldSize.y,false);
    capturing=false;useStore.getState().set({rotate});
  }
}

function carbonTexture() {
  const size=256; const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const tile=16; const alt=((x/tile|0)+(y/tile|0))%2;
    const stripe=alt?Math.sin(x*Math.PI/3):Math.sin(y*Math.PI/3);
    const sheen=alt?(x%tile)/tile:(y%tile)/tile;
    const v=Math.round(35+stripe*8+Math.sin(sheen*Math.PI)*32);
    const i=(y*size+x)*4;data[i]=v;data[i+1]=v+2;data[i+2]=v+3;data[i+3]=255;
  }
  const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(14,14);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
}
type CarAsset={root:THREE.Group;paint:THREE.MeshPhysicalMaterial;glass:THREE.MeshPhysicalMaterial[];rims:THREE.MeshPhysicalMaterial;lamps:THREE.MeshStandardMaterial[];meshes:THREE.Mesh[];rest:Map<THREE.Object3D,THREE.Vector3>;spoiler:THREE.Group;bodyGroup:THREE.Group;size:THREE.Vector3};
function identifyPart(m:THREE.Mesh): Part {
  const name=m.userData.partName as string;
  const mat=(Array.isArray(m.material)?m.material[0]:m.material).name;
  if (/spoiler/i.test(name)) return 'spoiler';
  if (/tire|rim/i.test(name)) return 'wheels';
  if (/glass/i.test(mat)) return 'glass';
  if (/interior|steer|stitches|speakers|belt/i.test(name+' '+mat)) return 'interior';
  return 'body';
}
function prepareAsset(original:THREE.Group):CarAsset {
  original.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(original);
  const size=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());
  const scale=5.1/Math.max(size.x,size.y,size.z);
  const normalize=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
  const root=new THREE.Group();root.name='AMG ONE';
  const bodyGroup=new THREE.Group();bodyGroup.name='Body assembly';root.add(bodyGroup);
  const spoiler=new THREE.Group();spoiler.name='Rear wing pivot';bodyGroup.add(spoiler);
  const paint=new THREE.MeshPhysicalMaterial({name:'Atelier car paint',color:'#a7b4b8',metalness:0.68,roughness:0.23,clearcoat:1,clearcoatRoughness:0.12,envMapIntensity:1.1});
  const rims=new THREE.MeshPhysicalMaterial({name:'Forged alloy',color:'#33383c',metalness:0.95,roughness:0.28,clearcoat:0.55,envMapIntensity:1.3});
  const glass:THREE.MeshPhysicalMaterial[]=[];const lamps:THREE.MeshStandardMaterial[]=[];
  const meshList:THREE.Mesh[]=[];const rest=new Map<THREE.Object3D,THREE.Vector3>();
  const materialCache=new Map<THREE.Material,THREE.Material>();
  original.traverse(o=>{
    if (!(o instanceof THREE.Mesh)) return;
    const mat=(Array.isArray(o.material)?o.material[0]:o.material) as THREE.MeshStandardMaterial;
    const name=o.parent?.name??o.name;
    let material=materialCache.get(mat) as THREE.MeshStandardMaterial|undefined;
    if(!material){
      if(/_paint$/.test(mat.name)) material=paint;
      else if(/glass/.test(mat.name)) {
        const g=new THREE.MeshPhysicalMaterial({name:mat.name,color:/red/.test(mat.name)?'#680d13':'#233539',metalness:0,roughness:0.08,clearcoat:1,clearcoatRoughness:0.06,envMapIntensity:1.2,transparent:true,opacity:/red/.test(mat.name)?0.8:0.62,depthWrite:false,side:THREE.DoubleSide});
        material=g;glass.push(g);
      } else {
        material=mat.clone(); material.envMapIntensity=1.0;
        if(/carbon/.test(mat.name)){material.roughness=0.33;material.metalness=0.35;}
        else if(/tire/.test(mat.name)){material.color.set('#3e4143');material.roughness=0.88;material.metalness=0;}
        else if(/plastic/.test(mat.name)){material.color.set('#111518');material.roughness=0.48;material.metalness=0.12;}
        else if(/grey/.test(mat.name)){material.roughness=0.35;material.metalness=0.65;}
        else if(/alcantara/.test(mat.name)){material.roughness=0.95;material.metalness=0;}
        if(/runninglight|headlight|lightsnormal/.test(mat.name)){material.emissive.set('#c4ebff');material.emissiveIntensity=0.4;lamps.push(material);}
        if(/decal/.test(mat.name)){material.polygonOffset=true;material.polygonOffsetFactor=-1;material.depthWrite=false;}
      }
      materialCache.set(mat,material);
    }
    if(/rim.*_wheels_/.test(name))material=rims;
    const geometry=o.geometry.clone().applyMatrix4(normalize.clone().multiply(o.matrixWorld));
    const mesh=new THREE.Mesh(geometry,material);mesh.name=o.name;mesh.userData.partName=name;
    mesh.userData.sourceMaterial=mat.name;
    mesh.castShadow=!/glass|decal/.test(mat.name);mesh.receiveShadow=true;
    mesh.userData.part=identifyPart(mesh);mesh.userData.livery=/decal_livery/.test(mat.name);
    if(mesh.userData.part==='spoiler')spoiler.add(mesh);
    else if(mesh.userData.part==='wheels')root.add(mesh);
    else bodyGroup.add(mesh);
    meshList.push(mesh);rest.set(mesh,mesh.position.clone());
  });
  const wingBounds=new THREE.Box3().setFromObject(spoiler);
  const pivot=wingBounds.getCenter(new THREE.Vector3());
  spoiler.position.copy(pivot);spoiler.children.forEach(o=>{o.position.sub(pivot);rest.set(o,o.position.clone());});
  return {root,paint,glass,rims,lamps,meshes:meshList,rest,spoiler,bodyGroup,size:size.multiplyScalar(scale)};
}

function Car() {
  const gltf=useGLTF('/models/amg-one.glb');
  const asset=useMemo(()=>prepareAsset(gltf.scene),[gltf.scene]);
  const config=useStore(s=>s.config);
  const weave=useMemo(carbonTexture,[]);
  useEffect(()=>{
    applyConfig(asset,config,weave);
    if(import.meta.env.DEV){const stage=document.querySelector<HTMLElement>('.stage');if(stage){stage.dataset.shellOpacity=String(asset.paint.opacity);stage.dataset.shellTransparent=String(asset.paint.transparent);}}
  },[asset,config,weave]);
  useEffect(()=>{
    useStore.getState().set({ready:true});
    if(import.meta.env.DEV)(window as any).__atelierModel={asset,store:useStore};
    return()=>{
      useStore.getState().set({ready:false});
      asset.meshes.forEach(m=>m.geometry.dispose());
      new Set(asset.meshes.flatMap(m=>Array.isArray(m.material)?m.material:[m.material])).forEach(m=>m.dispose());
    };
  },[asset]);
  return <primitive object={asset.root} />;
}
function applyConfig(a:CarAsset,c:Configuration,weave:THREE.Texture) {
  const color=selectedColor(c).hex;
  const transparent=c.finish==='transparent';
  a.paint.color.set(c.finish==='carbon'?'#a3a9ad':transparent?'#c9d3df':color);
  if(transparent)a.paint.color.lerp(new THREE.Color(color),0.18);
  a.paint.map=c.finish==='carbon'?weave:null;
  a.paint.roughness=c.roughness;
  a.paint.metalness=transparent?0.8:c.finish==='metallic'?0.68:c.finish==='carbon'?0.55:0.18;
  a.paint.flatShading=transparent;
  a.paint.transparent=transparent;
  a.paint.opacity=transparent?c.bodyOpacity:1;
  a.paint.depthWrite=!transparent;
  a.paint.side=transparent?THREE.DoubleSide:THREE.FrontSide;
  // Preserve the source asset's alpha-blended shell approach. This also avoids
  // a second refraction render target competing with the planar reflection pass.
  a.paint.transmission=0;
  a.paint.thickness=0;
  a.paint.ior=1.38;
  a.paint.envMapIntensity=transparent?2.4:1.25;
  a.paint.clearcoat=c.clearcoat;a.paint.clearcoatRoughness=transparent?0.035:c.finish==='satin'?0.4:0.09;
  a.paint.needsUpdate=true;
  a.glass.forEach(m=>{if(!/red/.test(m.name))m.opacity=0.42+c.tint*0.48;});
  a.rims.color.set(c.rimFinish==='silver'?'#aeb5bc':c.rimFinish==='bronze'?'#796047':'#343a40');
  a.rims.roughness=c.rimFinish==='silver'?0.2:0.3;
  a.lamps.forEach(m=>m.emissiveIntensity=c.lights?1.4:0);
  a.bodyGroup.position.y=c.rideHeight/1000;
  // The normalized car's longitudinal axis is Z; the wing rotates around X.
  a.spoiler.rotation.x=THREE.MathUtils.degToRad(c.spoilerAngle);
  a.meshes.forEach(m=>{m.visible=c.visible[m.userData.part as Part]&&(!m.userData.livery||c.livery);});
}

function Rig() {
  const ref=useRef<CameraControls>(null);
  const {gl,scene,camera,size}=useThree();
  const view=useStore(s=>s.view), rev=useStore(s=>s.viewRevision), rotate=useStore(s=>s.rotate);
  const clean=useStore(s=>s.clean);
  const previous=useRef<{revision:number;view:string;aspect:number;clean:boolean}|null>(null);
  const exposure=useStore(s=>s.config.exposure);
  useEffect(()=>{runtime={renderer:gl,scene,camera:camera as THREE.PerspectiveCamera,controls:ref.current};if(import.meta.env.DEV){(window as any).__atelierRuntime=runtime;(window as any).__atelierCapture=captureCar;}return()=>{runtime=null;};},[gl,scene,camera]);
  useLayoutEffect(()=>{
    const controls=ref.current;if(!controls||size.width<1||size.height<1)return;
    camera.up.set(0,1,0);controls.updateCameraUp();
    const aspect=size.width/size.height,old=previous.current;
    const entering=clean&&!old?.clean;
    const newPreset=!old||old.revision!==rev||old.view!==view||entering;
    if(newPreset){
      const pose=cameraPose(entering?'hero':view,aspect,clean);
      moveToCameraPose(controls,pose,!!old&&!entering&&old.aspect===aspect);
    }else{
      // A canvas resize changes distance only. It must never replace the orbit angle.
      const p=controls.getPosition(new THREE.Vector3()),target=controls.getTarget(new THREE.Vector3());
      const f=aspectFactor(aspect)/aspectFactor(old.aspect);
      p.sub(target).multiplyScalar(f).add(target);
      controls.setLookAt(p.x,p.y,p.z,target.x,target.y,target.z,false);
    }
    previous.current={revision:rev,view,aspect,clean};
  },[view,rev,clean,size.width,size.height,camera]);
  useEffect(()=>{gl.toneMappingExposure=exposure;},[exposure,gl]);
  const sample=useRef(0);
  useFrame((_,dt)=>{
    if(rotate&&!capturing)ref.current?.rotate(dt*0.13,0,false);
    if(import.meta.env.DEV&&(sample.current+=dt)>.2){
      sample.current=0;const stage=document.querySelector<HTMLElement>('.stage');
      if(stage){const p=camera.position,t=ref.current?.getTarget(new THREE.Vector3())??new THREE.Vector3();
        stage.dataset.cameraPosition=[p.x,p.y,p.z].map(v=>v.toFixed(4)).join(',');
        stage.dataset.cameraTarget=[t.x,t.y,t.z].map(v=>v.toFixed(4)).join(',');
        stage.dataset.cameraPolar=(Math.acos(THREE.MathUtils.clamp(p.clone().sub(t).normalize().y,-1,1))*180/Math.PI).toFixed(2);
        stage.dataset.cameraAzimuth=String(ref.current?.azimuthAngle??0);
      }
    }
  });
  return <CameraControls ref={ref} makeDefault minDistance={4.1} maxDistance={28} minPolarAngle={0.05} maxPolarAngle={Math.PI/2-0.025} smoothTime={0.45} draggingSmoothTime={0.12} onControlStart={()=>useStore.getState().set({rotate:false})} />;
}
function PhotographicEnvironment(){
  const studio=useStore(s=>s.config.studio),rotation=useStore(s=>s.config.environmentRotation),intensity=useStore(s=>s.config.environmentIntensity);
  const texture=useLoader(THREE.TextureLoader,environments[studio].file);
  const panorama=useMemo(()=>{
    const t=texture.clone();t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
  },[texture]);
  useEffect(()=>()=>panorama.dispose(),[panorama]);
  return <Environment key={studio} background={false} environmentIntensity={intensity} environmentRotation={[0,THREE.MathUtils.degToRad(rotation),0]} resolution={512}>
    <Environment map={panorama} background backgroundIntensity={studio==='noir'?3.2:studio==='soft'?2.1:1.0}/>
    <Lightformer form="rect" intensity={9} color="#edf3ff" position={[0,6,1]} rotation={[Math.PI/2,0,0]} scale={[10,1.2,1]}/>
    <Lightformer form="rect" intensity={6} color="#d3e2ff" position={[-6,3,-1]} rotation={[0,Math.PI/2,0]} scale={[8,.65,1]}/>
    <Lightformer form="rect" intensity={7} color="#fff4e9" position={[5,2,-4]} rotation={[0,-Math.PI/2,0]} scale={[7,.8,1]}/>
    <Lightformer form="rect" intensity={4} color="#c9ddff" position={[0,3,8]} rotation={[0,Math.PI,0]} scale={[7,.6,1]}/>
    <Lightformer form="ring" intensity={2.2} color="#e8eeff" position={[-4,5,-6]} rotation={[0,.5,0]} scale={3}/>
  </Environment>;
}
function Floor(){
  const c=useStore(s=>s.config);
  const ref=useRef<ReflectorMaterial|null>(null);
  const uniforms=useMemo(()=>({brightness:{value:1},suppression:{value:1}}),[]);
  const concrete=useMemo(createConcreteTextures,[]);
  useEffect(()=>()=>Object.values(concrete).forEach(t=>t.dispose()),[concrete]);
  const attach=useCallback((material:ReflectorMaterial|null)=>{
    ref.current=material;if(material)fadeFloor(material,uniforms);
  },[uniforms]);
  useLayoutEffect(()=>{
    const material=ref.current;if(!material)return;
    material.roughness=Math.max(0.06,1-c.floorSmoothness);
    material.envMapIntensity=c.floorEnvironment;
    material.color.set(c.studio==='neon'?'#a4abb6':'#8591a1');
    material.normalScale.setScalar(c.floorTexture);
    // Keep Drei's render targets stable while dragging: update its uniforms
    // directly instead of recreating the reflection buffers for every value.
    material.mixStrength=c.floorReflection*6;
    material.mirror=0.52*Math.min(1,c.floorReflection*1.5);
    material.mixBlur=(1-c.floorSharpness)/Math.max(0.045,material.roughness*0.75);
    uniforms.brightness.value=c.floorBrightness;
    uniforms.suppression.value=c.floorHighlightSuppression;
    if(import.meta.env.DEV){
      const stage=document.querySelector<HTMLElement>('.stage');
      if(stage)stage.dataset.floorMaterial=JSON.stringify({roughness:material.roughness,reflection:material.mixStrength,blur:material.mixBlur,environment:material.envMapIntensity,texture:material.normalScale.x,brightness:uniforms.brightness.value,suppression:uniforms.suppression.value,reflectionBuffer:material.tDiffuse?.uuid});
    }
  },[c.floorSmoothness,c.floorReflection,c.floorSharpness,c.floorEnvironment,c.floorBrightness,c.floorTexture,c.floorHighlightSuppression,c.studio,uniforms]);
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.022,0]} receiveShadow>
    <planeGeometry args={[200,200]} />
    <MeshReflectorMaterial ref={attach} {...concrete} transparent depthWrite={false} resolution={1024} blur={[64,32]} mixBlur={0.15} mirror={0.52} mixStrength={4} depthScale={0} color="#8591a1" envMapIntensity={0.35} metalness={0.15} roughness={0.42} normalScale={new THREE.Vector2(0.6,0.6)} />
  </mesh>;
}
function Studio() {
  const studio=useStore(s=>s.config.studio),visible=useStore(s=>s.config.visible),ride=useStore(s=>s.config.rideHeight);
  const soft=studio==='soft',bright=studio==='neon';
  return <>
    <color attach="background" args={[bright?'#292f3b':soft?'#171e2b':'#11151e']} />
    <fog attach="fog" args={[bright?'#292f3b':soft?'#171e2b':'#11151e',9,27]} />
    <Suspense fallback={null}><PhotographicEnvironment/></Suspense>
    <ambientLight intensity={bright?0.35:0.3} />
    <directionalLight position={[3,7,5]} intensity={bright?2.0:3.5} color="#e2ebff" />
    <spotLight position={[-5,6,-4]} intensity={35} angle={0.8} penumbra={1} color="#c7d9ff" />
    <spotLight position={[4,5,7]} intensity={24} angle={0.65} penumbra={1} color="#fff2e2" />
    <Floor />
    <ContactShadows key={JSON.stringify(visible)+ride} position={[0,-0.012,0]} opacity={0.8} scale={12} blur={2.2} far={4} resolution={512} color="#000000" frames={1} />
    <Car />
    <Rig />
  </>;
}
function fadeFloor(material:ReflectorMaterial,uniforms:{brightness:{value:number};suppression:{value:number}}){
  if(!material||material.userData.atelierFade)return;
  material.userData.atelierFade=true;
  const base=material.onBeforeCompile.bind(material);
  material.onBeforeCompile=(shader:any)=>{
    base(shader);
    shader.uniforms.atelierFloorBrightness=uniforms.brightness;
    shader.uniforms.atelierFloorSuppression=uniforms.suppression;
    shader.vertexShader='varying vec2 atelierFloorPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\natelierFloorPosition = position.xy;');
    shader.fragmentShader='varying vec2 atelierFloorPosition;\nuniform float atelierFloorBrightness;\nuniform float atelierFloorSuppression;\n'+shader.fragmentShader;
    // A floor-only highlight shoulder keeps grazing environment reflections from
    // washing the concrete white. Scale RGB together to preserve reflected color.
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float floorPeak = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
      float floorKnee = 0.08;
      float floorHeadroom = 0.14;
      float floorExcess = max(0.0, floorPeak - floorKnee);
      float floorMapped = floorKnee + floorHeadroom * (1.0 - exp(-floorExcess / floorHeadroom));
      outgoingLight *= mix(1.0, min(1.0, floorMapped / max(floorPeak, 0.0001)), atelierFloorSuppression);
      outgoingLight *= atelierFloorBrightness;
      diffuseColor.a *= 1.0 - smoothstep(5.0, 15.0, length(atelierFloorPosition));
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=> 'atelier-floor-controls-v3';material.needsUpdate=true;
}
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}> {
  state={error:false};
  static getDerivedStateFromError(){return{error:true};}
  render(){return this.state.error?<div className="scene-error"><h3>3D 场景加载失败</h3><p>请检查模型与环境资源，或使用支持 WebGL 2 的浏览器。</p><button onClick={()=>location.reload()}>重新加载</button></div>:this.props.children;}
}
export default function Scene(){
  const [contextLost,setContextLost]=useState(false);
  return <SceneBoundary><Canvas shadows={false} dpr={[1,1.65]} camera={CAMERA_OPTIONS} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} onCreated={({gl})=>{
    gl.toneMapping=THREE.ACESFilmicToneMapping;gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMappingExposure=defaults.exposure;
    gl.domElement.addEventListener('webglcontextlost',()=>setContextLost(true));
    gl.domElement.addEventListener('webglcontextrestored',()=>setContextLost(false));
  }}><Suspense fallback={null}><Studio /></Suspense></Canvas>{contextLost&&<div className="scene-error">显卡连接已中断，请刷新页面重新加载。</div>}</SceneBoundary>;
}
