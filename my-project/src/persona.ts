import * as THREE from 'three';

export class PersonaModel {
  public mesh: THREE.Group;
  
  constructor() {
    this.mesh = new THREE.Group();
    this.createPlaceholder();
  }

  private createPlaceholder() {
    // Simple humanoid placeholder
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), bodyMat);
    head.position.y = 1.6;
    head.name = 'head';
    this.mesh.add(head);

    // Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.6, 4, 16), bodyMat);
    torso.position.y = 1.1;
    torso.name = 'torso';
    this.mesh.add(torso);

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.08, 0.5, 4, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.4, 1.2, 0);
    leftArm.rotation.z = Math.PI / 4;
    this.mesh.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.4, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 4;
    this.mesh.add(rightArm);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.1, 0.7, 4, 8);
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.position.set(-0.15, 0.4, 0);
    this.mesh.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.position.set(0.15, 0.4, 0);
    this.mesh.add(rightLeg);
  }

  getRegionPosition(region: string): THREE.Vector3 {
    const part = this.mesh.getObjectByName(region);
    if (part) {
      return part.position.clone();
    }
    return new THREE.Vector3(0, 1.6, 0); // Default to head level
  }
}
