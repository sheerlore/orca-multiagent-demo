import * as THREE from 'three';

/**
 * 低ポリゴンアヒルモデルおよびアクセサリー用の共有ジオメトリ。
 * 全アヒルインスタンスで再利用することで、GPUバッファ確保とドローコール切り替えコストを最小化します。
 */
export const duckGeometries = {
  // まるい胴体
  body: new THREE.SphereGeometry(0.38, 14, 12),
  // 尾羽（小さなお尻のとんがり）
  tail: new THREE.ConeGeometry(0.1, 0.18, 4),
  // 頭部
  head: new THREE.SphereGeometry(0.24, 14, 12),
  // 目（つぶらな黒目）
  eye: new THREE.SphereGeometry(0.035, 8, 8),
  // くちばし
  beak: new THREE.ConeGeometry(0.09, 0.22, 8),
  // 小さな翼
  wing: new THREE.BoxGeometry(0.08, 0.22, 0.32),
  // 水かき足
  foot: new THREE.BoxGeometry(0.14, 0.04, 0.22),

  // ハチマキ（リング、結び目、リボン端）
  headbandRing: new THREE.TorusGeometry(0.25, 0.035, 8, 16),
  headbandKnot: new THREE.SphereGeometry(0.05, 8, 8),
  headbandRibbon: new THREE.BoxGeometry(0.14, 0.04, 0.02),

  // 王冠（ベース円筒、王冠突起）
  crownBase: new THREE.CylinderGeometry(0.16, 0.12, 0.09, 8, 1, false),
  crownPeak: new THREE.ConeGeometry(0.035, 0.07, 4),

  // 浮き輪（ドーナツ本体、白ストライプアクセント）
  floatRing: new THREE.TorusGeometry(0.42, 0.11, 12, 24),
  floatStripe: new THREE.TorusGeometry(0.424, 0.113, 8, 6),

  // キラキラ星（多面体パーティクル）
  sparkleStar: new THREE.OctahedronGeometry(0.06, 0),
};
