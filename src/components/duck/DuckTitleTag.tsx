import { Billboard, Text } from '@react-three/drei';
import { useTaskStore } from '../../store/taskStore';

export interface DuckTitleTagProps {
  title: string;
  isSelected?: boolean;
  position?: [number, number, number];
}

/**
 * アヒルの頭上に表示されるタスクタイトルタグ。
 * DreiのBillboardを使用し、カメラのアングルや回転に関わらず常に正面を向きます。
 * useTaskStoreのsettings.showTitleTagsがfalseの場合は非表示になります。
 */
export function DuckTitleTag({
  title,
  isSelected = false,
  position = [0, 0.95, 0],
}: DuckTitleTagProps) {
  const showTitleTags = useTaskStore((state) => state.settings.showTitleTags);

  if (!showTitleTags) {
    return null;
  }

  const displayTitle = title.length > 12 ? `${title.slice(0, 12)}...` : title;

  return (
    <group data-testid="duck-title-tag">
      <Billboard position={position}>
        <Text
          fontSize={0.22}
          color={isSelected ? '#38bdf8' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#0f172a"
        >
          {displayTitle}
        </Text>
      </Billboard>
    </group>
  );
}
