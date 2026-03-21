export function isBackendBrokerUiEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_BACKEND_BROKER_UI === '1'
  );
}
