export type DevProviderFaultMode = 'timeout' | 'unavailable';

export interface DevProviderFaultController {
  arm(mode: DevProviderFaultMode): void;
  clear(): void;
  consume(): DevProviderFaultMode | undefined;
  peek(): DevProviderFaultMode | undefined;
}

export class InMemoryDevProviderFaultController
  implements DevProviderFaultController
{
  private nextMode: DevProviderFaultMode | undefined;

  arm(mode: DevProviderFaultMode): void {
    this.nextMode = mode;
  }

  clear(): void {
    this.nextMode = undefined;
  }

  consume(): DevProviderFaultMode | undefined {
    const mode = this.nextMode;
    this.nextMode = undefined;
    return mode;
  }

  peek(): DevProviderFaultMode | undefined {
    return this.nextMode;
  }
}
