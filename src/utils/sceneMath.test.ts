import { describe, it, expect } from 'vitest';
import {
  clamp,
  clampTarget,
  isWithinBounds,
  calculateIsometricPosition,
  getDuckSpawnPosition,
  GRASS_BOUNDS,
  POND_BOUNDS,
  WORLD_BOUNDS,
  PAN_BOUNDS,
  ISOMETRIC_CONFIG,
} from './sceneMath';
import { BOUNDARY_FENCE_X } from '../constants/scene';

describe('sceneMath utils and constants', () => {
  describe('clamp', () => {
    it('clamps values below min to min', () => {
      expect(clamp(-15, -10, 10)).toBe(-10);
    });

    it('clamps values above max to max', () => {
      expect(clamp(25, -10, 10)).toBe(10);
    });

    it('keeps values inside the range unchanged', () => {
      expect(clamp(5, -10, 10)).toBe(5);
    });
  });

  describe('isWithinBounds', () => {
    it('correctly validates if a coordinate is within Grass bounds', () => {
      // Grass bounds: X ∈ [-12, 3], Z ∈ [-10, 10]
      expect(isWithinBounds(-5, 0, GRASS_BOUNDS)).toBe(true);
      expect(isWithinBounds(-12, -10, GRASS_BOUNDS)).toBe(true);
      expect(isWithinBounds(3, 10, GRASS_BOUNDS)).toBe(true);
      expect(isWithinBounds(4, 0, GRASS_BOUNDS)).toBe(false);
      expect(isWithinBounds(-5, 12, GRASS_BOUNDS)).toBe(false);
    });

    it('correctly validates if a coordinate is within Pond bounds', () => {
      // Pond bounds: X ∈ [5, 12], Z ∈ [-8, 8]
      expect(isWithinBounds(8, 0, POND_BOUNDS)).toBe(true);
      expect(isWithinBounds(5, -8, POND_BOUNDS)).toBe(true);
      expect(isWithinBounds(12, 8, POND_BOUNDS)).toBe(true);
      expect(isWithinBounds(4, 0, POND_BOUNDS)).toBe(false);
      expect(isWithinBounds(8, 10, POND_BOUNDS)).toBe(false);
    });

    it('ensures Grass and Pond areas do not overlap and leave space for boundary', () => {
      expect(GRASS_BOUNDS.maxX).toBeLessThan(BOUNDARY_FENCE_X);
      expect(BOUNDARY_FENCE_X).toBeLessThan(POND_BOUNDS.minX);
      expect(GRASS_BOUNDS.minX).toBeGreaterThanOrEqual(WORLD_BOUNDS.minX);
      expect(POND_BOUNDS.maxX).toBeLessThanOrEqual(WORLD_BOUNDS.maxX);
    });
  });

  describe('clampTarget', () => {
    it('clamps out-of-bounds target coordinates within PAN_BOUNDS', () => {
      const outTarget = { x: -25, y: 10, z: 30 };
      const clamped = clampTarget(outTarget, PAN_BOUNDS);

      expect(clamped.x).toBe(PAN_BOUNDS.minX);
      expect(clamped.y).toBe(PAN_BOUNDS.maxY);
      expect(clamped.z).toBe(PAN_BOUNDS.maxZ);
    });

    it('leaves in-bounds target coordinates untouched', () => {
      const inTarget = { x: 2, y: 0.5, z: -3 };
      const clamped = clampTarget(inTarget, PAN_BOUNDS);

      expect(clamped).toEqual(inTarget);
    });
  });

  describe('calculateIsometricPosition', () => {
    it('calculates equal x, y, z position creating isometric 35.264° elevation and 45° azimuth', () => {
      const distance = 30;
      const [x, y, z] = calculateIsometricPosition(distance);

      // In isometric quarter view, x = y = z = distance / √3
      const expected = distance / Math.sqrt(3);
      expect(x).toBeCloseTo(expected, 5);
      expect(y).toBeCloseTo(expected, 5);
      expect(z).toBeCloseTo(expected, 5);

      // Verify elevation angle: arcsin(y / distance) ≈ 35.264°
      const elevationRad = Math.asin(y / distance);
      const elevationDeg = (elevationRad * 180) / Math.PI;
      expect(elevationDeg).toBeCloseTo(ISOMETRIC_CONFIG.ELEVATION_DEG, 3);

      // Verify azimuth angle: arctan2(x, z) = 45°
      const azimuthRad = Math.atan2(x, z);
      const azimuthDeg = (azimuthRad * 180) / Math.PI;
      expect(azimuthDeg).toBeCloseTo(ISOMETRIC_CONFIG.AZIMUTH_DEG, 3);
    });
  });

  describe('getDuckSpawnPosition', () => {
    it('spawns todo and in-progress ducks within the Grass area', () => {
      for (let i = 0; i < 15; i++) {
        const [xTodo, yTodo, zTodo] = getDuckSpawnPosition('todo', i);
        expect(isWithinBounds(xTodo, zTodo, GRASS_BOUNDS)).toBe(true);
        expect(yTodo).toBeGreaterThan(0); // On ground surface

        const [xProg, yProg, zProg] = getDuckSpawnPosition('in-progress', i);
        expect(isWithinBounds(xProg, zProg, GRASS_BOUNDS)).toBe(true);
        expect(yProg).toBeGreaterThan(0);
      }
    });

    it('spawns done ducks within the Pond area', () => {
      for (let i = 0; i < 15; i++) {
        const [x, y, z] = getDuckSpawnPosition('done', i);
        expect(isWithinBounds(x, z, POND_BOUNDS)).toBe(true);
        expect(y).toBeLessThan(0.1); // On water surface
      }
    });
  });

  describe('Isometric Camera Configuration', () => {
    it('restricts azimuth rotation within ±30° of 45°', () => {
      const defaultAzimuth = (ISOMETRIC_CONFIG.AZIMUTH_DEG * Math.PI) / 180;
      const thirtyDeg = (30 * Math.PI) / 180;

      expect(ISOMETRIC_CONFIG.MIN_AZIMUTH).toBeCloseTo(defaultAzimuth - thirtyDeg, 4);
      expect(ISOMETRIC_CONFIG.MAX_AZIMUTH).toBeCloseTo(defaultAzimuth + thirtyDeg, 4);
    });

    it('sets valid zoom distance constraints', () => {
      expect(ISOMETRIC_CONFIG.MIN_DISTANCE).toBeGreaterThan(0);
      expect(ISOMETRIC_CONFIG.MIN_DISTANCE).toBeLessThan(ISOMETRIC_CONFIG.MAX_DISTANCE);
    });
  });
});
