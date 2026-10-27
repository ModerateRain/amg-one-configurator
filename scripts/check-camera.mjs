import assert from 'node:assert/strict';
import {cameraPose,aspectFactor,moveToCameraPose} from '../src/camera.ts';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
CameraControls.install({THREE});
// No input element is attached in this Node test; only its rectangle type is needed.
globalThis.DOMRect ??= class DOMRect {
  constructor(x=0,y=0,width=0,height=0){Object.assign(this,{x,y,width,height});}
};
const reference=cameraPose('hero',1.5).position.map((v,i)=>v-[0,.67,0][i]);
const length=v=>Math.hypot(...v);
let checks=0;
for(const aspect of [.45,.83,1.1,1.5,2.1,3])for(const full of [false,true]){
  const {position,target}=cameraPose('hero',aspect,full);
  const direction=position.map((v,i)=>v-target[i]);
  const polar=Math.acos(direction[1]/length(direction))*180/Math.PI;
  assert(polar>65&&polar<85,'Hero camera must remain a low three-quarter angle');
  assert(direction[0]>0&&direction[2]>0);
  direction.forEach((v,i)=>assert(Math.abs(v/length(direction)-reference[i]/length(reference))<1e-9));
  checks++;
}
const before=cameraPose('hero',.83).position.map((v,i)=>v-[0,.67,0][i]);
const after=before.map(v=>v*aspectFactor(2.1)/aspectFactor(.83));
after.forEach((v,i)=>assert(Math.abs(v/length(after)-before[i]/length(before))<1e-9));
console.log(`PASS ${checks} hero/fullscreen camera cases and resize direction preservation.`);

const camera=new THREE.PerspectiveCamera(28,1.5,.05,150);
const controls=new CameraControls(camera);
controls.smoothTime=.45;
let transitions=0;
const views=['hero','front','side','rear','top'];
const startAngles=[-Math.PI+.001,Math.PI-.001,-2.7,-.1,0,.8,2.7];
for(const turns of [-100,-20,-1,0,1,20,100])for(const angle of startAngles)for(const view of views){
  const pose=cameraPose(view,1.5);
  controls.setLookAt(5,2,6,0,.67,0,false);
  controls.azimuthAngle=turns*Math.PI*2+angle;
  controls.update(0);
  const before=controls.getPosition(new THREE.Vector3(),false);
  const initial=controls.azimuthAngle;
  const targetAngle=Math.atan2(pose.position[0],pose.position[2]);
  const expected=Math.atan2(Math.sin(targetAngle-initial),Math.cos(targetAngle-initial));
  moveToCameraPose(controls,pose,true);
  assert(controls.getPosition(new THREE.Vector3(),false).distanceTo(before)<1e-9,'Rebasing must not jump the visible camera');
  let traveled=0,last=controls.azimuthAngle;
  for(let frame=0;frame<360;frame++){
    controls.update(1/60);
    traveled+=Math.abs(controls.azimuthAngle-last);
    last=controls.azimuthAngle;
  }
  assert(traveled<=Math.PI+1e-7,'Preset must never unwind more than half a turn');
  assert(Math.abs(traveled-Math.abs(expected))<1e-5,'Preset must use the shortest angular path');
  assert(controls.getPosition(new THREE.Vector3(),false).distanceTo(new THREE.Vector3(...pose.position))<1e-4);
  assert(controls.getTarget(new THREE.Vector3(),false).distanceTo(new THREE.Vector3(...pose.target))<1e-4);
  transitions++;
}
// Retarget while a previous preset is still moving.
controls.azimuthAngle=40*Math.PI+.7;
for(const view of ['rear','front','side','hero','top','rear']){
  const pose=cameraPose(view,1.5);
  moveToCameraPose(controls,pose,true);
  const start=controls.azimuthAngle;
  for(let frame=0;frame<5;frame++)controls.update(1/60);
  assert(Math.abs(controls.azimuthAngle-start)<Math.PI);
}
// Clicking during a fast drag must discard its remaining angular momentum.
for(const direction of [-1,1]){
  controls.setLookAt(5,2,6,0,.67,0,false);
  controls.update(0);
  controls.rotate(direction*80*Math.PI,0,true);
  for(let frame=0;frame<15;frame++)controls.update(1/60);
  moveToCameraPose(controls,cameraPose('front',1.5),true);
  let traveled=0,last=controls.azimuthAngle;
  for(let frame=0;frame<360;frame++){
    controls.update(1/60);
    traveled+=Math.abs(controls.azimuthAngle-last);
    last=controls.azimuthAngle;
  }
  assert(traveled<=Math.PI+1e-7,'Fast drag inertia must not carry over into a preset');
}
controls.dispose();
console.log(`PASS ${transitions} real CameraControls transitions with -100 to +100 accumulated turns, wrap boundaries, interrupted presets, and fast-drag inertia.`);
