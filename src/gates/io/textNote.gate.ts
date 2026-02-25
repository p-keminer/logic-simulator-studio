import { gateRegistry } from '../../core/registry/GateRegistry';
import { TextNoteShape } from '../shapes/TextNoteShape';

gateRegistry.register({
  typeId: 'TEXT_NOTE',
  label: 'Notiz',
  category: 'annotation',
  width: 120, height: 40,
  inputs: [],
  outputs: [],
  evaluate: () => ({}),
  shapeComponent: TextNoteShape,
  description: 'Textnotiz auf dem Canvas (Doppelklick zum Bearbeiten)',
});
