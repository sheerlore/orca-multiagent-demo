import { describe, it, expect, beforeEach } from 'vitest';
import { useCameraStore } from './cameraStore';
import { ISOMETRIC_CONFIG } from '../constants/scene';

describe('cameraStore', () => {
  beforeEach(() => {
    useCameraStore.setState({
      resetTrigger: 0,
      targetFocus: null,
      defaultPosition: ISOMETRIC_CONFIG.DEFAULT_POSITION,
      defaultTarget: ISOMETRIC_CONFIG.DEFAULT_TARGET,
    });
  });

  it('has initial default values', () => {
    const state = useCameraStore.getState();
    expect(state.resetTrigger).toBe(0);
    expect(state.targetFocus).toBeNull();
    expect(state.defaultPosition).toEqual(ISOMETRIC_CONFIG.DEFAULT_POSITION);
    expect(state.defaultTarget).toEqual(ISOMETRIC_CONFIG.DEFAULT_TARGET);
  });

  it('increments resetTrigger and clears targetFocus on resetView()', () => {
    useCameraStore.getState().focusOn([2, 0, 3]);
    expect(useCameraStore.getState().targetFocus).toEqual([2, 0, 3]);

    useCameraStore.getState().resetView();
    expect(useCameraStore.getState().resetTrigger).toBe(1);
    expect(useCameraStore.getState().targetFocus).toBeNull();

    useCameraStore.getState().resetView();
    expect(useCameraStore.getState().resetTrigger).toBe(2);
  });

  it('increments resetTrigger and clears targetFocus on resetCamera()', () => {
    useCameraStore.getState().focusOn([1, 2, 3]);
    expect(useCameraStore.getState().targetFocus).toEqual([1, 2, 3]);

    useCameraStore.getState().resetCamera();
    expect(useCameraStore.getState().resetTrigger).toBe(1);
    expect(useCameraStore.getState().targetFocus).toBeNull();
  });

  it('updates targetFocus on focusOn() and clears it on clearFocus()', () => {
    useCameraStore.getState().focusOn([-4.5, 0.45, 1.2]);
    expect(useCameraStore.getState().targetFocus).toEqual([-4.5, 0.45, 1.2]);

    useCameraStore.getState().clearFocus();
    expect(useCameraStore.getState().targetFocus).toBeNull();
  });
});
