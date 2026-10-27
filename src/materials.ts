import * as THREE from 'three';

// Deterministic multi-scale concrete: broad trowel marks, pores, mineral grain.
const fract=(v:number)=>v-Math.floor(v);
const hash=(x:number,y:number)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
function noise(x:number,y:number){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
}
function texture(data:Uint8Array,n:number,color=false){
  const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(60,60);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
  t.generateMipmaps=true;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;
  return t;
}
export function createConcreteTextures(){
  const n=1024,color=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4),heights=new Float32Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const cloud=noise(x/190,y/190)*0.5+noise(x/63,y/63)*0.3+noise(x/17,y/17)*0.2;
    const grain=hash(x,y),pore=grain>0.986?18:0;
    const trowel=noise(x/120,y/11)*5+Math.sin(x*.011+y*.028+cloud*4)*2.5;
    const shade=78+cloud*40+trowel+(grain-.5)*16-pore;
    const i=(y*n+x)*4;heights[y*n+x]=noise(x/4,y/4)*.45+grain*.22+cloud*.33;
    color[i]=shade*.93;color[i+1]=shade*.97;color[i+2]=shade;color[i+3]=255;
    const r=Math.round(157+cloud*57+grain*15);rough[i]=rough[i+1]=rough[i+2]=r;rough[i+3]=255;
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const dx=heights[y*n+(x+1)%n]-heights[y*n+(x+n-1)%n];
    const dy=heights[((y+1)%n)*n+x]-heights[((y+n-1)%n)*n+x];
    const i=(y*n+x)*4;normal[i]=128-dx*19;normal[i+1]=128-dy*19;normal[i+2]=255;normal[i+3]=255;
  }
  return {map:texture(color,n,true),roughnessMap:texture(rough,n),normalMap:texture(normal,n)};
}
