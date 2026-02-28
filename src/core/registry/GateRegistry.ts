import type { GateDefinition, GateTypeId } from '../types';

class GateRegistry {
  private readonly registry = new Map<GateTypeId, GateDefinition>();

  register(definition: GateDefinition): void {
    // Allow silent re-registration to support Vite HMR (hot module replacement).
    // In a non-HMR context this would be a bug, but validate() still catches bad definitions.
    this.validate(definition);
    this.registry.set(definition.typeId, definition);
  }

  registerOrReplace(definition: GateDefinition): void {
    this.validate(definition);
    this.registry.set(definition.typeId, definition);
  }

  get(typeId: GateTypeId): GateDefinition {
    const def = this.registry.get(typeId);
    if (!def) throw new Error(`Unknown gate type: "${typeId}"`);
    return def;
  }

  has(typeId: GateTypeId): boolean {
    return this.registry.has(typeId);
  }

  unregister(typeId: GateTypeId): void {
    this.registry.delete(typeId);
  }

  getAll(): GateDefinition[] {
    return Array.from(this.registry.values());
  }

  getByCategory(category: GateDefinition['category']): GateDefinition[] {
    return this.getAll().filter((d) => d.category === category);
  }

  private validate(def: GateDefinition): void {
    if (!def.typeId || !def.label) {
      throw new Error('Gate definition must have typeId and label');
    }
    if (!Array.isArray(def.inputs) || !Array.isArray(def.outputs)) {
      throw new Error(`Gate "${def.typeId}" must define inputs and outputs arrays`);
    }
    if (typeof def.evaluate !== 'function') {
      throw new Error(`Gate "${def.typeId}" must implement evaluate()`);
    }
    if (!def.shapeComponent) {
      throw new Error(`Gate "${def.typeId}" must have a shapeComponent`);
    }
  }
}

export const gateRegistry = new GateRegistry();
