import { useRef } from 'react';
import type * as THREE from 'three';

export function Lighting() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      {/* 柔らかな環境光 */}
      <ambientLight intensity={0.65} color="#e0f2fe" />

      {/* 半球ライト: 空のスカイブルーと地面のミントグリーン反射 */}
      <hemisphereLight args={['#e0f2fe', '#dcfce7', 0.4]} />

      {/* メイン太陽光: 暖かみのあるパステル調＆ソフトシャドウ */}
      <directionalLight
        ref={dirLightRef}
        position={[16, 24, 16]}
        intensity={1.5}
        color="#fffbeb"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
      />
    </>
  );
}
