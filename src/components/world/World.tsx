import { BoundaryFence } from './BoundaryFence';
import { DioramaBase } from './DioramaBase';
import { GrassField } from './GrassField';
import { Lighting } from './Lighting';
import { PondField } from './PondField';

/**
 * 3D箱庭ワールド (Diorama World)
 * - 草原エリア: X ∈ [-12, 3], Z ∈ [-10, 10]
 * - 池エリア: X ∈ [5, 12], Z ∈ [-8, 8]
 * - 境界オブジェクト: 木製フェンス・飛び石・小石
 * - ライティング: DirectionalLight(ソフトシャドウ) + AmbientLight + HemisphereLight
 */
export function World() {
  return (
    <group name="diorama-world">
      {/* 照明環境 */}
      <Lighting />

      {/* 台座ベースプレート */}
      <DioramaBase />

      {/* 草原エリア */}
      <GrassField />

      {/* 池エリア */}
      <PondField />

      {/* 境界フェンスと飛び石・小石 */}
      <BoundaryFence />
    </group>
  );
}

export { World as Diorama };
