import * as THREE from 'three';

export type ResponseCategory = 'Positive' | 'Neutral' | 'Negative';

export interface Contribution {
  id: string;
  category: ResponseCategory;
  color: string;
  region: string;
  timestamp: number;
}

export const CATEGORY_COLORS: Record<ResponseCategory, string> = {
  Negative: '#263A72',
  Neutral: '#87CEEB',
  Positive: '#E88AB8',
};

export class PatchGenerator {
  private static patchGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.01);

  static createPatch(category: ResponseCategory): THREE.Mesh {
    const color = CATEGORY_COLORS[category];
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      shininess: 10,
    });
    
    const patch = new THREE.Mesh(this.patchGeometry, material);
    patch.name = `patch-${category}-${Date.now()}`;
    return patch;
  }
}
