import type { View } from './store';
import type CameraControls from 'camera-controls';

export const HERO_POSITION:[number,number,number]=[5.5,2.05,5.8];
export const CAMERA_OPTIONS={position:HERO_POSITION,fov:28,near:0.05,far:150};
const positions:Record<View,[number,number,number]>={hero:HERO_POSITION,front:[0,1.4,8.2],side:[8.8,1.6,0],rear:[-5.5,2.1,-5.8],top:[0,9,0.01]};
export const aspectFactor=(aspect:number)=>Math.max(1,1.3/Math.max(0.25,aspect));
export function cameraPose(view:View,aspect:number,clean=false){
  const p=positions[view],f=aspectFactor(aspect)*(clean&&view==='hero'?0.92:1);
  return {position:[p[0]*f,0.67+(p[1]-0.67)*f,p[2]*f] as [number,number,number],target:[0,0.67,0] as [number,number,number]};
}

// Rebase the current angle onto the target's nearest turn before interpolating.
// CameraControls accumulates turns during dragging and automatic orbiting.
export function moveToCameraPose(controls:Pick<CameraControls,'azimuthAngle'|'setLookAt'|'update'>,pose:ReturnType<typeof cameraPose>,transition:boolean){
  if(transition){
    const targetAngle=Math.atan2(pose.position[0]-pose.target[0],pose.position[2]-pose.target[2]);
    const delta=controls.azimuthAngle-targetAngle;
    controls.azimuthAngle=targetAngle+Math.atan2(Math.sin(delta),Math.cos(delta));
    // Current and end angles now match. A zero-time update clears drag velocity
    // without moving the camera, before the new preset starts its own transition.
    controls.update(0);
  }
  return controls.setLookAt(...pose.position,...pose.target,transition);
}
