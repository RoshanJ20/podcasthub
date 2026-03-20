/**
 * Unit tests for the centralized animation tokens module.
 *
 * Verifies that transition configs and variants are correctly defined,
 * and that getTransition() respects the reducedMotion flag.
 */

import { describe, it, expect } from 'vitest';
import { transitions, variants, getTransition } from '@/lib/animation';

describe('animation tokens', () => {
  describe('transitions', () => {
    it('should export fast transition with duration and ease', () => {
      expect(transitions.fast).toEqual({
        duration: 0.15,
        ease: [0.23, 1, 0.32, 1],
      });
    });

    it('should export tween-based normal transition', () => {
      expect(transitions.normal).toEqual({
        duration: 0.2,
        ease: [0.23, 1, 0.32, 1],
      });
    });

    it('should export tween-based slow transition', () => {
      expect(transitions.slow).toEqual({
        duration: 0.3,
        ease: [0.23, 1, 0.32, 1],
      });
    });

    it('should export tween-based emphasis transition', () => {
      expect(transitions.emphasis).toEqual({
        duration: 0.25,
        ease: [0.77, 0, 0.175, 1],
      });
    });
  });

  describe('variants', () => {
    it('should export fadeUp variant with hidden and visible states', () => {
      expect(variants.fadeUp.hidden).toEqual({ opacity: 0, y: 12 });
      expect(variants.fadeUp.visible).toEqual({ opacity: 1, y: 0 });
    });

    it('should export fadeIn variant', () => {
      expect(variants.fadeIn.hidden).toEqual({ opacity: 0 });
      expect(variants.fadeIn.visible).toEqual({ opacity: 1 });
    });

    it('should export scaleIn variant', () => {
      expect(variants.scaleIn.hidden).toEqual({ opacity: 0, scale: 0.95 });
      expect(variants.scaleIn.visible).toEqual({ opacity: 1, scale: 1 });
    });

    it('should export slideLeft and slideRight variants', () => {
      expect(variants.slideLeft.hidden).toHaveProperty('x', -20);
      expect(variants.slideRight.hidden).toHaveProperty('x', 20);
    });
  });

  describe('getTransition', () => {
    it('should return the named transition config', () => {
      expect(getTransition('fast')).toEqual(transitions.fast);
    });

    it('should return reduced motion config when reduced is true', () => {
      const result = getTransition('slow', true);
      expect(result).toEqual({ duration: 0 });
    });
  });
});
